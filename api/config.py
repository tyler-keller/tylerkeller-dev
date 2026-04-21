from dotenv import load_dotenv
from zoneinfo import ZoneInfo
from pydexcom import Dexcom
from groq import Groq
from google import genai
import os

load_dotenv()

IS_DEV = os.environ.get("APP-ENV") == "dev"
SECRET_KEY = os.environ.get("SECRET-KEY")
TODOIST_API_KEY = os.getenv("TODOIST_API_KEY")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
DEXCOM_PASSWORD = os.environ.get("DEXCOM_PASSWORD")
FITBIT_CLIENT_ID = os.environ.get("FITBIT_CLIENT_ID")
FITBIT_CLIENT_SECRET = os.environ.get("FITBIT_CLIENT_SECRET")
FITBIT_REDIRECT_URI = os.environ.get("FITBIT_REDIRECT_URI", "https://api.tylerkeller.dev/fitbit/callback")

DENVER_TZ = ZoneInfo("America/Denver")
UTC_TZ = ZoneInfo("UTC")

BASE_DIR = "/var/www/tylerkeller-dev/api"

DATA_DIR = os.path.join(BASE_DIR, "data")
STATES_DIR = os.path.join(DATA_DIR, "states")
FITBIT_TOKENS_FILE = os.path.join(DATA_DIR, "fitbit_tokens.json")
FITBIT_STATE_FILE = os.path.join(DATA_DIR, "fitbit_state.json")

DEV_DB_FILE = os.path.join(DATA_DIR, "dev.db")
PROD_DB_FILE = os.path.join(DATA_DIR, "prod.db")
DB_FILE = DEV_DB_FILE if IS_DEV else PROD_DB_FILE
STATUS_FILE = os.path.join(DATA_DIR, "status.json")

MEDIA_DIR = os.path.join(DATA_DIR, "media")
PHOTOS_DIR = os.path.join(MEDIA_DIR, "photos")
AUDIO_DIR = os.path.join(MEDIA_DIR, "audio")

LEGACY_DIR = os.path.join(PHOTOS_DIR, "legacy")
PROGRESS_DIR = os.path.join(PHOTOS_DIR, "progress")
MEALS_PHOTO_DIR = os.path.join(PHOTOS_DIR, "meals")
JOURNAL_DIR = os.path.join(AUDIO_DIR, "journal")

ALIGN_SCRIPT = os.path.join(BASE_DIR, "scripts", "align_photos.py")

WHISPER_MODEL = "whisper-large-v3"
LLM_MODEL = "gemini-3-flash-preview"

PRODUCE_APPS = {"Code", "Cursor", "iTerm2", "Xcode", "Godot", "GameMaker", "GameMaker Game"}
BROWSER_APPS = {"Firefox", "Google Chrome", "Safari", "Chrome"}
SYSTEM_NOISE = {
    "loginwindow", "Control Center", "System Settings", "UserNotificationCenter",
    "CoreServicesUIAgent", "Steam Helper", "eaptlstrust", "GlobalProtect",
    "Wireless Diagnostics", "Captive Network Assistant", "Add Printer",
    "Problem Reporter", "AirPlay Screen Mirroring", "Raycast",
}

groq_client = Groq(api_key=GROQ_API_KEY)
gemini = genai.Client(api_key=GOOGLE_API_KEY)

try:
    dexcom = Dexcom(username="Tyckeller", password=DEXCOM_PASSWORD) if DEXCOM_PASSWORD else None
except Exception as e:
    print(f"Dexcom init failed: {e}")
    dexcom = None
