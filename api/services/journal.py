from config import WHISPER_MODEL, LLM_MODEL, TODOIST_API_KEY, groq_client, gemini
from google.genai import types as genai_types
from models import JournalSummary
from db import update_event_metadata
import requests
import json


def process_evening_routine(row_id: int, file_path: str):
    with open(file_path, "rb") as file:
        transcription = groq_client.audio.transcriptions.create(
            file=(file_path, file.read()),
            model=WHISPER_MODEL,
            temperature=0,
            response_format="json",
            language="en"
        )

    raw_text = transcription.text

    cleanup_resp = gemini.models.generate_content(
        model=LLM_MODEL,
        contents=raw_text,
        config=genai_types.GenerateContentConfig(
            system_instruction=(
                "You are a transcript editor. Clean up a raw speech-to-text transcript of a personal journal entry. "
                "Rules:\n"
                "- Remove filler words and sounds: um, uh, like (used as filler), you know, kind of, sort of, "
                "I mean, basically, literally, honestly, right (used as filler), yeah (mid-sentence filler), "
                "yep yep yep, yeah yeah yeah, and that sort of shit, etc.\n"
                "- Fix grammar, capitalization, and punctuation.\n"
                "- Fix words that were clearly misheard by the speech model — use surrounding context to infer "
                "the correct word (e.g. 'the doist' → 'Todoist', 'grok' → 'Groq', proper nouns, technical terms).\n"
                "- Break run-on sentences into clean sentences.\n"
                "- Preserve the speaker's voice, tone, and all content — do not summarize, cut ideas, or add anything.\n"
                "- Output only the cleaned transcript text, nothing else."
            ),
        ),
    )
    text = cleanup_resp.text or raw_text

    summary_resp = gemini.models.generate_content(
        model=LLM_MODEL,
        contents=text,
        config=genai_types.GenerateContentConfig(
            system_instruction=(
                "You are a transcript summarizer and analyzer. Given the transcript, return the journal summary, tags, extracted tasks, etc. "
                "Rules:"
                "- Summarize the journal entry. "
                "- Extract any relevant tags. Tags should be specific to the things done during that day and the ideas that were espoused. "
                "The goal is for the user to be able to look up any tag and it will match up with at least a few journal entries. "
                "- Extract all tasks that need completion. "
                "- For task due_strings, use any of the following: 'today', 'tomorrow', 'next week', '<weekday>' "
                "(e.g. 'Friday'), '<date>' (e.g. 'April 1st'). If no deadline is implied, use 'today'. "
                "- For task priority, 1 means \"very important / do as soon as possible\" and 4 means \"not that important / do when you have the time to\"."
                "- Rate the speaker's current stress, mood, and perceived energy each on a 1–10 integer scale "
                "based on their phrasing, tone, and any explicit statements (1 = very low/bad, 10 = very high/great). "
                "- If the speaker states a value or task outright, use it directly."
                "- Follow the given JSON schema."
                "- Do not include tasks that were already completed during this entry."
            ),
            response_mime_type="application/json",
            response_schema=JournalSummary,
        ),
    )

    result = json.loads(summary_resp.text or "{}")
    extracted_tasks = result.get("tasks", [])

    tasks_created = False
    if extracted_tasks:
        tasks_created = process_todoist_tasks(extracted_tasks)

    metadata = {
        "transcription":     text,
        "transcription_raw": raw_text,
        "summary":           result.get("summary"),
        "tags":              result.get("tags"),
        "tasks_extracted":   extracted_tasks,
        "all_tasks_created": tasks_created,
        "stress":            result.get("stress"),
        "mood":              result.get("mood"),
        "energy":            result.get("energy"),
    }

    update_event_metadata(row_id, metadata)


def process_todoist_tasks(tasks: list) -> bool:
    if not tasks:
        return False

    headers = {
        "Authorization": f"Bearer {TODOIST_API_KEY}",
        "Content-Type": "application/json"
    }

    all_successful = True

    for task in tasks:
        payload = {
            "content":     task.get("content"),
            "description": task.get("description", ""),
            "priority":    task.get("priority", 1),
            "due_string":  task.get("due_string", "today")
        }

        try:
            response = requests.post(
                "https://api.todoist.com/api/v1/tasks",
                json=payload,
                headers=headers
            )
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            print(f"todoist sync failed for task '{payload['content']}': {e}")
            if response is not None:
                print(f"response body: {response.text}")
            all_successful = False

    return all_successful
