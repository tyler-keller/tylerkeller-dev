from config import LLM_MODEL, gemini
from google.genai import types as genai_types
from google.genai.errors import ServerError
from models import MealMacros
from typing import Optional
import json
import time

_RETRY_DELAYS = [2, 4, 8, 16]  # seconds between attempts; 4 tries total


# DEPRECATED: macro estimation via Gemini has been replaced by FatSecret database lookups
# (see services/fatsecret.py). Kept for reference; remove once callers are fully migrated.
def estimate_macros_from_photo(file_path: str, name: Optional[str] = None) -> dict:
    with open(file_path, "rb") as f:
        image_bytes = f.read()
    ext = file_path.rsplit('.', 1)[-1].lower()
    mime = "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext}"
    name_hint = f"The user identified this as: {name}. " if name else ""
    contents = [
        genai_types.Part.from_bytes(data=image_bytes, mime_type=mime),
        f"{name_hint}Estimate the macros for the food shown.",
    ]
    config = genai_types.GenerateContentConfig(
        system_instruction=(
            "You are a nutrition expert. Analyze the food in the image and estimate its nutritional content. "
            "Provide a short descriptive name for the meal (e.g. 'Chicken and rice bowl', 'Capri Sun juice pouch'). "
            "Estimate calories, protein_g, carbs_g, fat_g, and fiber_g. "
            "Assume a single typical serving unless the image clearly shows multiple portions. "
            "Set confidence (0.0–1.0) based on how clearly the food is identifiable and how well portion size can be estimated. "
            "Include brief notes explaining key assumptions (e.g. 'assumed 200g chicken breast, 1 cup rice'). "
            "Follow the JSON schema exactly."
        ),
        response_mime_type="application/json",
        response_schema=MealMacros,
    )

    last_exc: Exception = RuntimeError("no attempts made")
    for attempt, delay in enumerate([0] + _RETRY_DELAYS):
        if delay:
            time.sleep(delay)
        try:
            resp = gemini.models.generate_content(model=LLM_MODEL, contents=contents, config=config)
            return json.loads(resp.text or "{}")
        except ServerError as e:
            if e.status_code != 503:
                raise
            last_exc = e
            print(f"Gemini 503 on attempt {attempt + 1}, retrying in {_RETRY_DELAYS[attempt] if attempt < len(_RETRY_DELAYS) else 0}s")

    raise last_exc


def identify_food_from_photo(file_path: str, name: Optional[str] = None) -> str:
    """Uses Gemini vision to identify the food name from a photo.

    If a name hint is already provided it is returned directly, skipping the
    Gemini call entirely.
    """
    if name:
        return name

    with open(file_path, "rb") as f:
        image_bytes = f.read()
    ext = file_path.rsplit('.', 1)[-1].lower()
    mime = "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext}"
    contents = [
        genai_types.Part.from_bytes(data=image_bytes, mime_type=mime),
        (
            "What food or meal is shown in this image? "
            "Reply with only a short food name suitable for a nutrition database search "
            "(e.g. 'grilled chicken breast', 'caesar salad', 'banana'). No extra text."
        ),
    ]

    last_exc: Exception = RuntimeError("no attempts made")
    for attempt, delay in enumerate([0] + _RETRY_DELAYS):
        if delay:
            time.sleep(delay)
        try:
            resp = gemini.models.generate_content(model=LLM_MODEL, contents=contents)
            return (resp.text or "").strip()
        except ServerError as e:
            if e.status_code != 503:
                raise
            last_exc = e
            print(f"Gemini 503 on attempt {attempt + 1}, retrying in {_RETRY_DELAYS[attempt] if attempt < len(_RETRY_DELAYS) else 0}s")

    raise last_exc
