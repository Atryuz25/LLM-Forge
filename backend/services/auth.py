import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Header

import os
import json

# Check if FIREBASE_CREDENTIALS is in environment (for deployment), else fallback to local file
firebase_env = os.getenv("FIREBASE_CREDENTIALS")

if firebase_env:
    try:
        cred_dict = json.loads(firebase_env)
        cred = credentials.Certificate(cred_dict)
    except Exception as e:
        print(f"Failed to parse FIREBASE_CREDENTIALS env var: {e}")
        cred = credentials.Certificate("firebase_credentials.json")
else:
    cred = credentials.Certificate("firebase_credentials.json")

firebase_admin.initialize_app(cred)

async def verify_token(authorization: str = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid auth header")
    
    token = authorization.replace("Bearer ", "")
    
    try:
        decoded = auth.verify_id_token(token)
        return {
            "uid":   decoded["uid"],
            "email": decoded.get("email"),
            "name":  decoded.get("name"),
        }
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
