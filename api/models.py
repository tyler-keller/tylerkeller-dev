from pydantic import BaseModel, field_validator
from typing import Optional, Union


class JournalTask(BaseModel):
    content: str
    description: str
    priority: int
    due_string: str


class JournalSummary(BaseModel):
    summary: str
    tags: list[str]
    tasks: list[JournalTask]
    stress: int
    mood: int
    energy: int


class DefaultShortcutPayload(BaseModel):
    type: str


class ActivityPayload(BaseModel):
    source: str
    duration_seconds: int


class AWEventItem(BaseModel):
    timestamp: str
    duration: float
    data: dict


class AWBatchPayload(BaseModel):
    machine: str
    bucket: str
    events: list[AWEventItem]


class ToggleState(BaseModel):
    status: str
    last_change_at: str
    row_id: Optional[int] = None


class MealMacros(BaseModel):
    name: str
    calories: int
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float
    confidence: float
    notes: str


class MealPresetPayload(BaseModel):
    name: str
    calories: Optional[int] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    fiber_g: Optional[float] = None


class MealLogPayload(BaseModel):
    meal_type: Optional[str] = None
    preset_id: Optional[int] = None
    servings: float = 1.0
    name: Optional[str] = None
    calories: Optional[int] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    fiber_g: Optional[float] = None
    notes: Optional[str] = None
    save_as_preset: Union[bool, str] = False

    @field_validator("save_as_preset", mode="before")
    @classmethod
    def coerce_bool(cls, v):
        if isinstance(v, str):
            return v.lower() in ("true", "1", "yes")
        return v
