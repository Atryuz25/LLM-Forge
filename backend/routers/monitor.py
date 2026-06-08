from fastapi import APIRouter, Depends
from services.auth import verify_token
from services.monitor import get_dashboard, log_query

router = APIRouter()

@router.get("/dashboard/{pipeline_id}")
async def dashboard(pipeline_id: str, user: dict = Depends(verify_token)):
    return await get_dashboard(pipeline_id)

@router.get("/logs/{pipeline_id}")
async def logs(pipeline_id: str, user: dict = Depends(verify_token)):
    from supabase import create_client
    import os
    try:
        supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
        result = supabase.table("query_logs")\
            .select("*")\
            .eq("pipeline_id", pipeline_id)\
            .order("created_at", desc=True)\
            .limit(50)\
            .execute()
        return result.data
    except Exception as e:
        return {"error": str(e)}
