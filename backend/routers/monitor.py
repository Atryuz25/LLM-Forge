from fastapi import APIRouter, Depends
from services.auth import verify_token
from services.monitor import get_dashboard, log_query

router = APIRouter()

@router.get("/dashboard/{pipeline_id}")
async def dashboard(pipeline_id: str, user: dict = Depends(verify_token)):
    user_id = user.get("uid") or user.get("user_id") or ""
    return await get_dashboard(pipeline_id, user_id=user_id)

@router.get("/logs/{pipeline_id}")
async def logs(pipeline_id: str, user: dict = Depends(verify_token)):
    from supabase import create_client
    import os
    user_id = user.get("uid") or user.get("user_id") or ""
    try:
        supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
        query = supabase.table("query_logs").select("*").eq("user_id", user_id)
        if pipeline_id != "all":
            query = query.eq("pipeline_id", pipeline_id)
            
        result = query.order("created_at", desc=True).limit(50).execute()
        return result.data
    except Exception as e:
        return {"error": str(e)}
