import os, asyncio
from dotenv import load_dotenv
load_dotenv()

MODELS = None

def get_models():
    global MODELS
    if MODELS is None:
        from langchain_groq import ChatGroq
        from langchain_google_genai import ChatGoogleGenerativeAI
        MODELS = {
            "groq-llama":    ChatGroq(api_key=os.getenv("GROQ_API_KEY"), model="llama-3.3-70b-versatile",  temperature=0, max_retries=1),
            "groq-mixtral":  ChatGroq(api_key=os.getenv("GROQ_API_KEY"), model="mixtral-8x7b-32768",       temperature=0, max_retries=1),
            "groq-gemma":    ChatGroq(api_key=os.getenv("GROQ_API_KEY"), model="llama-3.1-8b-instant",     temperature=0, max_retries=1),
            "gemini-flash":  ChatGoogleGenerativeAI(google_api_key=os.getenv("GEMINI_API_KEY"), model="gemini-2.0-flash",   temperature=0, max_retries=1),
            "gemini-pro":    ChatGoogleGenerativeAI(google_api_key=os.getenv("GEMINI_API_KEY"), model="gemini-2.0-flash-lite", temperature=0, max_retries=6),
        }
    return MODELS

async def call_llm(model_name: str, prompt: str) -> dict:
    import time
    from langchain_core.messages import HumanMessage
    model = get_models().get(model_name)
    if not model:
        raise ValueError(f"Unknown model: {model_name}")
    start = time.time()
    response = await model.ainvoke([HumanMessage(content=prompt)])
    latency = round(time.time() - start, 3)
    return {
        "content": response.content,
        "latency": latency,
        "model": model_name
    }

async def call_all_models(prompt: str) -> list:
    tasks = [call_llm(name, prompt) for name in get_models()]
    return await asyncio.gather(*tasks, return_exceptions=True)
