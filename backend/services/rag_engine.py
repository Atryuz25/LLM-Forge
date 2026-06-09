import os
import time
import logging
import uuid
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables first
load_dotenv()
from sentence_transformers import SentenceTransformer
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from services.llm_client import call_llm
from services.monitor import log_query

logger = logging.getLogger(__name__)

embedder = SentenceTransformer("all-MiniLM-L6-v2")  # runs on CPU, free
splitter = RecursiveCharacterTextSplitter(chunk_size=512, chunk_overlap=64)

# Initialize Supabase Client
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))


def ingest_file(pipeline_id: str, file_path: str, original_filename: str = "unknown", user_id: str = "") -> int:
    """
    Reads a file (PDF or TXT), chunks it, embeds it, and stores in Supabase pgvector.
    Returns the number of chunks stored.
    """
    if file_path.lower().endswith(".pdf"):
        loader = PyPDFLoader(file_path)
    else:
        loader = TextLoader(file_path, encoding="utf-8")
    docs = loader.load()

    chunks = splitter.split_documents(docs)
    if not chunks:
        return 0

    texts      = [c.page_content for c in chunks]
    embeddings = embedder.encode(texts).tolist()

    # Batch insert into Supabase
    rows = []
    for txt, emb in zip(texts, embeddings):
        rows.append({
            "id":          str(uuid.uuid4()),
            "pipeline_id": pipeline_id,
            "file_name":   original_filename,
            "user_id":     user_id,
            "content":     txt,
            "embedding":   emb
        })
    
    # Insert in chunks of 100 to avoid request limits
    for i in range(0, len(rows), 100):
        try:
            supabase.table("documents").insert(rows[i:i+100]).execute()
        except Exception as e:
            logger.error(f"Failed to insert vectors into Supabase: {e}")

    return len(chunks)


async def query_pipeline(pipeline_id: str, question: str, model: str = "groq-llama", user_id: str = None) -> dict:
    start = time.time()
    
    q_embedding = embedder.encode(question).tolist()
    
    try:
        # Call the Supabase RPC function for similarity search
        res = supabase.rpc(
            "match_documents", 
            {
                "query_embedding": q_embedding, 
                "match_pipeline_id": pipeline_id, 
                "match_count": 5
            }
        ).execute()
        
        results = res.data
    except Exception as e:
        logger.error(f"Supabase match_documents RPC failed: {e}")
        results = []

    if not results:
        return {
            "answer":  "No documents have been ingested into this pipeline yet, or search failed. Please upload documents first.",
            "sources": [],
            "model":   model,
        }

    contexts = [r["content"] for r in results]
    context  = "\n\n".join(contexts)

    prompt = f"""Answer the question using ONLY the context below.
If the answer isn't in the context, say "Not found in documents."

Context:
{context}

Question: {question}
Answer:"""

    response = await call_llm(model, prompt)
    answer   = response["content"]
    latency  = round(time.time() - start, 3)

    await log_query(
        pipeline_id=pipeline_id,
        question=question,
        answer=answer,
        model=model,
        latency=latency,
        user_id=user_id
    )

    return {
        "answer":  answer,
        "sources": contexts,
        "model":   model,
    }
