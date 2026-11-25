import { API_BASE_URL } from './config'
import type { NdviSeries, Region, Source } from './types'

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`)
  if (!response.ok) {
    const detail = await response.json().then((body) => body.detail).catch(() => response.statusText)
    throw new Error(`${response.status}: ${detail}`)
  }
  return response.json() as Promise<T>
}

export const getRegions = () => get<Region[]>('/api/regions')
export const getNdvi = (regionId: string, source: Source) =>
  get<NdviSeries>(`/api/regions/${encodeURIComponent(regionId)}/ndvi?source=${source}`)
export const getBackendVersion = () => get<{ version: string }>('/health').then((h) => h.version)
