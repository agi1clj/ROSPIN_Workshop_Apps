"""NDVI from Sentinel-2.

NDVI = (NIR - Red) / (NIR + Red). Healthy vegetation reflects a lot of near-infrared light,
so its NDVI is high (> 0.6). Bare soil is near 0.1, water is negative.

Two sources:
  sample  precomputed series in app/sample_ndvi.json (instant, works offline; the default)
  live    reads Sentinel-2 COG files from the public AWS archive (slower, needs internet)
"""

import json
from datetime import date
from functools import lru_cache
from pathlib import Path

import httpx

from .config import get_settings
from .models import NdviPoint, NdviSeries, NdviSummary, Region

SAMPLE_FILE = Path(__file__).with_name("sample_ndvi.json")
# Scene Classification Layer values to ignore: shadow, cloud (medium/high), cirrus, snow.
BAD_SCL = (3, 8, 9, 10, 11)
MAX_SCENES = 6


def classify(ndvi: float) -> str:
    if ndvi < 0.2:
        return "bare"
    if ndvi < 0.4:
        return "stressed"
    if ndvi < 0.6:
        return "moderate"
    return "healthy"


def summarize(points: list[NdviPoint]) -> NdviSummary:
    values = [p.ndvi for p in points]
    latest = values[-1]
    return NdviSummary(
        latest=latest,
        mean=round(sum(values) / len(values), 3),
        change=round(latest - values[0], 3),
        status=classify(latest),  # type: ignore[arg-type]
    )


@lru_cache
def _load_sample() -> dict[str, list[dict]]:
    return json.loads(SAMPLE_FILE.read_text())


def sample_series(region: Region) -> NdviSeries | None:
    raw = _load_sample().get(region.id)
    if not raw:
        return None
    points = [NdviPoint(**item) for item in raw]
    return NdviSeries(region=region, source="sample", points=points, summary=summarize(points))


def _search_scenes(region: Region) -> list[dict]:
    body = {
        "collections": ["sentinel-2-l2a"],
        "bbox": list(region.bbox),
        "limit": 40,
        "query": {"eo:cloud_cover": {"lt": 30}},
        "sortby": [{"field": "properties.datetime", "direction": "desc"}],
    }
    response = httpx.post(f"{get_settings().stac_url}/search", json=body, timeout=30)
    response.raise_for_status()
    features = response.json()["features"]
    # One scene per calendar day, newest first, then spread over time for a readable series.
    by_day: dict[str, dict] = {}
    for feature in features:
        by_day.setdefault(feature["properties"]["datetime"][:10], feature)
    scenes = list(by_day.values())
    return scenes[:: max(1, len(scenes) // MAX_SCENES)][:MAX_SCENES]


def _mean_ndvi(scene: dict, bbox: tuple[float, float, float, float]) -> float | None:
    # Imported here so the API starts (and tests run) even without the raster libraries.
    import numpy as np
    import rasterio
    from rasterio.warp import transform_bounds
    from rasterio.windows import from_bounds

    assets = scene["assets"]

    def read(name: str, resampling) -> "np.ndarray":
        with rasterio.open(assets[name]["href"]) as src:
            left, bottom, right, top = transform_bounds("EPSG:4326", src.crs, *bbox)
            window = from_bounds(left, bottom, right, top, src.transform)
            return src.read(1, window=window, out_shape=(48, 48), resampling=resampling)

    from rasterio.enums import Resampling

    red = read("red", Resampling.average).astype("float32")
    nir = read("nir", Resampling.average).astype("float32")
    scl = read("scl", Resampling.nearest)

    # Reflectance = DN * scale + offset. Earth Search already removed the processing offset
    # from the files when `boa_offset_applied` is true, so only then the offset must be skipped.
    offset_applied = scene["properties"].get("earthsearch:boa_offset_applied", False)

    def reflectance(name: str, dn: "np.ndarray") -> "np.ndarray":
        band = assets[name].get("raster:bands", [{}])[0]
        offset = 0.0 if offset_applied else band.get("offset", 0.0)
        return dn * band.get("scale", 0.0001) + offset

    red_r, nir_r = reflectance("red", red), reflectance("nir", nir)
    clear = ~np.isin(scl, BAD_SCL) & (red > 0) & (nir > 0) & ((nir_r + red_r) > 0)
    if clear.sum() < 20:
        return None
    ndvi = (nir_r[clear] - red_r[clear]) / (nir_r[clear] + red_r[clear])
    return round(float(np.clip(ndvi, -1, 1).mean()), 3)


def live_series(region: Region) -> NdviSeries:
    points: list[NdviPoint] = []
    for scene in reversed(_search_scenes(region)):
        value = _mean_ndvi(scene, region.bbox)
        if value is not None:
            points.append(
                NdviPoint(
                    date=date.fromisoformat(scene["properties"]["datetime"][:10]),
                    ndvi=value,
                    cloud_cover=round(scene["properties"].get("eo:cloud_cover", 0), 1),
                )
            )
    if not points:
        raise RuntimeError("No clear Sentinel-2 scene found for this region")
    return NdviSeries(region=region, source="live", points=points, summary=summarize(points))
