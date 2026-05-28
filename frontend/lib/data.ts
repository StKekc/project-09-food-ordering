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
  // Nutrition per 100g
  calories: number
  proteins: number
  fats: number
  carbs: number
  // Nutrition for entire dish
  dishNutrition: NutritionInfo
  image_url: string
  category_id: string
  weight?: string
}

export interface Category {
  id: string
  name: string
}
