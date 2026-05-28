import type { HistoryOrder, OrderType } from './app-context'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

export interface UserProfileResponse {
  id: number
  phone: string
  email: string | null
  name: string | null
  birth_date: string | null
  role: string
  is_phone_verified: boolean
  created_at: string
}

export interface UserProfileUpdatePayload {
  phone: string
  email?: string | null
  name?: string | null
  birth_date?: string | null
}

export interface OrderHistoryItemResponse {
  dish_id: number
  dish_name: string
  quantity: number
  unit_price: number | string
  line_total: number | string
  special_instructions?: string | null
}

export interface OrderHistoryEntryResponse {
  id: number
  order_number: string
  status: string
  total_amount: number | string
  created_at: string
  delivery_type: string
  table_number: string | null
  items: OrderHistoryItemResponse[]
}

function apiBase(): string {
  if (!API_URL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured')
  }
  return API_URL.replace(/\/$/, '')
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json()
    if (typeof body?.detail === 'string') return body.detail
    if (Array.isArray(body?.detail)) {
      return body.detail.map((e: { msg?: string }) => e.msg).filter(Boolean).join(', ')
    }
  } catch {
    /* ignore */
  }
  return res.statusText || 'Request failed'
}

/** Normalize display phone to E.164-style +7XXXXXXXXXX for API */
export function normalizePhoneForApi(displayPhone: string): string {
  const digits = displayPhone.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('7')) {
    return `+${digits}`
  }
  return displayPhone.trim()
}

export function birthdayToIso(birthday: string): string | null {
  const match = birthday.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!match) return null
  return `${match[3]}-${match[2]}-${match[1]}`
}

export function birthdayFromIso(iso: string | null | undefined): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('T')[0].split('-')
  if (!y || !m || !d) return ''
  return `${d}.${m}.${y}`
}

export interface UserSessionState {
  userId: number
  profile: {
    name: string
    birthday: string
    email: string
    role: string
  }
  isAdmin: boolean
}

export function mapUserResponseToSession(user: UserProfileResponse): UserSessionState {
  return {
    userId: user.id,
    profile: {
      name: user.name ?? '',
      birthday: birthdayFromIso(user.birth_date),
      email: user.email ?? '',
      role: user.role,
    },
    isAdmin: user.role === 'admin',
  }
}

export async function updateUserProfile(
  payload: UserProfileUpdatePayload
): Promise<UserProfileResponse> {
  const res = await fetch(`${apiBase()}/users/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function fetchOrderHistory(phone: string): Promise<HistoryOrder[]> {
  const params = new URLSearchParams({ phone: normalizePhoneForApi(phone) })
  const res = await fetch(`${apiBase()}/orders/history?${params}`)
  if (res.status === 404) return []
  if (!res.ok) throw new Error(await parseError(res))
  const entries: OrderHistoryEntryResponse[] = await res.json()
  return entries.map(mapOrderHistoryEntry)
}

function mapOrderStatus(status: string): HistoryOrder['status'] {
  const s = status.toLowerCase()
  if (s === 'ready' || s === 'completed' || s === 'done' || s === 'delivered') {
    return 'ready'
  }
  if (s === 'preparing' || s === 'cooking' || s === 'in_progress') {
    return 'preparing'
  }
  return 'accepted'
}

function mapDeliveryType(deliveryType: string): OrderType {
  return deliveryType === 'pickup' ? 'takeaway' : 'dine-in'
}

function formatOrderDate(createdAt: string): string {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return createdAt
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function mapOrderHistoryEntry(entry: OrderHistoryEntryResponse): HistoryOrder {
  return {
    id: String(entry.id),
    orderNumber: entry.order_number,
    status: mapOrderStatus(entry.status),
    total: Number(entry.total_amount),
    type: mapDeliveryType(entry.delivery_type),
    date: formatOrderDate(entry.created_at),
    items: (entry.items ?? []).map(item => ({
      name: item.dish_name,
      quantity: item.quantity,
      price: Number(item.unit_price),
    })),
  }
}
