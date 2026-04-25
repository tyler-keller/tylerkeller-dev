from fastapi import APIRouter, Header, UploadFile, File, Form, BackgroundTasks, HTTPException
from typing import Optional
from config import PROGRESS_DIR, JOURNAL_DIR, MEALS_PHOTO_DIR
from auth import verify_key
from db import insert_event, update_event_end_time, insert_meal, insert_meal_preset, get_meal_preset_by_id
from utils import strip_suffix, load_state, save_state, now_utc, align_photo_inplace
from models import DefaultShortcutPayload, ActivityPayload, AWBatchPayload, MealLogPayload, MealFoodLogPayload
from services.journal import process_evening_routine
from services.meal import identify_food_from_photo
from services.fatsecret import search_foods, get_food_macros
import os
import shutil
import uuid
import json

router = APIRouter()


@router.post("/event")
async def handle_event(payload: DefaultShortcutPayload, x_key: str = Header(None)):
    verify_key(x_key)

    event_type = payload.type
    base_event = strip_suffix(event_type)
    now = now_utc()
    is_end = event_type.endswith("_end")

    state = load_state(base_event)

    if is_end or state.status != "stopped" or event_type in ['morning_routine', 'evening_routine', 'insulin']:
        if state.row_id:
            update_event_end_time(state.row_id, now.isoformat())
        state.status = "stopped"
        state.row_id = None
    else:
        row_id = insert_event(base_event, now.isoformat())
        state.status = "running"
        state.row_id = row_id

    state.last_change_at = now.isoformat()
    save_state(base_event, state)

    return {"status": "ok"}


@router.post("/event/morning_routine")
async def handle_morning_routine(
    background_tasks: BackgroundTasks,
    type: str = Form(...),
    photo: UploadFile = File(...),
    weight: Optional[float] = Form(None),
    x_key: str = Header(None)
):
    verify_key(x_key)

    file_extension = photo.filename.split('.')[-1] if '.' in photo.filename else 'jpg'
    unique_filename = f"{now_utc().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.{file_extension}"
    file_path = f"{PROGRESS_DIR}/{unique_filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(photo.file, buffer)

    base_event = strip_suffix(type)
    now = now_utc()

    db_media_path = f"data/media/photos/progress/{unique_filename}"
    metadata = json.dumps({"weight": weight}) if weight is not None else None
    row_id = insert_event(base_event, now.isoformat(), media_path=db_media_path, metadata=metadata)

    background_tasks.add_task(align_photo_inplace, file_path)

    return {"status": "ok", "file_saved": db_media_path, "row_id": row_id}


@router.post("/event/evening_routine")
async def handle_evening_routine(
    background_tasks: BackgroundTasks,
    type: str = Form(...),
    audio: UploadFile = File(...),
    x_key: str = Header(None)
):
    verify_key(x_key)

    file_extension = audio.filename.split('.')[-1]
    unique_filename = f"{now_utc().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.{file_extension}"
    file_path = f"{JOURNAL_DIR}/{unique_filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(audio.file, buffer)

    base_event = strip_suffix(type)
    now = now_utc()
    db_media_path = f"data/media/audio/journal/{unique_filename}"

    row_id = insert_event(base_event, now.isoformat(), media_path=db_media_path)

    background_tasks.add_task(process_evening_routine, row_id, file_path)

    return {"status": "ok", "file_saved": db_media_path, "processing": "background"}


@router.post("/event/meal/photo")
async def handle_meal_photo(
    photo: UploadFile = File(...),
    name: Optional[str] = Form(None),
    meal_type: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    save_as_preset: str = Form("true"),
    x_key: str = Header(None)
):
    verify_key(x_key)

    os.makedirs(MEALS_PHOTO_DIR, exist_ok=True)
    file_extension = photo.filename.split('.')[-1] if '.' in photo.filename else 'jpg'
    unique_filename = f"{now_utc().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.{file_extension}"
    file_path = f"{MEALS_PHOTO_DIR}/{unique_filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(photo.file, buffer)

    try:
        food_name = identify_food_from_photo(file_path, name)
        results = search_foods(food_name, max_results=1)
        if not results:
            raise ValueError(f"No FatSecret results for '{food_name}'")
        macros = get_food_macros(results[0]["food_id"])
        macros["notes"] = f"Serving: {macros.pop('serving_description', '')}. Food identified via photo."
        macros["confidence"] = 1.0
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Macro lookup failed: {e}")

    db_photo_path = f"data/media/photos/meals/{unique_filename}"
    now = now_utc()
    metadata = json.dumps({
        "fatsecret_food_id": macros.get("food_id"),
        "serving_notes": macros.get("notes"),
    })

    meal_id = insert_meal(
        timestamp=now.isoformat(),
        meal_type=meal_type,
        preset_id=None,
        servings=1.0,
        name=macros.get("name") or name,
        calories=macros.get("calories"),
        protein_g=macros.get("protein_g"),
        carbs_g=macros.get("carbs_g"),
        fat_g=macros.get("fat_g"),
        fiber_g=macros.get("fiber_g"),
        photo_path=db_photo_path,
        notes=notes,
        metadata=metadata,
    )

    preset_id = None
    if save_as_preset.lower() in ("true", "1", "yes") and macros.get("name"):
        preset_id = insert_meal_preset(
            name=macros["name"],
            calories=macros.get("calories"),
            protein_g=macros.get("protein_g"),
            carbs_g=macros.get("carbs_g"),
            fat_g=macros.get("fat_g"),
            fiber_g=macros.get("fiber_g"),
            photo_path=db_photo_path,
        )

    return {"status": "ok", "meal_id": meal_id, "preset_id": preset_id, "macros": macros}


@router.post("/event/meal")
async def handle_meal(payload: MealLogPayload, x_key: str = Header(None)):
    verify_key(x_key)

    now = now_utc()

    if payload.preset_id is not None:
        preset = get_meal_preset_by_id(payload.preset_id)
        if not preset:
            raise HTTPException(status_code=404, detail="Preset not found")
        s = payload.servings
        meal_id = insert_meal(
            timestamp=now.isoformat(),
            meal_type=payload.meal_type,
            preset_id=payload.preset_id,
            servings=s,
            name=preset["name"],
            calories=round(preset["calories"] * s) if preset["calories"] is not None else None,
            protein_g=round(preset["protein_g"] * s, 1) if preset["protein_g"] is not None else None,
            carbs_g=round(preset["carbs_g"] * s, 1) if preset["carbs_g"] is not None else None,
            fat_g=round(preset["fat_g"] * s, 1) if preset["fat_g"] is not None else None,
            fiber_g=round(preset["fiber_g"] * s, 1) if preset["fiber_g"] is not None else None,
            notes=payload.notes,
        )
        return {"status": "ok", "meal_id": meal_id, "preset_id": payload.preset_id}

    meal_id = insert_meal(
        timestamp=now.isoformat(),
        meal_type=payload.meal_type,
        preset_id=None,
        servings=payload.servings,
        name=payload.name,
        calories=payload.calories,
        protein_g=payload.protein_g,
        carbs_g=payload.carbs_g,
        fat_g=payload.fat_g,
        fiber_g=payload.fiber_g,
        notes=payload.notes,
    )

    preset_id = None
    if payload.save_as_preset and payload.name:
        preset_id = insert_meal_preset(
            name=payload.name,
            calories=payload.calories,
            protein_g=payload.protein_g,
            carbs_g=payload.carbs_g,
            fat_g=payload.fat_g,
            fiber_g=payload.fiber_g,
        )

    return {"status": "ok", "meal_id": meal_id, "preset_id": preset_id}


@router.post("/event/meal/food")
async def handle_meal_food(payload: MealFoodLogPayload, x_key: str = Header(None)):
    """Log a meal by FatSecret food_id. Macros are fetched from the FatSecret database."""
    verify_key(x_key)

    try:
        base = get_food_macros(payload.food_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"FatSecret lookup failed: {e}")

    s = payload.servings
    now = now_utc()
    serving_desc = base.pop("serving_description", "")
    food_id = base.pop("food_id", payload.food_id)
    metadata = json.dumps({"fatsecret_food_id": food_id, "serving_notes": f"Serving: {serving_desc}"})

    meal_id = insert_meal(
        timestamp=now.isoformat(),
        meal_type=payload.meal_type,
        preset_id=None,
        servings=s,
        name=base["name"],
        calories=round(base["calories"] * s),
        protein_g=round(base["protein_g"] * s, 1),
        carbs_g=round(base["carbs_g"] * s, 1),
        fat_g=round(base["fat_g"] * s, 1),
        fiber_g=round(base["fiber_g"] * s, 1),
        notes=payload.notes,
        metadata=metadata,
    )

    preset_id = None
    if payload.save_as_preset:
        preset_id = insert_meal_preset(
            name=base["name"],
            calories=base["calories"],
            protein_g=base["protein_g"],
            carbs_g=base["carbs_g"],
            fat_g=base["fat_g"],
            fiber_g=base["fiber_g"],
        )

    return {"status": "ok", "meal_id": meal_id, "preset_id": preset_id}


@router.post("/activity")
async def handle_activity(payload: ActivityPayload, x_key: str = Header(None)):
    verify_key(x_key)
    insert_event(f"activity_{payload.source}", now_utc().isoformat())
    return {"status": "ok"}


@router.post("/activity/sync")
async def sync_activity(payload: AWBatchPayload, x_key: str = Header(None)):
    verify_key(x_key)
    from db import get_db_connection
    conn = get_db_connection()
    c = conn.cursor()
    inserted = 0
    for ev in payload.events:
        c.execute(
            "INSERT OR IGNORE INTO aw_events (machine, bucket, timestamp, duration, data) VALUES (?, ?, ?, ?, ?)",
            (payload.machine, payload.bucket, ev.timestamp, ev.duration, json.dumps(ev.data))
        )
        inserted += c.rowcount
    conn.commit()
    conn.close()
    return {"inserted": inserted, "received": len(payload.events)}
