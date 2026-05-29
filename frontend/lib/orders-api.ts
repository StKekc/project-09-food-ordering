const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

export interface OrderItemPayload {
  dish_id: number
  quantity: number
  special_instructions?: string | null
}

export interface OrderCreatePayload {
  user_id: number
  restaurant_id: number
  delivery_type: 'at_table' | 'pickup'
  table_number?: string | null
  customer_phone: string
  customer_name?: string | null
  special_instructions?: string | null
  items: OrderItemPayload[]
}

export interface OrderCreateResponse {
  id: number
  order_number: string
  status: string
  total_amount: number | string
  created_at: string
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
    if (typeof body?.detail === 'object' && body.detail !== null) {
      return JSON.stringify(body.detail)
    }
  } catch {
    /* ignore */
  }
  return res.statusText || 'Request failed'
}

export async function createOrder(payload: OrderCreatePayload): Promise<OrderCreateResponse> {
  const res = await fetch(`${apiBase()}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export interface OrderStatusUpdateResponse {
  id: number
  order_number: string
  status: string
}

export async function updateOrderStatus(
  orderId: number | string,
  status: 'ready' | 'готов' | string
): Promise<OrderStatusUpdateResponse> {
  const res = await fetch(`${apiBase()}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}
