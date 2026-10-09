import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.services.zones import normalize_name

_LABEL = re.compile(r"^(?!-)[a-z0-9-]{1,63}(?<!-)$")


class TagIn(BaseModel):
    key: str = Field(min_length=1, max_length=128)
    value: str = Field(default="", max_length=256)


class TagOut(TagIn):
    model_config = ConfigDict(from_attributes=True)


class ZoneCreate(BaseModel):
    name: str
    comment: str = Field(default="", max_length=256)
    is_private: bool = False
    vpc_region: str | None = None
    vpc_id: str | None = None
    tags: list[TagIn] = Field(default_factory=list, max_length=50)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        name = normalize_name(v)
        bare = name.rstrip(".")
        labels = bare.split(".")
        if len(bare) > 253 or len(labels) < 2 or not all(_LABEL.match(label) for label in labels):
            raise ValueError("Domain name is not valid. Use letters, numbers and hyphens, e.g. example.com")
        return name

    @model_validator(mode="after")
    def private_requires_vpc(self):
        if self.is_private and not (self.vpc_region and self.vpc_id):
            raise ValueError("A private hosted zone requires a VPC region and VPC ID")
        if not self.is_private:
            self.vpc_region = self.vpc_id = None
        return self


class ZoneUpdate(BaseModel):
    comment: str = Field(max_length=256)


class ZoneOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    comment: str
    is_private: bool
    vpc_region: str | None
    vpc_id: str | None
    record_count: int = 0
    tags: list[TagOut] = []
    created_at: datetime


class ZonePage(BaseModel):
    items: list[ZoneOut]
    total: int
    page: int
    page_size: int


ZoneTypeFilter = Literal["all", "public", "private"]
ZoneSortBy = Literal["name", "type", "records", "created"]
