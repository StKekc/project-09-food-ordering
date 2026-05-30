import type { Category, MenuItem, NutritionInfo } from './data'
import { calculateDishNutrition, per100gFromDishApi } from './nutrition'

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
  calories_100g?: number
  proteins_100g?: number
  fats_100g?: number
  carbs_100g?: number
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
  weight_grams?: number | null
  calories_100g?: number
  proteins_100g?: number
  fats_100g?: number
  carbs_100g?: number
  is_active?: boolean
}

export interface DishUpdatePayload {
  category_id?: number
  name?: string
  description?: string | null
  price?: number
  weight_grams?: number | null
  calories_100g?: number
  proteins_100g?: number
  fats_100g?: number
  carbs_100g?: number
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

export function resolveDishImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl?.trim()) return ''
  const normalized = imageUrl.trim()
  if (
    normalized.startsWith('http://') ||
    normalized.startsWith('https://') ||
    normalized.startsWith('data:')
  ) {
    return normalized
  }
  if (normalized.startsWith('/')) {
    try {
      return `${apiBase()}${normalized}`
    } catch {
      return normalized
    }
  }
  return normalized
}

export function buildDishFormData(
  payload: DishCreatePayload | DishUpdatePayload,
  imageFile?: File | null
): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue
    fd.append(key, String(value))
  }
  if (imageFile) {
    fd.append('image', imageFile)
  }
  return fd
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

export async function reorderCategories(ids: number[]): Promise<void> {
  const res = await fetch(`${apiBase()}/categories/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function reorderDishes(ids: number[]): Promise<void> {
  const res = await fetch(`${apiBase()}/dishes/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  })
  if (!res.ok) throw new Error(await parseError(res))
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

export async function createDish(
  payload: DishCreatePayload,
  imageFile?: File | null
): Promise<DishResponse> {
  const res = await fetch(`${apiBase()}/dishes`, {
    method: 'POST',
    body: buildDishFormData(payload, imageFile),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function updateDish(
  dishId: string,
  payload: DishUpdatePayload,
  imageFile?: File | null
): Promise<DishResponse> {
  const res = await fetch(`${apiBase()}/dishes/${dishId}`, {
    method: 'PUT',
    body: buildDishFormData(payload, imageFile),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function persistMenuLayoutOrder(
  orderedCategoryIds: string[],
  orderedItems: { id: string; categoryId: string }[],
  previousItems: MenuItem[]
): Promise<void> {
  const categoryIds = orderedCategoryIds
    .map((id) => parseInt(id, 10))
    .filter((id) => Number.isFinite(id))
  const dishIds = orderedItems
    .map((item) => parseInt(item.id, 10))
    .filter((id) => Number.isFinite(id))

  if (categoryIds.length === 0 || dishIds.length === 0) return

  const prevById = new Map(previousItems.map((item) => [item.id, item]))
  const categoryMoves = orderedItems.filter(({ id, categoryId }) => {
    const prev = prevById.get(id)
    return prev && String(prev.category_id) !== String(categoryId)
  })

  await Promise.all([
    reorderCategories(categoryIds),
    reorderDishes(dishIds),
    ...categoryMoves.map(({ id, categoryId }) =>
      updateDish(id, { category_id: parseInt(categoryId, 10) })
    ),
  ])
}

export async function deleteDishApi(dishId: string): Promise<void> {
  const res = await fetch(`${apiBase()}/dishes/${dishId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await parseError(res))
}

export function parseWeightGrams(weight?: string | number): number | null {
  if (weight == null || weight === '') return null
  if (typeof weight === 'number') {
    return Number.isFinite(weight) && weight > 0 ? Math.round(weight) : null
  }
  const digits = weight.replace(/\D/g, '')
  if (!digits) return null
  const grams = parseInt(digits, 10)
  return Number.isFinite(grams) ? grams : null
}

function nutritionPayloadFromMenuItem(data: Partial<MenuItem>) {
  return {
    calories_100g: Number(data.calories ?? 0),
    proteins_100g: Number(data.proteins ?? 0),
    fats_100g: Number(data.fats ?? 0),
    carbs_100g: Number(data.carbs ?? 0),
    weight_grams:
      data.weightGrams != null && data.weightGrams > 0
        ? Math.round(data.weightGrams)
        : parseWeightGrams(data.weight),
  }
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
    ...nutritionPayloadFromMenuItem(data),
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
    ...nutritionPayloadFromMenuItem(data),
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
  const per100g = per100gFromDishApi(dish)
  const weightGrams = dish.weight_grams ?? null

  return {
    id: String(dish.id),
    name: dish.name,
    description: dish.description ?? '',
    price: Number(dish.price),
    calories: per100g.calories,
    proteins: per100g.proteins,
    fats: per100g.fats,
    carbs: per100g.carbs,
    weightGrams: weightGrams ?? undefined,
    dishNutrition: calculateDishNutrition(per100g, weightGrams),
    image_url: resolveDishImageUrl(dish.image_url),
    category_id: String(dish.category_id),
    weight: weightGrams ? `${weightGrams}г` : undefined,
  }
}
