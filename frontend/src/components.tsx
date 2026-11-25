import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { NdviPoint, NdviSeries, Region } from './types'

export const STATUS_COLOR = { bare: '#b45309', stressed: '#ca8a04', moderate: '#65a30d', healthy: '#15803d' } as const

/** Satellite basemap with the selected region outlined. */
export function RegionMap({ region }: { region: Region }) {
  const element = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | undefined>(undefined)
  const box = useRef<L.Rectangle | undefined>(undefined)

  useEffect(() => {
    if (!element.current || map.current) return
    map.current = L.map(element.current, { scrollWheelZoom: false })
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
      maxZoom: 17,
    }).addTo(map.current)
  }, [])

  useEffect(() => {
    if (!map.current) return
    const [west, south, east, north] = region.bbox
    const bounds = L.latLngBounds([south, west], [north, east])
    box.current?.remove()
    box.current = L.rectangle(bounds, { color: '#22d3ee', weight: 2, fillOpacity: 0.08 }).addTo(map.current)
    map.current.invalidateSize()
    map.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 13 })
  }, [region])

  return <div ref={element} className="map" role="img" aria-label={`Satellite map of ${region.name}`} />
}

/** NDVI over time as a plain SVG line chart (no chart library). */
export function NdviChart({ points }: { points: NdviPoint[] }) {
  const width = 560
  const height = 220
  const pad = { left: 40, right: 16, top: 12, bottom: 28 }
  const x = (i: number) => pad.left + (points.length < 2 ? 0.5 : i / (points.length - 1)) * (width - pad.left - pad.right)
  const y = (v: number) => pad.top + (1 - v) * (height - pad.top - pad.bottom)
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.ndvi)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="chart" role="img" aria-label="NDVI over time">
      {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
        <g key={tick}>
          <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} className="grid" />
          <text x={pad.left - 6} y={y(tick) + 4} textAnchor="end" className="axis">{tick}</text>
        </g>
      ))}
      <path d={line} className="line" />
      {points.map((p, i) => (
        <g key={p.date}>
          <circle cx={x(i)} cy={y(p.ndvi)} r={4} className="dot" />
          <text x={x(i)} y={height - 8} textAnchor="middle" className="axis">{p.date.slice(5)}</text>
        </g>
      ))}
    </svg>
  )
}

export function SummaryTiles({ series }: { series: NdviSeries }) {
  const { summary } = series
  const arrow = summary.change > 0.02 ? '▲' : summary.change < -0.02 ? '▼' : '■'
  return (
    <div className="tiles">
      <div className="tile"><span>Latest NDVI</span><strong>{summary.latest.toFixed(2)}</strong></div>
      <div className="tile"><span>Mean</span><strong>{summary.mean.toFixed(2)}</strong></div>
      <div className="tile"><span>Change</span><strong>{arrow} {summary.change.toFixed(2)}</strong></div>
      <div className="tile">
        <span>Vegetation</span>
        <strong style={{ color: STATUS_COLOR[summary.status] }}>{summary.status}</strong>
      </div>
    </div>
  )
}
