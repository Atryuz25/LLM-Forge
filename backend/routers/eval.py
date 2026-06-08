"""
Eval Router — upload CSV test cases, run against multiple models, get leaderboard.
"""
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Depends
from services.auth import verify_token
from services.eval_engine import run_full_eval, parse_csv
import mlflow

logger = logging.getLogger(__name__)
router = APIRouter()

VALID_MODELS = {"groq-llama", "groq-mixtral", "groq-gemma", "gemini-flash", "gemini-pro"}


@router.post("/run/{pipeline_id}")
async def run_eval(
    pipeline_id: str,
    file: UploadFile = File(...),
    models: str = Query(default="groq-llama,groq-gemma", description="Comma-separated model names"),
    user: dict = Depends(verify_token)
):
    """
    Upload a CSV (columns: question, ground_truth) and evaluate across multiple models.
    Returns per-question results and an aggregated leaderboard.
    Scoring uses fast heuristic proxies for RAGAS metrics (no external LLM calls).
    """
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        test_cases = parse_csv(content)
        if not test_cases:
            raise HTTPException(
                status_code=400,
                detail="No valid rows found. CSV must have 'question' and 'ground_truth' columns."
            )

        model_list = [m.strip() for m in models.split(",") if m.strip() in VALID_MODELS]
        if not model_list:
            raise HTTPException(
                status_code=400,
                detail=f"No valid models specified. Valid options: {list(VALID_MODELS)}"
            )

        results = await run_full_eval(pipeline_id, test_cases, model_list)

        # Log to MLflow (best-effort)
        try:
            with mlflow.start_run(run_name=f"eval_{pipeline_id}"):
                mlflow.log_param("pipeline_id", pipeline_id)
                mlflow.log_param("models",      model_list)
                mlflow.log_param("test_cases",  len(test_cases))
                for entry in results["leaderboard"]:
                    safe_name = entry["model"].replace("-", "_")
                    mlflow.log_metrics({
                        f"{safe_name}_faithfulness": entry["faithfulness"],
                        f"{safe_name}_avg_score":    entry["avg_score"],
                        f"{safe_name}_avg_latency":  entry["avg_latency"],
                    })
        except Exception as mlflow_err:
            logger.warning(f"MLflow logging failed (non-fatal): {mlflow_err}")

        return results

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Eval failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models")
async def list_models(user: dict = Depends(verify_token)):
    """List all available models for evaluation."""
    return {"models": list(VALID_MODELS)}
