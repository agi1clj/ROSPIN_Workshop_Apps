"""Study regions. To add one, append a Region here, then run `python -m app.export_sample`."""

from .models import Region

REGIONS: list[Region] = [
    Region(id="cluj-farmland", name="Transylvanian Plain (farmland)", land_cover="cropland",
           bbox=(23.95, 46.80, 24.05, 46.88)),
    Region(id="baragan-plain", name="Baragan Plain (farmland)", land_cover="cropland",
           bbox=(27.20, 44.55, 27.30, 44.63)),
    Region(id="apuseni-forest", name="Apuseni Mountains (forest)", land_cover="forest",
           bbox=(22.75, 46.45, 22.85, 46.53)),
    Region(id="danube-delta", name="Danube Delta (wetland)", land_cover="wetland",
           bbox=(29.45, 45.15, 29.55, 45.23)),
]

REGIONS_BY_ID = {region.id: region for region in REGIONS}
