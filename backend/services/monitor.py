import os
from supabase import create_client
from datetime import datetime, timedelta

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

# Cost per 1k tokens (approximate free tier estimates)
COST_MAP = {
    "groq-llama":   0.0,
    "groq-mixtral": 0.0,
    "groq-gemma":   0.0,
    "gemini-flash": 0.0,
    "gemini-pro":   0.0,
}

def estimate_cost(model: str, answer: str) -> float:
    tokens = len(answer.split()) * 1.3
    return round((tokens / 1000) * COST_MAP.get(model, 0.0), 6)

async def log_query(
    pipeline_id: str,
    question:    str,
    answer:      str,
    model:       str,
    latency:     float,
    user_id:     str = None,
) -> str:
    cost = estimate_cost(model, answer)
    row  = {
        "pipeline_id": pipeline_id,
        "user_id":     user_id,
        "question":    question,
        "answer":      answer,
        "model":       model,
        "latency":     latency,
        "cost_usd":    cost,
    }
    try:
        result = supabase.table("query_logs").insert(row).execute()
        if result.data:
            return result.data[0]["id"]
    except Exception as e:
        print(f"Failed to log query to Supabase: {e}")
    return ""

async def log_quality(log_id: str, faithfulness: float, relevancy: float):
    if not log_id:
        return
    avg = round((faithfulness + relevancy) / 2, 3)
    try:
        supabase.table("quality_scores").insert({
            "log_id":       log_id,
            "faithfulness": faithfulness,
            "relevancy":    relevancy,
            "avg_score":    avg,
        }).execute()
    except Exception as e:
        print(f"Failed to log quality to Supabase: {e}")

async def get_dashboard(pipeline_id: str) -> dict:
    # Last 7 days of logs
    since = (datetime.utcnow() - timedelta(days=7)).isoformat()

    try:
        query = supabase.table("query_logs").select("*").gte("created_at", since).order("created_at", desc=True)
        if pipeline_id != "all":
            query = query.eq("pipeline_id", pipeline_id)
        
        logs = query.execute().data
    except Exception as e:
        print(f"Failed to fetch dashboard from Supabase: {e}")
        return {"total_queries": 0, "pipeline_id": pipeline_id, "error": str(e)}

    if not logs:
        return {"total_queries": 0, "pipeline_id": pipeline_id}

    total     = len(logs)
    avg_lat   = round(sum(l["latency"] or 0 for l in logs) / total, 3)
    total_cost = round(sum(l["cost_usd"] or 0 for l in logs), 6)

    # Model breakdown
    model_counts = {}
    for l in logs:
        m = l["model"]
        model_counts[m] = model_counts.get(m, 0) + 1

    # Daily query count for trend chart
    daily = {}
    # Also track daily latency
    daily_latencies = {}
    for l in logs:
        day = l["created_at"][:10]
        daily[day] = daily.get(day, 0) + 1
        daily_latencies[day] = daily_latencies.get(day, []) + [l["latency"] or 0]

    daily_trend = {}
    for day, count in daily.items():
        daily_trend[day] = {
            "queries": count,
            "avg_latency": round(sum(daily_latencies[day]) / count, 3)
        }

    # Fetch quality scores
    avg_score = 0.0
    try:
        log_ids = [l["id"] for l in logs]
        if log_ids:
            scores = supabase.table("quality_scores").select("avg_score, log_id").in_("log_id", log_ids).execute().data
            if scores:
                avg_score = round(sum(s["avg_score"] for s in scores) / len(scores), 3)
                score_map = {s["log_id"]: s["avg_score"] for s in scores}
                for l in logs:
                    l["score"] = score_map.get(l["id"], None)
            else:
                for l in logs:
                    l["score"] = None
        else:
            for l in logs:
                l["score"] = None
    except Exception as e:
        print(f"Failed to fetch quality scores: {e}")
        for l in logs:
            l["score"] = None

    return {
        "pipeline_id":    pipeline_id,
        "total_queries":  total,
        "avg_latency":    avg_lat,
        "avg_score":      avg_score,
        "total_cost_usd": total_cost,
        "model_breakdown": model_counts,
        "daily_trend":    daily_trend,
        "recent_logs":    logs[:10],
    }
