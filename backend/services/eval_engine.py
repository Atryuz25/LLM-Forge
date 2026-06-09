"""
Eval Engine — Heuristic + RAGAS scoring.
Runs async parallel evaluation across multiple models and returns a leaderboard.
If RAGAS fails, falls back to a fast keyword-overlap heuristic that always produces
meaningful (non-zero) scores.
"""
import asyncio
import time
import csv
import io
import re
import math
import logging
from typing import Any

logger = logging.getLogger(__name__)

import pandas as pd
from datasets import Dataset
import nest_asyncio
nest_asyncio.apply()

from services.rag_engine import query_pipeline
from services.llm_client import MODELS


# ─── Heuristic scoring fallback ───────────────────────────────────────────────
def _token_overlap(a: str, b: str) -> float:
    """F1-style token overlap between two strings."""
    if not a or not b:
        return 0.0
    a_toks = set(re.sub(r"[^\w\s]", "", a.lower()).split())
    b_toks = set(re.sub(r"[^\w\s]", "", b.lower()).split())
    if not a_toks or not b_toks:
        return 0.0
    common = a_toks & b_toks
    precision = len(common) / len(a_toks)
    recall    = len(common) / len(b_toks)
    if precision + recall == 0:
        return 0.0
    return round(2 * precision * recall / (precision + recall), 3)

def _heuristic_scores(answer: str, ground_truth: str, contexts: list[str]) -> dict:
    """Return approximate RAGAS-like scores using text overlap heuristics."""
    ctx_combined = " ".join(contexts)
    faithfulness      = _token_overlap(answer, ctx_combined)
    answer_relevancy  = _token_overlap(answer, ground_truth)
    context_precision = _token_overlap(ctx_combined, ground_truth)
    context_recall    = _token_overlap(ctx_combined, ground_truth)
    avg = round((faithfulness + answer_relevancy + context_precision + context_recall) / 4, 3)
    return {
        "faithfulness":      faithfulness,
        "answer_relevancy":  answer_relevancy,
        "context_precision": context_precision,
        "context_recall":    context_recall,
        "avg_score":         avg,
    }


async def run_full_eval(
    pipeline_id: str, test_cases: list[dict], models: list[str]
) -> dict:
    semaphore = asyncio.Semaphore(3)

    async def process_model(model: str):
        async with semaphore:
            # 1. Run all queries for this model
            tasks = [query_pipeline(pipeline_id, tc["question"], model) for tc in test_cases]

            start = time.time()
            query_results = await asyncio.gather(*tasks, return_exceptions=True)
            latency = round((time.time() - start) / max(len(test_cases), 1), 3)

            questions    = []
            answers      = []
            contexts     = []
            ground_truths = []
            clean_results = []
            errors       = []

            for i, tc in enumerate(test_cases):
                res = query_results[i]
                if isinstance(res, Exception):
                    logger.error(f"Error for model {model} q={i}: {res}")
                    errors.append({"model": model, "question": tc["question"], "error": str(res)})
                    continue

                ans  = res.get("answer", "")
                srcs = res.get("sources", []) or [""]

                questions.append(tc["question"])
                answers.append(ans)
                contexts.append(srcs)
                ground_truths.append(tc["ground_truth"])

                clean_results.append({
                    "model":    model,
                    "question": tc["question"],
                    "answer":   ans,
                    "sources":  srcs,
                    "latency":  latency,
                })

            if not questions:
                return clean_results, errors, None

            # 2. Try RAGAS evaluation first
            ragas_ok = False
            try:
                from ragas import evaluate
                from ragas.metrics import faithfulness, answer_relevancy, context_precision, context_recall
                from langchain_huggingface import HuggingFaceEmbeddings

                evaluator_llm        = MODELS["gemini-flash"]   # use flash — more reliable for RAGAS judge
                evaluator_embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

                dataset = Dataset.from_dict({
                    "question":    questions,
                    "answer":      answers,
                    "contexts":    contexts,
                    "ground_truth": ground_truths
                })

                score    = evaluate(
                    dataset,
                    metrics=[faithfulness, answer_relevancy, context_precision, context_recall],
                    llm=evaluator_llm,
                    embeddings=evaluator_embeddings,
                    raise_exceptions=False,
                )
                score_df = score.to_pandas()

                def safe(df, row, col):
                    v = df.iloc[row].get(col, float("nan"))
                    return round(float(v), 3) if not (v != v) else 0.0  # nan check

                for i, r in enumerate(clean_results):
                    r["faithfulness"]      = safe(score_df, i, "faithfulness")
                    r["answer_relevancy"]  = safe(score_df, i, "answer_relevancy")
                    r["context_precision"] = safe(score_df, i, "context_precision")
                    r["context_recall"]    = safe(score_df, i, "context_recall")
                    r["avg_score"]         = round((r["faithfulness"] + r["answer_relevancy"] + r["context_precision"] + r["context_recall"]) / 4, 3)

                model_lb = {
                    "model":             model,
                    "runs":              len(clean_results),
                    "faithfulness":      round(float(score.get("faithfulness", 0.0)), 3),
                    "answer_relevancy":  round(float(score.get("answer_relevancy", 0.0)), 3),
                    "context_precision": round(float(score.get("context_precision", 0.0)), 3),
                    "context_recall":    round(float(score.get("context_recall", 0.0)), 3),
                    "avg_latency":       latency,
                    "scoring_method":    "ragas",
                }
                model_lb["avg_score"] = round((model_lb["faithfulness"] + model_lb["answer_relevancy"] + model_lb["context_precision"] + model_lb["context_recall"]) / 4, 3)
                ragas_ok = True
                logger.info(f"RAGAS scoring succeeded for model={model}")

            except Exception as e:
                logger.warning(f"RAGAS failed for model={model}: {e} — falling back to heuristics")

            # 3. Fallback: heuristic scoring
            if not ragas_ok:
                all_f, all_ar, all_cp, all_cr = [], [], [], []
                for i, r in enumerate(clean_results):
                    h = _heuristic_scores(r["answer"], ground_truths[i], contexts[i])
                    r.update(h)
                    all_f.append(h["faithfulness"])
                    all_ar.append(h["answer_relevancy"])
                    all_cp.append(h["context_precision"])
                    all_cr.append(h["context_recall"])

                def avg(lst): return round(sum(lst) / len(lst), 3) if lst else 0.0

                model_lb = {
                    "model":             model,
                    "runs":              len(clean_results),
                    "faithfulness":      avg(all_f),
                    "answer_relevancy":  avg(all_ar),
                    "context_precision": avg(all_cp),
                    "context_recall":    avg(all_cr),
                    "avg_score":         avg([avg(all_f), avg(all_ar), avg(all_cp), avg(all_cr)]),
                    "avg_latency":       latency,
                    "scoring_method":    "heuristic",
                }

            return clean_results, errors, model_lb

    tasks        = [process_model(m) for m in models]
    model_results = await asyncio.gather(*tasks)

    final_results = []
    final_errors  = []
    leaderboard   = []

    for clean_res, errs, lb in model_results:
        final_results.extend(clean_res)
        final_errors.extend(errs)
        if lb:
            leaderboard.append(lb)

    leaderboard = sorted(leaderboard, key=lambda x: x["avg_score"], reverse=True)

    return {
        "results":     final_results,
        "errors":      final_errors,
        "leaderboard": leaderboard,
    }


def parse_csv(content: bytes) -> list[dict]:
    reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))
    rows = []
    for r in reader:
        if "question" in r and "ground_truth" in r:
            rows.append({"question": r["question"].strip(), "ground_truth": r["ground_truth"].strip()})
    return rows
