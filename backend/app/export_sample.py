"""Rebuild entries of app/sample_ndvi.json from live Sentinel-2 data (needs internet, about 1 minute per region).

    python -m app.export_sample                 all regions
    python -m app.export_sample my-new-region   only the listed region ids (other entries stay)
"""

import json
import sys

from .ndvi import SAMPLE_FILE, live_series
from .regions import REGIONS

if __name__ == "__main__":
    wanted = set(sys.argv[1:])
    unknown = wanted - {r.id for r in REGIONS}
    if unknown:
        sys.exit(f"Unknown region id(s): {', '.join(sorted(unknown))}. Add them to app/regions.py first.")
    out = json.loads(SAMPLE_FILE.read_text()) if SAMPLE_FILE.exists() else {}
    for region in REGIONS:
        if wanted and region.id not in wanted:
            continue
        series = live_series(region)
        out[region.id] = [json.loads(p.model_dump_json()) for p in series.points]
        print(region.id, [p.ndvi for p in series.points])
    SAMPLE_FILE.write_text(json.dumps(out, indent=2) + "\n")
