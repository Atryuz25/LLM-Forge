import os
import asyncio
from dotenv import load_dotenv

# load dotenv before importing rag_engine
load_dotenv("backend/.env")

from services.rag_engine import ingest_file

def test_ingest():
    file_path = "../Atul_Krishnaa_Resume(2026).pdf"
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
    
    print("Testing ingest_file...")
    count = ingest_file("test_resume", file_path)
    print(f"Chunks stored: {count}")

if __name__ == "__main__":
    test_ingest()
