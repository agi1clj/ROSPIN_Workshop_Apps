export interface Region {
  id: string
  name: string
  land_cover: string
  bbox: [number, number, number, number] // west, south, east, north
}

export interface NdviPoint {
  date: string
  ndvi: number
  cloud_cover: number
}

export interface NdviSeries {
  region: Region
  source: 'sample' | 'live'
  points: NdviPoint[]
  summary: { latest: number; mean: number; change: number; status: 'bare' | 'stressed' | 'moderate' | 'healthy' }
}

export type Source = NdviSeries['source']
