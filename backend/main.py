from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import pipeline, eval, prompt, monitor

app = FastAPI(title="LLMForge API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001"
    ],
    allow_credentials=True,
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
