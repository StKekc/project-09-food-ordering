import type { NutritionInfo } from './data'

/** Round to integer or one decimal place. */
export function formatNutritionValue(value: number): number {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? Math.round(rounded) : rounded
}

export function calculateDishNutrition(
  per100g: NutritionInfo,
  weightGrams: number | null | undefined
): NutritionInfo {
  if (weightGrams == null || weightGrams <= 0) {
    return { calories: 0, proteins: 0, fats: 0, carbs: 0 }
  }
  const factor = weightGrams / 100
  return {
    calories: formatNutritionValue(per100g.calories * factor),
    proteins: formatNutritionValue(per100g.proteins * factor),
    fats: formatNutritionValue(per100g.fats * factor),
    carbs: formatNutritionValue(per100g.carbs * factor),
  }
}

export function per100gFromDishApi(dish: {
  calories_100g?: number | null
  proteins_100g?: number | null
  fats_100g?: number | null
  carbs_100g?: number | null
  nutrition_info?: NutritionInfo | null
}): NutritionInfo {
  if (
    dish.calories_100g != null ||
    dish.proteins_100g != null ||
    dish.fats_100g != null ||
    dish.carbs_100g != null
  ) {
    return {
      calories: Number(dish.calories_100g ?? 0),
      proteins: Number(dish.proteins_100g ?? 0),
      fats: Number(dish.fats_100g ?? 0),
      carbs: Number(dish.carbs_100g ?? 0),
    }
  }
  const legacy = dish.nutrition_info
  return {
    calories: Number(legacy?.calories ?? 0),
    proteins: Number(legacy?.proteins ?? 0),
    fats: Number(legacy?.fats ?? 0),
    carbs: Number(legacy?.carbs ?? 0),
  }
}
