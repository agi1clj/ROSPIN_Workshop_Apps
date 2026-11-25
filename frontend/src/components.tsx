import { useEffect, useRef, useState } from 'react'
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

const BANDS = [
  { from: 0.6, to: 1, color: '#15803d', label: 'healthy' },
  { from: 0.4, to: 0.6, color: '#65a30d', label: 'moderate' },
  { from: 0.2, to: 0.4, color: '#ca8a04', label: 'stressed' },
  { from: 0, to: 0.2, color: '#b45309', label: 'bare soil' },
] as const

/** NDVI over time as a plain SVG chart: colour bands show what each value means. No chart library. */
export function NdviChart({ points, name, compare, compareName }: { points: NdviPoint[]; name: string; compare?: NdviPoint[]; compareName?: string }) {
  const [hover, setHover] = useState<number>()
  const width = 600
  const height = 260
  const pad = { left: 38, right: 78, top: 14, bottom: 30 }
  const x = (i: number) => pad.left + (points.length < 2 ? 0.5 : i / (points.length - 1)) * (width - pad.left - pad.right)
  const y = (v: number) => pad.top + (1 - v) * (height - pad.top - pad.bottom)
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.ndvi)}`).join(' ')
  const xc = (i: number, n: number) => pad.left + (n < 2 ? 0.5 : i / (n - 1)) * (width - pad.left - pad.right)
  const line2 = compare?.map((p, i) => `${i === 0 ? 'M' : 'L'}${xc(i, compare.length)},${y(p.ndvi)}`).join(' ')
  const area = `${line} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`
  const active = hover === undefined ? undefined : points[hover]

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="chart" role="img" aria-label="NDVI over time"
        onMouseLeave={() => setHover(undefined)}
        onMouseMove={(e) => {
          const box = e.currentTarget.getBoundingClientRect()
          const px = ((e.clientX - box.left) / box.width) * width
          setHover(points.reduce((best, _p, i) => (Math.abs(x(i) - px) < Math.abs(x(best) - px) ? i : best), 0))
        }}>
        <defs>
          <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#22d3ee" stopOpacity="0.35" /><stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>
        {BANDS.map((b) => (
          <g key={b.label}>
            <rect x={pad.left} y={y(b.to)} width={width - pad.left - pad.right} height={y(b.from) - y(b.to)} fill={b.color} opacity="0.16" />
            <text x={width - pad.right + 8} y={(y(b.to) + y(b.from)) / 2 + 4} className="axis" fill={b.color}>{b.label}</text>
          </g>
        ))}
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((tick) => (
          <text key={tick} x={pad.left - 6} y={y(tick) + 4} textAnchor="end" className="axis">{tick}</text>
        ))}
        <path d={area} fill="url(#fill)" />
        <path d={line} className="line" />
        {line2 && <path d={line2} className="line2" />}
        {compare?.map((p, i) => <circle key={p.date} cx={xc(i, compare.length)} cy={y(p.ndvi)} r={3.5} className="dot2" />)}
        {points.map((p, i) => (
          <g key={p.date}>
            <circle cx={x(i)} cy={y(p.ndvi)} r={hover === i ? 6.5 : 4} className="dot" />
            <text x={x(i)} y={height - 9} textAnchor="middle" className="axis">{p.date.slice(5)}</text>
          </g>
        ))}
        {active && hover !== undefined && <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={y(0)} className="cursor" />}
      </svg>
      <div className="legend">
        <span><i className="sw a" />{name}</span>
        {compare && <span><i className="sw b" />{compareName}</span>}
      </div>
      {active && hover !== undefined && (
        <div className="tip" style={{ left: `${(x(hover) / width) * 100}%` }}>
          <strong>{active.ndvi.toFixed(3)}</strong> NDVI<br />{active.date} · {active.cloud_cover}% cloud
        </div>
      )}
    </div>
  )
}

function Spark({ points }: { points: NdviPoint[] }) {
  const w = 90, h = 28
  const min = Math.min(...points.map((p) => p.ndvi)), max = Math.max(...points.map((p) => p.ndvi))
  const span = max - min || 1
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${(i / Math.max(points.length - 1, 1)) * w},${h - ((p.ndvi - min) / span) * (h - 4) - 2}`).join(' ')
  return <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true"><path d={d} fill="none" stroke="#22d3ee" strokeWidth="2" /></svg>
}

export function SummaryTiles({ series }: { series: NdviSeries }) {
  const { summary } = series
  const arrow = summary.change > 0.02 ? '▲' : summary.change < -0.02 ? '▼' : '■'
  const trend = summary.change > 0.02 ? 'greener' : summary.change < -0.02 ? 'browner' : 'stable'
  return (
    <div className="tiles">
      <div className="tile big"><span>Latest NDVI</span><strong>{summary.latest.toFixed(2)}</strong><Spark points={series.points} /></div>
      <div className="tile"><span>Mean</span><strong>{summary.mean.toFixed(2)}</strong></div>
      <div className="tile"><span>Trend</span><strong>{arrow} {Math.abs(summary.change).toFixed(2)}</strong><small>{trend}</small></div>
      <div className="tile">
        <span>Vegetation</span>
        <strong className="badge" style={{ background: STATUS_COLOR[summary.status] }}>{summary.status}</strong>
      </div>
    </div>
  )
}
