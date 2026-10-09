from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401  (register tables)
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.routers import auth, hosted_zones, records
from app.seed import seed
from app.services.errors import ServiceError


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)
    yield


app = FastAPI(title="Route 53 Clone API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(ServiceError)
def service_error_handler(_req: Request, err: ServiceError):
    return JSONResponse(status_code=err.status_code, content={"detail": err.message})


app.include_router(auth.router, prefix="/api")
app.include_router(hosted_zones.router, prefix="/api")
app.include_router(records.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
