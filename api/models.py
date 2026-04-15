from pydantic import BaseModel
from typing import Optional


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
