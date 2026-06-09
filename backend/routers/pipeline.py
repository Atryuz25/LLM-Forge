import shutil, os, tempfile
from fastapi import APIRouter, UploadFile, File, Depends
from services.auth import verify_token
from services.rag_engine import ingest_file, query_pipeline

router = APIRouter()

@router.get("/list")
async def list_pipelines(user: dict = Depends(verify_token)):
    from services.rag_engine import supabase
    user_id = user.get("uid") or user.get("user_id") or ""
    try:
        # Fetch only this user's documents
        res = supabase.table("documents").select("pipeline_id, file_name").eq("user_id", user_id).execute()

        # Group by pipeline_id
        pipeline_map: dict = {}
        for r in res.data:
            pid   = r["pipeline_id"]
            fname = r.get("file_name") or "unknown"
            if pid not in pipeline_map:
                pipeline_map[pid] = {"files": set(), "chunks": 0}
            pipeline_map[pid]["files"].add(fname)
            pipeline_map[pid]["chunks"] += 1

        pipelines = []
        for p_id, info in pipeline_map.items():
            pipelines.append({
                "id":      p_id,
                "name":    p_id,
                "status":  "Active",
                "chunks":  info["chunks"],
                "files":   sorted(list(info["files"])),
                "queries": 0,
                "updated": "Recently",
            })

        return {"pipelines": pipelines}
    except Exception as e:
        return {"pipelines": [], "error": str(e)}


@router.delete("/delete/{pipeline_id}")
async def delete_pipeline(pipeline_id: str, user: dict = Depends(verify_token)):
    from services.rag_engine import supabase
    user_id = user.get("uid") or user.get("user_id") or ""
    try:
        # Only delete if the pipeline belongs to this user
        supabase.table("documents").delete().eq("pipeline_id", pipeline_id).eq("user_id", user_id).execute()
        return {"success": True, "pipeline_id": pipeline_id}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.delete("/delete/{pipeline_id}/file")
async def delete_file_from_pipeline(
    pipeline_id: str,
    body: dict,
    user: dict = Depends(verify_token)
):
    from services.rag_engine import supabase
    user_id   = user.get("uid") or user.get("user_id") or ""
    file_name = body.get("file_name")
    if not file_name:
        return {"success": False, "error": "file_name is required"}
    try:
        supabase.table("documents").delete().eq("pipeline_id", pipeline_id).eq("user_id", user_id).eq("file_name", file_name).execute()
        return {"success": True, "pipeline_id": pipeline_id, "file_name": file_name}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/ingest/{pipeline_id}")
async def ingest(
    pipeline_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(verify_token)
):
    user_id  = user.get("uid") or user.get("user_id") or ""
    tmp_dir  = tempfile.gettempdir()
    tmp_path = os.path.join(tmp_dir, file.filename)
    with open(tmp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    count = ingest_file(pipeline_id, tmp_path, file.filename, user_id=user_id)
    os.remove(tmp_path)
    return {"pipeline_id": pipeline_id, "chunks_stored": count, "file_name": file.filename, "user": user.get("email")}


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
