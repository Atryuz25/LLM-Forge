import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import pipeline, eval, prompt, monitor

app = FastAPI(title="LLMForge API")

origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001"
]

# Allow custom production frontend URL from environment
prod_url = os.getenv("FRONTEND_URL")
if prod_url:
    origins.append(prod_url)

# Fallback: if FRONTEND_URL is set to "*", allow all origins (useful for initial testing)
allow_all = prod_url == "*"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all else origins,
    allow_credentials=not allow_all,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pipeline.router, prefix="/pipeline", tags=["pipeline"])
app.include_router(eval.router,     prefix="/eval",     tags=["eval"])
app.include_router(prompt.router,   prefix="/prompt",   tags=["prompt"])
app.include_router(monitor.router,  prefix="/monitor",  tags=["monitor"])

@app.get("/health")
def health():
    return {"status": "ok"}
