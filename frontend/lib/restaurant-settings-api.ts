const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

export interface RestaurantSettingsResponse {
  restaurant_name: string
  restaurant_phone: string
  address: string
  working_hours: string
}

function apiBase(): string {
  if (!API_URL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured')
  }
  return API_URL.replace(/\/$/, '')
}

export async function fetchRestaurantSettings(): Promise<RestaurantSettingsResponse> {
  const res = await fetch(`${apiBase()}/restaurant/settings`)
  if (!res.ok) {
    let message = res.statusText || 'Failed to load restaurant settings'
    try {
      const body = await res.json()
      if (typeof body?.detail === 'string') message = body.detail
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }
  return res.json()
}
