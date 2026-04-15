from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from db import init_db
from services.glucose import glucose_sync_loop
from services.fitbit import fitbit_sleep_sync_loop
import auth
import routes.events as events_router
import routes.data as data_router
import asyncio


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    task_glucose = asyncio.create_task(glucose_sync_loop())
    task_fitbit  = asyncio.create_task(fitbit_sleep_sync_loop())
    yield
    task_glucose.cancel()
    task_fitbit.cancel()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://dashboard.tylerkeller.dev",
        "http://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(events_router.router)
app.include_router(data_router.router)
