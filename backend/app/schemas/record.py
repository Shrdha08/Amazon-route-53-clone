from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

RecordType = Literal["A", "AAAA", "CAA", "CNAME", "MX", "NS", "PTR", "SRV", "SOA", "TXT"]
RecordSortBy = Literal["name", "type", "ttl"]


class RecordCreate(BaseModel):
    name: str = Field(default="", max_length=255, description="Relative to the zone; empty means the zone apex")
    type: Literal["A", "AAAA", "CAA", "CNAME", "MX", "NS", "PTR", "SRV", "TXT"]
    ttl: int = 300
    values: list[str] = Field(min_length=1, max_length=100)


class RecordUpdate(BaseModel):
    """Name and type are immutable, as in the Route 53 console."""

    ttl: int
    values: list[str] = Field(min_length=1, max_length=100)


class RecordOut(BaseModel):
    id: int
    zone_id: str
    name: str
    type: RecordType
    ttl: int
    values: list[str]
    routing_policy: str
    created_at: datetime
    updated_at: datetime


class RecordPage(BaseModel):
    items: list[RecordOut]
    total: int
    page: int
    page_size: int


class ImportRequest(BaseModel):
    content: str = Field(min_length=1, max_length=1_000_000, description="BIND zone file text")


class ImportIssue(BaseModel):
    message: str
    line: int | None = None
    name: str | None = None
    type: str | None = None


class ImportResult(BaseModel):
    created: int
    skipped: list[ImportIssue]
    errors: list[ImportIssue]


class BulkDeleteRequest(BaseModel):
    ids: list[int] = Field(min_length=1, max_length=100)


class BulkDeleteFailure(BaseModel):
    id: int
    reason: str


class BulkDeleteResult(BaseModel):
    deleted: list[int]
    failed: list[BulkDeleteFailure]
