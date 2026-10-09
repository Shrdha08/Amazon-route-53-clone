import json
from typing import Literal

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session as DbSession

from app.core.database import get_db
from app.routers.deps import get_current_user
from app.schemas.hosted_zone import ZoneCreate, ZoneOut, ZonePage, ZoneSortBy, ZoneTypeFilter, ZoneUpdate
from app.services import records as record_service
from app.services import zone_files
from app.services import zones as zone_service

router = APIRouter(prefix="/hosted-zones", tags=["hosted-zones"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=ZonePage)
def list_hosted_zones(
    q: str = "",
    type: ZoneTypeFilter = "all",
    sort_by: ZoneSortBy = "name",
    desc: bool = False,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: DbSession = Depends(get_db),
):
    items, total = zone_service.list_zones(db, q, type, sort_by, desc, page, page_size)
    return ZonePage(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=ZoneOut, status_code=status.HTTP_201_CREATED)
def create_hosted_zone(body: ZoneCreate, db: DbSession = Depends(get_db)):
    return zone_service.create_zone(
        db, body.name, body.comment, body.is_private, body.vpc_region, body.vpc_id,
        [(t.key, t.value) for t in body.tags],
    )


@router.get("/{zone_id}", response_model=ZoneOut)
def get_hosted_zone(zone_id: str, db: DbSession = Depends(get_db)):
    return zone_service.get_zone(db, zone_id)


@router.patch("/{zone_id}", response_model=ZoneOut)
def update_hosted_zone(zone_id: str, body: ZoneUpdate, db: DbSession = Depends(get_db)):
    return zone_service.update_zone(db, zone_id, body.comment)


@router.delete("/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_hosted_zone(zone_id: str, db: DbSession = Depends(get_db)):
    zone_service.delete_zone(db, zone_id)


@router.get("/{zone_id}/export")
def export_hosted_zone(zone_id: str, format: Literal["bind", "json"] = "bind", db: DbSession = Depends(get_db)):
    """Download the zone and all its records as a BIND zone file or a JSON document."""
    zone = zone_service.get_zone(db, zone_id)
    records = record_service.list_all_records(db, zone_id)
    if format == "json":
        body, media_type, ext = json.dumps(zone_files.export_json(zone, records), indent=2) + "\n", "application/json", "json"
    else:
        body, media_type, ext = zone_files.export_bind(zone, records), "text/plain", "zone"
    filename = f"{zone.name.rstrip('.')}.{ext}"
    return Response(body, media_type=media_type, headers={"Content-Disposition": f'attachment; filename="{filename}"'})
