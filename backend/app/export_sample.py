"""Rebuild app/sample_ndvi.json from live Sentinel-2 data.  Run:  python -m app.export_sample"""

import json

from .ndvi import SAMPLE_FILE, live_series
from .regions import REGIONS

if __name__ == "__main__":
    out = {}
    for region in REGIONS:
        series = live_series(region)
        out[region.id] = [json.loads(p.model_dump_json()) for p in series.points]
        print(region.id, [p.ndvi for p in series.points])
    SAMPLE_FILE.write_text(json.dumps(out, indent=2) + "\n")
