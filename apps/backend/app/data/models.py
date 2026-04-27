from dataclasses import dataclass
from datetime import date
from enum import Enum, StrEnum, IntEnum
from pydantic import BaseModel, Field


class LicenseStatus(StrEnum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class MineralLicense(BaseModel):
    id: str = Field()
    type: str = Field()
    country: str = Field()
    regions: str = Field()
    status: LicenseStatus = Field()
    applicants: list[str] = Field()
    application_date: date = Field()
    start_date: date = Field()
    end_date: date = Field()