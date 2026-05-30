export interface NutritionInfo {
  calories: number
  proteins: number
  fats: number
  carbs: number
}

export interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  // Nutrition per 100g (from API *_100g fields)
  calories: number
  proteins: number
  fats: number
  carbs: number
  weightGrams?: number
  // Nutrition for entire dish (calculated from per 100g × weight)
  dishNutrition: NutritionInfo
  image_url: string
  category_id: string
  weight?: string
}

export interface Category {
  id: string
  name: string
}
