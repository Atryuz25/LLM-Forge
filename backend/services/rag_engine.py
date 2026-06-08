import os
import time
import logging
import chromadb
from sentence_transformers import SentenceTransformer
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from services.llm_client import call_llm
from services.monitor import log_query

logger = logging.getLogger(__name__)

embedder = SentenceTransformer("all-MiniLM-L6-v2")  # runs on CPU, free
chroma   = chromadb.PersistentClient(path="./chroma_db")
splitter = RecursiveCharacterTextSplitter(chunk_size=512, chunk_overlap=64)


def get_or_create_collection(pipeline_id: str):
    return chroma.get_or_create_collection(name=f"pipeline_{pipeline_id}")


def ingest_file(pipeline_id: str, file_path: str) -> int:
    if file_path.lower().endswith(".pdf"):
        loader = PyPDFLoader(file_path)
    else:
        loader = TextLoader(file_path, encoding="utf-8")
    docs = loader.load()

    chunks = splitter.split_documents(docs)
    if not chunks:
        return 0

    collection = get_or_create_collection(pipeline_id)
    texts      = [c.page_content for c in chunks]
    offset     = collection.count()
    ids        = [f"{pipeline_id}_{offset + i}" for i in range(len(texts))]
    embeddings = embedder.encode(texts).tolist()

    collection.add(documents=texts, embeddings=embeddings, ids=ids)
    return len(chunks)


async def query_pipeline(pipeline_id: str, question: str, model: str = "groq-llama", user_id: str = None) -> dict:
    start = time.time()
    collection = get_or_create_collection(pipeline_id)
    doc_count  = collection.count()

    if doc_count == 0:
        return {
            "answer":  "No documents have been ingested into this pipeline yet. Please upload documents first.",
            "sources": [],
            "model":   model,
        }

    n_results   = min(5, doc_count)
    q_embedding = embedder.encode([question]).tolist()
    results     = collection.query(query_embeddings=q_embedding, n_results=n_results)
    contexts    = results["documents"][0] if results["documents"] else []
    context     = "\n\n".join(contexts)

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
