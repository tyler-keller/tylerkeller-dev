from fastapi import APIRouter, HTTPException, Header
from config import SECRET_KEY
import secrets

router = APIRouter()


def verify_key(x_key: str = Header(None)):
    if not x_key or not secrets.compare_digest(x_key, SECRET_KEY):
        raise HTTPException(status_code=401, detail="Invalid key")


@router.get("/version")
def version():
    return {"version": "v1.0.1_database-restructure"}


@router.post("/login")
def login(x_key: str = Header(None)):
    verify_key(x_key)
    return {"status": "ok"}
