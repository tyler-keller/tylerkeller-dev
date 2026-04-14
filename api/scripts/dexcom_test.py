from pydexcom import Dexcom
from dotenv import load_dotenv
import os

load_dotenv()

DEXCOM_PASSWORD = os.environ.get("DEXCOM_PASSWORD")

dexcom = Dexcom(username="Tyckeller", password=DEXCOM_PASSWORD)

readings = dexcom.get_glucose_readings(minutes=1440, max_count=288)

print(readings)

reading = dexcom.get_latest_glucose_reading() 

print(reading)

# reading = get_current_glucose_reading()

# print(reading)