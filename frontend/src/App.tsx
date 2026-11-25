import { useEffect, useState } from 'react'
import { getBackendVersion, getNdvi, getRegions } from './api'
import { NdviChart, RegionMap, SummaryTiles } from './components'
import type { NdviSeries, Region, Source } from './types'
import './App.css'

export default function App() {
  const [regions, setRegions] = useState<Region[]>([])
  const [regionId, setRegionId] = useState('')
  const [source, setSource] = useState<Source>('sample')
  const [series, setSeries] = useState<NdviSeries>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [version, setVersion] = useState('')

  useEffect(() => {
    getRegions()
      .then((list) => {
        setRegions(list)
        setRegionId(list[0]?.id ?? '')
      })
      .catch((e: Error) => setError(e.message))
    getBackendVersion().then(setVersion).catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!regionId) return
    setLoading(true)
    setError(undefined)
    getNdvi(regionId, source)
      .then(setSeries)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [regionId, source])

  const region = regions.find((r) => r.id === regionId)

  return (
    <main>
      <header>
        <h1>Rospin NDVI Explorer</h1>
        <p>Vegetation health from Sentinel-2 satellite images. NDVI = (NIR − Red) / (NIR + Red).</p>
      </header>

      <section className="controls">
        <label>
          Region
          <select value={regionId} onChange={(e) => setRegionId(e.target.value)}>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </label>
        <label>
          Data
          <select value={source} onChange={(e) => setSource(e.target.value as Source)}>
            <option value="sample">Sample (instant)</option>
            <option value="live">Live Sentinel-2 (about a minute)</option>
          </select>
        </label>
      </section>

      {error && <p className="error" role="alert">{error}</p>}
      {loading && <p className="muted">Reading satellite data…</p>}

      <div className="grid">
        {region && <RegionMap region={region} />}
        {series && !loading && (
          <div>
            <SummaryTiles series={series} />
            <NdviChart points={series.points} />
          </div>
        )}
      </div>

      {series && !loading && (
        <table>
          <thead><tr><th>Date</th><th>NDVI</th><th>Cloud cover</th></tr></thead>
          <tbody>
            {series.points.map((p) => (
              <tr key={p.date}><td>{p.date}</td><td>{p.ndvi.toFixed(3)}</td><td>{p.cloud_cover}%</td></tr>
            ))}
          </tbody>
        </table>
      )}

      <footer>Data source: {series?.source ?? '…'} · backend version: {version || '…'}</footer>
    </main>
  )
}
