import base64
import time
import requests
from config import FATSECRET_CLIENT_ID, FATSECRET_CLIENT_SECRET

_TOKEN_URL = "https://oauth.fatsecret.com/connect/token"
_API_URL = "https://platform.fatsecret.com/rest/server.api"

_token_cache: dict = {"access_token": None, "expires_at": 0.0}


def _get_access_token() -> str:
    now = time.time()
    if _token_cache["access_token"] and now < _token_cache["expires_at"] - 60:
        return _token_cache["access_token"]

    creds = base64.b64encode(f"{FATSECRET_CLIENT_ID}:{FATSECRET_CLIENT_SECRET}".encode()).decode()
    resp = requests.post(
        _TOKEN_URL,
        headers={
            "Authorization": f"Basic {creds}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data={"grant_type": "client_credentials", "scope": "basic"},
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()
    _token_cache["access_token"] = data["access_token"]
    _token_cache["expires_at"] = now + data.get("expires_in", 3600)
    return _token_cache["access_token"]


def search_foods(query: str, max_results: int = 10) -> list[dict]:
    """Search FatSecret for foods matching query. Returns list of candidates."""
    token = _get_access_token()
    resp = requests.get(
        _API_URL,
        headers={"Authorization": f"Bearer {token}"},
        params={
            "method": "foods.search",
            "search_expression": query,
            "format": "json",
            "max_results": max_results,
        },
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()
    foods = data.get("foods", {}).get("food", [])
    if isinstance(foods, dict):
        foods = [foods]
    return [
        {
            "food_id": f["food_id"],
            "name": f["food_name"],
            "brand": f.get("brand_name"),
            "description": f.get("food_description", ""),
        }
        for f in foods
    ]


def get_food_macros(food_id: str) -> dict:
    """Return macros for a FatSecret food_id using its first/primary serving."""
    token = _get_access_token()
    resp = requests.get(
        _API_URL,
        headers={"Authorization": f"Bearer {token}"},
        params={"method": "food.get.v4", "food_id": food_id, "format": "json"},
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()
    food = data.get("food", {})

    servings = food.get("servings", {}).get("serving", [])
    if isinstance(servings, dict):
        servings = [servings]
    if not servings:
        raise ValueError(f"No serving data for food_id={food_id}")

    # Prefer a 100g metric serving for consistency; fall back to first serving
    serving = next(
        (
            s for s in servings
            if s.get("metric_serving_unit") == "g"
            and float(s.get("metric_serving_amount", 0)) == 100
        ),
        servings[0],
    )

    return {
        "name": food.get("food_name", ""),
        "food_id": food_id,
        "calories": int(float(serving.get("calories", 0))),
        "protein_g": float(serving.get("protein", 0) or 0),
        "carbs_g": float(serving.get("carbohydrate", 0) or 0),
        "fat_g": float(serving.get("fat", 0) or 0),
        "fiber_g": float(serving.get("fiber", 0) or 0),
        "serving_description": serving.get("serving_description", ""),
    }
