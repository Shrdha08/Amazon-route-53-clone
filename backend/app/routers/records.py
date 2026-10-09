from typing import Literal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session as DbSession

from app.core.database import get_db
from app.routers.deps import get_current_user
from app.schemas.record import (
    BulkDeleteRequest,
    BulkDeleteResult,
    ImportRequest,
    ImportResult,
    RecordCreate,
    RecordOut,
    RecordPage,
    RecordSortBy,
    RecordType,
    RecordUpdate,
)
from app.services import records as record_service

router = APIRouter(
    prefix="/hosted-zones/{zone_id}/records", tags=["records"], dependencies=[Depends(get_current_user)]
)


@router.get("", response_model=RecordPage)
def list_records(
    zone_id: str,
    q: str = "",
    type: RecordType | None = None,
    sort_by: RecordSortBy = "name",
    desc: bool = False,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    routing_policy: str = "",
    alias: Literal["yes", "no", ""] = "",
    db: DbSession = Depends(get_db),
):
    items, total = record_service.list_records(
        db, zone_id, q, type or "", sort_by, desc, page, page_size, routing_policy, alias
    )
    return RecordPage(items=[record_service.to_out(r) for r in items], total=total, page=page, page_size=page_size)


@router.post("", response_model=RecordOut, status_code=status.HTTP_201_CREATED)
def create_record(zone_id: str, body: RecordCreate, db: DbSession = Depends(get_db)):
    rec = record_service.create_record(db, zone_id, body.name, body.type, body.ttl, body.values)
    return record_service.to_out(rec)


@router.post("/import", response_model=ImportResult)
def import_records(zone_id: str, body: ImportRequest, db: DbSession = Depends(get_db)):
    return record_service.import_zone_file(db, zone_id, body.content)


@router.post("/bulk-delete", response_model=BulkDeleteResult)
def bulk_delete_records(zone_id: str, body: BulkDeleteRequest, db: DbSession = Depends(get_db)):
    return record_service.bulk_delete_records(db, zone_id, body.ids)


@router.get("/{record_id}", response_model=RecordOut)
def get_record(zone_id: str, record_id: int, db: DbSession = Depends(get_db)):
    return record_service.to_out(record_service.get_record(db, zone_id, record_id))


@router.put("/{record_id}", response_model=RecordOut)
def update_record(zone_id: str, record_id: int, body: RecordUpdate, db: DbSession = Depends(get_db)):
    rec = record_service.update_record(db, zone_id, record_id, body.ttl, body.values)
    return record_service.to_out(rec)


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_record(zone_id: str, record_id: int, db: DbSession = Depends(get_db)):
    record_service.delete_record(db, zone_id, record_id)
