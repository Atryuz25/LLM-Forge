"""
Eval Engine — Fast heuristic scoring (no external LLM calls needed for scoring).
Runs async parallel evaluation across multiple models and returns a leaderboard.
"""
import asyncio
import time
import csv
import io
import math
import re
import logging
from typing import Any

logger = logging.getLogger(__name__)

import pandas as pd
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_precision, context_recall
import nest_asyncio
nest_asyncio.apply()

from services.rag_engine import query_pipeline
from services.llm_client import MODELS

async def run_full_eval(
    pipeline_id: str, test_cases: list[dict], models: list[str]
) -> dict:
    semaphore = asyncio.Semaphore(3)

    async def process_model(model: str):
        async with semaphore:
            # 1. Run all queries for this model
            tasks = []
            for tc in test_cases:
                tasks.append(query_pipeline(pipeline_id, tc["question"], model))
            
            start = time.time()
            query_results = await asyncio.gather(*tasks, return_exceptions=True)
            latency = round((time.time() - start) / len(test_cases), 3) if test_cases else 0

            questions = []
            answers = []
            contexts = []
            ground_truths = []
            clean_results = []
            errors = []

            for i, tc in enumerate(test_cases):
                res = query_results[i]
                if isinstance(res, Exception):
                    logger.error(f"Error for model {model}: {res}")
                    errors.append({"model": model, "question": tc["question"], "error": str(res)})
                    continue
                
                ans = res.get("answer", "")
                srcs = res.get("sources", [])
                if not srcs:
                    srcs = [""]
                
                questions.append(tc["question"])
                answers.append(ans)
                contexts.append(srcs)
                ground_truths.append(tc["ground_truth"])
                
                clean_results.append({
                    "model": model,
                    "question": tc["question"],
                    "answer": ans,
                    "sources": srcs,
                    "latency": latency
                })

            if not questions:
                return clean_results, errors, None

            dataset = Dataset.from_dict({
                "question": questions,
                "answer": answers,
                "contexts": contexts,
                "ground_truth": ground_truths
            })

            # Run Ragas evaluation
            from langchain_huggingface import HuggingFaceEmbeddings
            evaluator_llm = MODELS["gemini-pro"]
            evaluator_embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

            try:
                score = evaluate(
                    dataset,
                    metrics=[faithfulness, answer_relevancy, context_precision, context_recall],
                    llm=evaluator_llm,
                    embeddings=evaluator_embeddings,
                    raise_exceptions=False
                )
                
                score_df = score.to_pandas()
                for i, r in enumerate(clean_results):
                    r["faithfulness"] = round(score_df.iloc[i]["faithfulness"], 3) if not pd.isna(score_df.iloc[i].get("faithfulness", float('nan'))) else 0.0
                    r["answer_relevancy"] = round(score_df.iloc[i]["answer_relevancy"], 3) if not pd.isna(score_df.iloc[i].get("answer_relevancy", float('nan'))) else 0.0
                    r["context_precision"] = round(score_df.iloc[i]["context_precision"], 3) if not pd.isna(score_df.iloc[i].get("context_precision", float('nan'))) else 0.0
                    r["context_recall"] = round(score_df.iloc[i]["context_recall"], 3) if not pd.isna(score_df.iloc[i].get("context_recall", float('nan'))) else 0.0
                    r["avg_score"] = round((r["faithfulness"] + r["answer_relevancy"] + r["context_precision"] + r["context_recall"]) / 4, 3)

                model_lb = {
                    "model": model,
                    "runs": len(clean_results),
                    "faithfulness": round(score.get("faithfulness", 0.0), 3),
                    "answer_relevancy": round(score.get("answer_relevancy", 0.0), 3),
                    "context_precision": round(score.get("context_precision", 0.0), 3),
                    "context_recall": round(score.get("context_recall", 0.0), 3),
                    "avg_score": 0.0,
                    "avg_latency": latency
                }
                model_lb["avg_score"] = round((model_lb["faithfulness"] + model_lb["answer_relevancy"] + model_lb["context_precision"] + model_lb["context_recall"]) / 4, 3)
            except Exception as e:
                logger.error(f"RAGAS evaluation failed for {model}: {e}")
                # Fallback to zero if evaluation crashes completely
                for r in clean_results:
                    r["faithfulness"] = 0.0
                    r["answer_relevancy"] = 0.0
                    r["context_precision"] = 0.0
                    r["context_recall"] = 0.0
                    r["avg_score"] = 0.0
                model_lb = {
                    "model": model, "runs": len(clean_results),
                    "faithfulness": 0.0, "answer_relevancy": 0.0,
                    "context_precision": 0.0, "context_recall": 0.0,
                    "avg_score": 0.0, "avg_latency": latency
                }

            return clean_results, errors, model_lb

    tasks = [process_model(m) for m in models]
    model_results = await asyncio.gather(*tasks)

    final_results = []
    final_errors = []
    leaderboard = []

    for clean_res, errs, lb in model_results:
        final_results.extend(clean_res)
        final_errors.extend(errs)
        if lb:
            leaderboard.append(lb)

    leaderboard = sorted(leaderboard, key=lambda x: x["avg_score"], reverse=True)

    return {
        "results": final_results,
        "errors": final_errors,
        "leaderboard": leaderboard
    }


def parse_csv(content: bytes) -> list[dict]:
    reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))
    rows = []
    for r in reader:
        if "question" in r and "ground_truth" in r:
            rows.append({"question": r["question"].strip(), "ground_truth": r["ground_truth"].strip()})
    return rows
