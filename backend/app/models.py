from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


class Health(BaseModel):
    status: Literal["ok"]
    service: str
    version: str
    timestamp: datetime


class Region(BaseModel):
    id: str
    name: str
    land_cover: str = Field(description="Dominant land cover, e.g. cropland or forest")
    bbox: tuple[float, float, float, float] = Field(description="west, south, east, north (WGS84)")


class NdviPoint(BaseModel):
    date: date
    ndvi: float = Field(ge=-1, le=1, description="Mean NDVI of clear pixels in the region")
    cloud_cover: float = Field(description="Scene cloud cover, percent")


class NdviSummary(BaseModel):
    latest: float
    mean: float
    change: float = Field(description="Latest NDVI minus the first NDVI of the series")
    status: Literal["bare", "stressed", "moderate", "healthy"]


class NdviSeries(BaseModel):
    region: Region
    source: Literal["sample", "live"]
    points: list[NdviPoint]
    summary: NdviSummary
