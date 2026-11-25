import pytest
from fastapi.testclient import TestClient

from app import ndvi
from app.main import app
from app.regions import REGIONS

client = TestClient(app)


def test_health_reports_version() -> None:
    body = client.get("/health").json()
    assert body["status"] == "ok"
    assert body["version"]


def test_regions_listed() -> None:
    assert [r["id"] for r in client.get("/api/regions").json()] == [r.id for r in REGIONS]


@pytest.mark.parametrize("region", REGIONS, ids=lambda r: r.id)
def test_every_region_has_sample_data(region) -> None:
    body = client.get(f"/api/regions/{region.id}/ndvi").json()
    assert body["source"] == "sample"
    assert len(body["points"]) >= 3
    assert all(-1 <= p["ndvi"] <= 1 for p in body["points"])
    assert body["summary"]["status"] in {"bare", "stressed", "moderate", "healthy"}


def test_unknown_region_is_404() -> None:
    assert client.get("/api/regions/nowhere/ndvi").status_code == 404


def test_invalid_region_id_is_422() -> None:
    assert client.get("/api/regions/BAD_ID/ndvi").status_code == 422


@pytest.mark.parametrize(
    ("value", "status"), [(-0.1, "bare"), (0.3, "stressed"), (0.5, "moderate"), (0.8, "healthy")]
)
def test_ndvi_classification(value: float, status: str) -> None:
    assert ndvi.classify(value) == status


def test_live_failure_is_502(monkeypatch: pytest.MonkeyPatch) -> None:
    ndvi._live_cache.clear()

    def boom(_region):
        raise RuntimeError("offline")

    monkeypatch.setattr(ndvi, "live_series", boom)
    assert client.get("/api/regions/cluj-farmland/ndvi?source=live").status_code == 502


def test_live_result_is_cached(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = []
    sample = ndvi.sample_series(REGIONS[0])
    assert sample is not None

    def fake_live(_region):
        calls.append(1)
        return sample

    monkeypatch.setattr(ndvi, "live_series", fake_live)
    ndvi._live_cache.clear()
    assert client.get("/api/regions/cluj-farmland/ndvi?source=live").status_code == 200
    assert client.get("/api/regions/cluj-farmland/ndvi?source=live").status_code == 200
    assert len(calls) == 1
