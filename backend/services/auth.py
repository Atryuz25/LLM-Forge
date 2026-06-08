import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Header

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
