from fastapi import APIRouter, Depends
from pydantic import BaseModel
from services.auth import verify_token
from services.prompt_service import ab_test, get_ab_test_history

router = APIRouter()

class ABTestRequest(BaseModel):
    prompt_a:   str
    prompt_b:   str
    test_cases: list[dict]  # [{"question": "..."}]
    model:      str = "groq-llama"

@router.post("/ab-test")
async def run_ab_test(body: ABTestRequest, user: dict = Depends(verify_token)):
    user_id = user.get("uid") or user.get("user_id") or ""
    result = await ab_test(
        body.prompt_a,
        body.prompt_b,
        body.test_cases,
        body.model,
        user_id
    )
    return result

@router.get("/history")
async def get_history(user: dict = Depends(verify_token)):
    user_id = user.get("uid") or user.get("user_id") or ""
    history = await get_ab_test_history(user_id)
    return {"history": history}
