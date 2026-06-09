import os
import uuid
from supabase import create_client
from dotenv import load_dotenv

load_dotenv("backend/.env")
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

try:
    # Try inserting a dummy document
    res = supabase.table("documents").insert({
        "id": str(uuid.uuid4()),
        "pipeline_id": "test_pipeline",
        "content": "test content",
        "embedding": [0.1] * 384
    }).execute()
    print("Success:", res)
except Exception as e:
    print("Error inserting into Supabase:")
    print(e)
