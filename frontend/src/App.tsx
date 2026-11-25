import { useEffect, useState } from 'react'
import { getBackendVersion, getNdvi, getRegions } from './api'
import { NdviChart, RegionMap, SummaryTiles } from './components'
import type { NdviSeries, Region, Source } from './types'
import './App.css'

const COVER_LABEL: Record<string, string> = { cropland: 'Farmland', forest: 'Forest', wetland: 'Wetland' }

export default function App() {
  const [regions, setRegions] = useState<Region[]>([])
  const [regionId, setRegionId] = useState('')
  const [source, setSource] = useState<Source>('sample')
  const [series, setSeries] = useState<NdviSeries>()
  const [compareId, setCompareId] = useState('')
  const [compare, setCompare] = useState<NdviSeries>()
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

  useEffect(() => {
    if (!compareId) { setCompare(undefined); return }
    getNdvi(compareId, source).then(setCompare).catch(() => setCompare(undefined))
  }, [compareId, source])

  const region = regions.find((r) => r.id === regionId)

  return (
    <div className="shell">
      <header className="hero">
        <div className="brand">
          <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
            <circle cx="24" cy="24" r="9" fill="#FFD000" />
            <ellipse cx="24" cy="24" rx="21" ry="8" fill="none" stroke="#22d3ee" strokeWidth="2.5" transform="rotate(-25 24 24)" />
            <circle cx="42" cy="15" r="3.2" fill="#22d3ee" />
          </svg>
          <div>
            <h1>Rospin NDVI Explorer</h1>
            <p>Plant health in Romania, seen from space by Sentinel-2.</p>
          </div>
        </div>
        <div className="hero-side">
          <div className="seg" role="group" aria-label="Data source">
            <button className={source === 'sample' ? 'on' : ''} onClick={() => setSource('sample')}>Sample<small>instant</small></button>
            <button className={source === 'live' ? 'on' : ''} onClick={() => setSource('live')}>Live<small>about 1 min</small></button>
          </div>
          <span className="pill" title="Version of the backend that answers (git commit)">backend {version ? version.slice(0, 7) : '…'}</span>
        </div>
      </header>

      <nav className="regions" aria-label="Regions">
        {regions.map((r) => (
          <button key={r.id} className={`region ${r.id === regionId ? 'on' : ''}`} onClick={() => setRegionId(r.id)}>
            <span className={`dot ${r.land_cover}`} />
            <strong>{r.name.replace(/ \(.*\)/, '')}</strong>
            <small>{COVER_LABEL[r.land_cover] ?? r.land_cover}</small>
          </button>
        ))}
      </nav>

      {error && <p className="error" role="alert">{error}</p>}

      <main className="grid">
        <section className="panel map-panel">{region && <RegionMap region={region} />}</section>
        <section className="panel">
          {loading && <div className="skeleton" aria-label="Loading"><i /><i /><i /></div>}
          {series && !loading && (
            <>
              <SummaryTiles series={series} />
              <NdviChart points={series.points} name={region?.name.replace(/ \(.*\)/, '') ?? ''} compare={compare?.points} compareName={compare?.region.name.replace(/ \(.*\)/, '')} />
              <label className="cmp">Compare with
                <select value={compareId} onChange={(e) => setCompareId(e.target.value)}>
                  <option value="">none</option>
                  {regions.filter((r) => r.id !== regionId).map((r) => <option key={r.id} value={r.id}>{r.name.replace(/ \(.*\)/, '')}</option>)}
                </select>
              </label>
            </>
          )}
        </section>
      </main>

      {series && !loading && (
        <section className="panel">
          <table>
            <thead><tr><th>Date</th><th>NDVI</th><th>Cloud cover</th></tr></thead>
            <tbody>
              {series.points.map((p) => (
                <tr key={p.date}><td>{p.date}</td><td>{p.ndvi.toFixed(3)}</td><td>{p.cloud_cover}%</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <footer>
        Data: {series?.source ?? '…'} · Contains modified Copernicus Sentinel-2 data · Map imagery Esri
      </footer>
    </div>
  )
}
