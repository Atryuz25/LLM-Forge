import shutil, os, tempfile
from fastapi import APIRouter, UploadFile, File, Depends
from services.auth import verify_token
from services.rag_engine import ingest_file, query_pipeline

router = APIRouter()

@router.get("/list")
async def list_pipelines(user: dict = Depends(verify_token)):
    from services.rag_engine import chroma
    cols = chroma.list_collections()
    pipelines = []
    for c in cols:
        if c.name.startswith("pipeline_"):
            p_id = c.name.replace("pipeline_", "")
            pipelines.append({
                "id": p_id,
                "name": p_id,
                "status": "Active",
                "icon": "account_tree",
                "colorClass": "text-secondary",
                "bgClass": "bg-secondary/10",
                "borderClass": "border-secondary/30",
                "updated": "Recently",
                "chunks": c.count(), # type: ignore
                "queries": 0
            })
    return {"pipelines": pipelines}

@router.post("/ingest/{pipeline_id}")
async def ingest(
    pipeline_id: str, 
    file: UploadFile = File(...),
    user: dict = Depends(verify_token)
):
    tmp_dir  = tempfile.gettempdir()
    tmp_path = os.path.join(tmp_dir, file.filename)
    with open(tmp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    count = ingest_file(pipeline_id, tmp_path)
    os.remove(tmp_path)
    return {"pipeline_id": pipeline_id, "chunks_stored": count, "user": user.get("email")}

@router.post("/query/{pipeline_id}")
async def query(
    pipeline_id: str, 
    body: dict,
    user: dict = Depends(verify_token)
):
    result = await query_pipeline(
        pipeline_id,
        body["question"],
        body.get("model", "groq-llama"),
        user_id=user.get("uid")
    )
    return result
