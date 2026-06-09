import asyncio
import time
from services.llm_client import call_llm

async def run_prompt_version(
    version_name: str,
    prompt_template: str,
    test_cases: list[dict],
    model: str
) -> dict:
    results = []

    run_cases = test_cases if test_cases else [{"question": ""}]

    for tc in run_cases:
        if tc["question"]:
            filled_prompt = prompt_template.replace("{question}", tc["question"])
        else:
            filled_prompt = prompt_template
            
        start = time.time()
        response = await call_llm(model, filled_prompt)
        latency = round(time.time() - start, 3)

        # Simple scoring — response length + latency
        # (full RAGAS scoring optional here, keep it fast)
        results.append({
            "question": tc["question"],
            "answer":   response["content"],
            "latency":  latency,
        })

    if not results:
        return {
            "version":     version_name,
            "model":       model,
            "avg_latency": 0.0,
            "avg_length":  0,
            "results":     [],
        }

    avg_latency  = round(sum(r["latency"] for r in results) / len(results), 3)
    avg_length   = round(sum(len(r["answer"]) for r in results) / len(results))

    return {
        "version":     version_name,
        "model":       model,
        "avg_latency": avg_latency,
        "avg_length":  avg_length,
        "results":     results,
    }

async def ab_test(
    prompt_a: str,
    prompt_b: str,
    test_cases: list[dict],
    model: str = "groq-llama",
    user_id: str = ""
) -> dict:

    # Run both versions in parallel
    version_a, version_b = await asyncio.gather(
        run_prompt_version("Version A", prompt_a, test_cases, model),
        run_prompt_version("Version B", prompt_b, test_cases, model),
    )

    # Decide winner — lower latency + concise answers wins
    score_a = (1 / version_a["avg_latency"]) * 0.6 + (1 / max(version_a["avg_length"], 1)) * 0.4
    score_b = (1 / version_b["avg_latency"]) * 0.6 + (1 / max(version_b["avg_length"], 1)) * 0.4
    winner  = "Version A" if score_a > score_b else "Version B"

    # Track in MLflow
    try:
        import mlflow
        with mlflow.start_run(run_name="prompt_ab_test"):
            mlflow.log_param("model", model)
            mlflow.log_param("test_cases", len(test_cases))
            mlflow.log_metrics({
                "version_a_avg_latency": version_a["avg_latency"],
                "version_b_avg_latency": version_b["avg_latency"],
                "version_a_avg_length":  version_a["avg_length"],
                "version_b_avg_length":  version_b["avg_length"],
            })
            mlflow.log_param("winner", winner)
            if user_id:
                mlflow.set_tag("user_id", user_id)
    except Exception as e:
        print(f"MLFlow logging failed: {e}")

    return {
        "winner":    winner,
        "version_a": version_a,
        "version_b": version_b,
    }

async def get_ab_test_history(user_id: str = "") -> list:
    try:
        from mlflow.tracking import MlflowClient
        client = MlflowClient()
        runs = client.search_runs(experiment_ids=["0"], max_results=50, order_by=["start_time DESC"])
        history = []
        for r in runs:
            # Check if this run is an ab_test
            if r.data.tags.get("mlflow.runName") == "prompt_ab_test":
                if user_id and r.data.tags.get("user_id") != user_id:
                    continue
                history.append({
                    "run_id": r.info.run_id,
                    "start_time": r.info.start_time,
                    "model": r.data.params.get("model", ""),
                    "test_cases": r.data.params.get("test_cases", "0"),
                    "winner": r.data.params.get("winner", ""),
                    "metrics": r.data.metrics
                })
        return history
    except Exception as e:
        print(f"Failed to fetch MLflow history: {e}")
        return []
