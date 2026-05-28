import type { Category, MenuItem, NutritionInfo } from './data'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

export interface ApiCategoryResponse {
  id: number
  name: string
}

export interface DishResponse {
  id: number
  category_id: number
  name: string
  description: string | null
  price: number | string
  old_price: number | string | null
  ingredients: string | null
  nutrition_info: NutritionInfo | null
  weight_grams: number | null
  is_available: boolean
  is_active: boolean
  is_recommended: boolean
  is_spicy: boolean
  popularity_score: number
  image_url: string | null
  preparation_time_min: number | null
}

export interface DishCreatePayload {
  category_id: number
  name: string
  description?: string | null
  price: number
  nutrition_info?: NutritionInfo | null
  weight_grams?: number | null
  image_url?: string | null
  is_active?: boolean
}

export interface DishUpdatePayload {
  category_id?: number
  name?: string
  description?: string | null
  price?: number
  nutrition_info?: NutritionInfo | null
  weight_grams?: number | null
  image_url?: string | null
  is_active?: boolean
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

export function apiCategoryToCategory(api: ApiCategoryResponse): Category {
  return {
    id: String(api.id),
    name: api.name,
  }
}

export async function fetchCategories(): Promise<ApiCategoryResponse[]> {
  const res = await fetch(`${apiBase()}/categories`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function fetchDishes(options?: {
  available_only?: boolean
  include_inactive?: boolean
  limit?: number
}): Promise<DishResponse[]> {
  const params = new URLSearchParams()
  if (options?.available_only === false) {
    params.set('available_only', 'false')
  }
  if (options?.include_inactive) {
    params.set('include_inactive', 'true')
  }
  if (options?.limit) {
    params.set('limit', String(options.limit))
  }
  const qs = params.toString()
  const res = await fetch(`${apiBase()}/dishes${qs ? `?${qs}` : ''}`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function createDish(payload: DishCreatePayload): Promise<DishResponse> {
  const res = await fetch(`${apiBase()}/dishes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function updateDish(
  dishId: string,
  payload: DishUpdatePayload
): Promise<DishResponse> {
  const res = await fetch(`${apiBase()}/dishes/${dishId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function deleteDishApi(dishId: string): Promise<void> {
  const res = await fetch(`${apiBase()}/dishes/${dishId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await parseError(res))
}

export function parseWeightGrams(weight?: string): number | null {
  if (!weight) return null
  const digits = weight.replace(/\D/g, '')
  if (!digits) return null
  const grams = parseInt(digits, 10)
  return Number.isFinite(grams) ? grams : null
}

export function menuItemToCreatePayload(
  data: Partial<MenuItem>,
  categories: Category[]
): DishCreatePayload {
  const categoryId = data.category_id
    ? parseInt(data.category_id, 10)
    : parseInt(categories[0]?.id ?? '', 10)
  if (!Number.isFinite(categoryId)) {
    throw new Error('Категория не найдена')
  }
  return {
    category_id: categoryId,
    name: data.name || '',
    description: data.description || null,
    price: data.price || 0,
    nutrition_info: {
      calories: data.calories ?? 0,
      proteins: data.proteins ?? 0,
      fats: data.fats ?? 0,
      carbs: data.carbs ?? 0,
    },
    weight_grams: parseWeightGrams(data.weight),
    image_url: data.image_url || null,
    is_active: true,
  }
}

export function menuItemToUpdatePayload(
  data: Partial<MenuItem>,
  categories: Category[]
): DishUpdatePayload {
  const payload: DishUpdatePayload = {
    name: data.name,
    description: data.description ?? null,
    price: data.price,
    nutrition_info: {
      calories: data.calories ?? 0,
      proteins: data.proteins ?? 0,
      fats: data.fats ?? 0,
      carbs: data.carbs ?? 0,
    },
    weight_grams: parseWeightGrams(data.weight),
    image_url: data.image_url || null,
  }
  if (data.category_id) {
    payload.category_id = parseInt(data.category_id, 10)
  }
  return payload
}

export function activeDishesToMenuItems(dishes: DishResponse[]): MenuItem[] {
  return dishes.filter(d => d.is_active).map(d => dishResponseToMenuItem(d))
}

export function dishResponseToMenuItem(dish: DishResponse): MenuItem {
  const nutrition = dish.nutrition_info ?? {
    calories: 0,
    proteins: 0,
    fats: 0,
    carbs: 0,
  }

  return {
    id: String(dish.id),
    name: dish.name,
    description: dish.description ?? '',
    price: Number(dish.price),
    calories: nutrition.calories ?? 0,
    proteins: nutrition.proteins ?? 0,
    fats: nutrition.fats ?? 0,
    carbs: nutrition.carbs ?? 0,
    dishNutrition: { ...nutrition },
    image_url: dish.image_url ?? '',
    category_id: String(dish.category_id),
    weight: dish.weight_grams ? `${dish.weight_grams}г` : undefined,
  }
}
