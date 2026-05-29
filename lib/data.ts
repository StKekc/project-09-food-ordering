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
  category: string
  weight?: string
}

export interface Category {
  id: string
  name: string
  slug: string
}

export const categories: Category[] = [
  { id: '1', name: 'Стартеры', slug: 'starters' },
  { id: '2', name: 'Горячие закуски', slug: 'hot-appetizers' },
  { id: '3', name: 'Кесадилья', slug: 'quesadilla' },
  { id: '4', name: 'Буррито', slug: 'burrito' },
  { id: '5', name: 'Тако', slug: 'tacos' },
  { id: '6', name: 'Супы', slug: 'soups' },
  { id: '7', name: 'Салаты', slug: 'salads' },
  { id: '8', name: 'На огне', slug: 'grilled' },
  { id: '9', name: 'Гарниры', slug: 'sides' },
  { id: '10', name: 'Соусы', slug: 'sauces' },
  { id: '11', name: 'Десерты', slug: 'desserts' },
  { id: '12', name: 'Напитки', slug: 'drinks' },
]

export const menuItems: MenuItem[] = [
  // Стартеры
  {
    id: '1',
    name: 'Начос с гуакамоле',
    description: 'Хрустящие кукурузные чипсы с авторским гуакамоле и соусом сальса',
    price: 520,
    calories: 211,
    proteins: 4,
    fats: 12,
    carbs: 23,
    dishNutrition: { calories: 380, proteins: 8, fats: 22, carbs: 42 },
    image_url: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=400&h=300&fit=crop',
    category: 'starters',
    weight: '180г'
  },
  {
    id: '2',
    name: 'Чили кон карне',
    description: 'Острое рагу из говядины с красной фасолью и специями',
    price: 680,
    calories: 168,
    proteins: 11,
    fats: 7,
    carbs: 14,
    dishNutrition: { calories: 420, proteins: 28, fats: 18, carbs: 35 },
    image_url: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400&h=300&fit=crop',
    category: 'starters',
    weight: '250г'
  },
  {
    id: '3',
    name: 'Тортилья чипсы',
    description: 'Домашние чипсы из кукурузной тортильи с тремя соусами',
    price: 380,
    calories: 193,
    proteins: 3,
    fats: 10,
    carbs: 25,
    dishNutrition: { calories: 290, proteins: 5, fats: 15, carbs: 38 },
    image_url: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=400&h=300&fit=crop',
    category: 'starters',
    weight: '150г'
  },
  
  // Горячие закуски
  {
    id: '4',
    name: 'Крылья El Diablo',
    description: 'Острые куриные крылья в фирменном соусе чипотле',
    price: 880,
    calories: 200,
    proteins: 13,
    fats: 11,
    carbs: 7,
    dishNutrition: { calories: 520, proteins: 35, fats: 28, carbs: 18 },
    image_url: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400&h=300&fit=crop',
    category: 'hot-appetizers',
    weight: '260г'
  },
  {
    id: '5',
    name: 'Цукини фри',
    description: 'Хрустящие палочки цукини в панировке с соусом ранч',
    price: 480,
    calories: 152,
    proteins: 6,
    fats: 9,
    carbs: 13,
    dishNutrition: { calories: 320, proteins: 12, fats: 18, carbs: 28 },
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
    category: 'hot-appetizers',
    weight: '210/40г'
  },
  {
    id: '6',
    name: 'Сырные шарики из моцареллы',
    description: 'Хрустящие шарики моцареллы с томатным соусом',
    price: 780,
    calories: 240,
    proteins: 11,
    fats: 16,
    carbs: 13,
    dishNutrition: { calories: 480, proteins: 22, fats: 32, carbs: 25 },
    image_url: 'https://images.unsplash.com/photo-1531749668029-2db88e4276c7?w=400&h=300&fit=crop',
    category: 'hot-appetizers',
    weight: '200/30г'
  },
  {
    id: '7',
    name: 'Картофель фри с трюфельным соусом',
    description: 'Золотистый картофель фри с соусом из черного трюфеля',
    price: 480,
    calories: 345,
    proteins: 5,
    fats: 20,
    carbs: 41,
    dishNutrition: { calories: 380, proteins: 6, fats: 22, carbs: 45 },
    image_url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop',
    category: 'hot-appetizers',
    weight: '110/40г'
  },
  {
    id: '8',
    name: 'Попкорн из креветок',
    description: 'Хрустящие креветки в панировке с острым майонезом',
    price: 880,
    calories: 283,
    proteins: 20,
    fats: 15,
    carbs: 18,
    dishNutrition: { calories: 340, proteins: 24, fats: 18, carbs: 22 },
    image_url: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400&h=300&fit=crop',
    category: 'hot-appetizers',
    weight: '120/30г'
  },
  
  // Кесадилья
  {
    id: '9',
    name: 'Кесадилья с курицей',
    description: 'Тортилья с курицей, сыром чеддер и болгарским перцем',
    price: 620,
    calories: 207,
    proteins: 11,
    fats: 10,
    carbs: 17,
    dishNutrition: { calories: 580, proteins: 32, fats: 28, carbs: 48 },
    image_url: 'https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=400&h=300&fit=crop',
    category: 'quesadilla',
    weight: '280г'
  },
  {
    id: '10',
    name: 'Кесадилья с говядиной',
    description: 'Тортилья с говядиной, сыром и карамелизированным луком',
    price: 720,
    calories: 217,
    proteins: 13,
    fats: 11,
    carbs: 15,
    dishNutrition: { calories: 650, proteins: 38, fats: 32, carbs: 45 },
    image_url: 'https://images.unsplash.com/photo-1618040996337-56904b7850b9?w=400&h=300&fit=crop',
    category: 'quesadilla',
    weight: '300г'
  },
  {
    id: '11',
    name: 'Кесадилья с креветками',
    description: 'Тортилья с креветками, авокадо и соусом чипотле',
    price: 820,
    calories: 179,
    proteins: 10,
    fats: 9,
    carbs: 14,
    dishNutrition: { calories: 520, proteins: 28, fats: 26, carbs: 42 },
    image_url: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=300&fit=crop',
    category: 'quesadilla',
    weight: '290г'
  },
  
  // Буррито
  {
    id: '12',
    name: 'Буррито Классик',
    description: 'Большой буррито с курицей, рисом, фасолью и сметаной',
    price: 580,
    calories: 189,
    proteins: 9,
    fats: 7,
    carbs: 21,
    dishNutrition: { calories: 720, proteins: 35, fats: 28, carbs: 78 },
    image_url: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&h=300&fit=crop',
    category: 'burrito',
    weight: '380г'
  },
  {
    id: '13',
    name: 'Буррито Карнитас',
    description: 'Буррито с томленой свининой, гуакамоле и пико де гайо',
    price: 680,
    calories: 195,
    proteins: 11,
    fats: 9,
    carbs: 18,
    dishNutrition: { calories: 780, proteins: 42, fats: 35, carbs: 72 },
    image_url: 'https://images.unsplash.com/photo-1584208632869-05fa2b2a5934?w=400&h=300&fit=crop',
    category: 'burrito',
    weight: '400г'
  },
  
  // Тако
  {
    id: '14',
    name: 'Тако с говядиной',
    description: 'Три тако с говядиной, луком, кинзой и сальсой верде',
    price: 520,
    calories: 200,
    proteins: 12,
    fats: 9,
    carbs: 18,
    dishNutrition: { calories: 480, proteins: 28, fats: 22, carbs: 42 },
    image_url: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=300&fit=crop',
    category: 'tacos',
    weight: '240г'
  },
  {
    id: '15',
    name: 'Тако аль пастор',
    description: 'Три тако со свининой маринованной в аннато с ананасом',
    price: 580,
    calories: 200,
    proteins: 12,
    fats: 9,
    carbs: 17,
    dishNutrition: { calories: 520, proteins: 32, fats: 24, carbs: 45 },
    image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
    category: 'tacos',
    weight: '260г'
  },
  
  // Салаты
  {
    id: '16',
    name: 'Салат Цезарь по-мексикански',
    description: 'Романо, курица, авокадо, тортилья чипсы, соус цезарь',
    price: 620,
    calories: 136,
    proteins: 10,
    fats: 9,
    carbs: 6,
    dishNutrition: { calories: 380, proteins: 28, fats: 24, carbs: 18 },
    image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
    category: 'salads',
    weight: '280г'
  },
  {
    id: '17',
    name: 'Салат с креветками и манго',
    description: 'Микс салата, креветки гриль, манго, авокадо, лаймовая заправка',
    price: 780,
    calories: 107,
    proteins: 8,
    fats: 6,
    carbs: 7,
    dishNutrition: { calories: 320, proteins: 24, fats: 18, carbs: 22 },
    image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop',
    category: 'salads',
    weight: '300г'
  },
  
  // Напитки
  {
    id: '18',
    name: 'Лимонад Маракуйя',
    description: 'Освежающий лимонад с маракуйей и мятой',
    price: 280,
    calories: 30,
    proteins: 0,
    fats: 0,
    carbs: 7,
    dishNutrition: { calories: 120, proteins: 0, fats: 0, carbs: 28 },
    image_url: 'https://images.unsplash.com/photo-1437418747212-8d9709afab22?w=400&h=300&fit=crop',
    category: 'drinks',
    weight: '400мл'
  },
  {
    id: '19',
    name: 'Хорчата',
    description: 'Традиционный мексиканский рисовый напиток с корицей',
    price: 320,
    calories: 51,
    proteins: 1,
    fats: 2,
    carbs: 9,
    dishNutrition: { calories: 180, proteins: 4, fats: 6, carbs: 32 },
    image_url: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=300&fit=crop',
    category: 'drinks',
    weight: '350мл'
  },
  
  // Десерты
  {
    id: '20',
    name: 'Чуррос с шоколадом',
    description: 'Хрустящие испанские пончики с горячим шоколадом',
    price: 420,
    calories: 253,
    proteins: 4,
    fats: 12,
    carbs: 35,
    dishNutrition: { calories: 380, proteins: 6, fats: 18, carbs: 52 },
    image_url: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400&h=300&fit=crop',
    category: 'desserts',
    weight: '150/50г'
  },
  {
    id: '21',
    name: 'Тресс Лечес',
    description: 'Нежный бисквит пропитанный тремя видами молока',
    price: 380,
    calories: 178,
    proteins: 4,
    fats: 8,
    carbs: 25,
    dishNutrition: { calories: 320, proteins: 8, fats: 14, carbs: 45 },
    image_url: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&h=300&fit=crop',
    category: 'desserts',
    weight: '180г'
  },
]

export function getMenuByCategory(categorySlug: string): MenuItem[] {
  return menuItems.filter(item => item.category === categorySlug)
}

export function getMenuItem(id: string): MenuItem | undefined {
  return menuItems.find(item => item.id === id)
}
