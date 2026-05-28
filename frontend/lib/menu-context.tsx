'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { fetchRestaurantSettings } from './restaurant-settings-api'
import type { MenuItem, Category } from './data'
import {
  createDish,
  updateDish,
  deleteDishApi,
  fetchCategories,
  fetchDishes,
  activeDishesToMenuItems,
  apiCategoryToCategory,
  dishResponseToMenuItem,
  menuItemToCreatePayload,
  menuItemToUpdatePayload,
} from './dishes-api'

export interface RestaurantInfo {
  name: string
  phone: string
  address: string
  workingHours: string
  sameHoursAllDays: boolean
  weekdayHours: {
    mon: string
    tue: string
    wed: string
    thu: string
    fri: string
    sat: string
    sun: string
  }
  coords: string
}

interface MenuContextType {
  categories: Category[]
  menuItems: MenuItem[]
  menuLoading: boolean
  menuError: string | null
  loadMenuFromApi: () => Promise<void>
  loadRestaurantSettingsFromApi: () => Promise<void>
  restaurantInfo: RestaurantInfo
  // Category operations
  addCategory: (category: Category) => void
  updateCategory: (id: string, category: Partial<Category>) => void
  deleteCategory: (id: string) => void
  reorderCategories: (fromIndex: number, toIndex: number) => void
  // MenuItem operations
  addMenuItem: (item: MenuItem) => void
  updateMenuItem: (id: string, item: Partial<MenuItem>) => void
  deleteMenuItem: (id: string) => void
  createMenuItemApi: (data: Partial<MenuItem>) => Promise<void>
  updateMenuItemApi: (id: string, data: Partial<MenuItem>) => Promise<void>
  deleteMenuItemApi: (id: string) => Promise<void>
  toggleItemStopApi: (id: string) => Promise<void>
  refreshDishesFromApi: () => Promise<void>
  toggleItemStop: (id: string) => void
  toggleCategoryHidden: (id: string) => void
  reorderMenuItems: (fromIndex: number, toIndex: number) => void
  applyMenuLayout: (
    orderedCategoryIds: string[],
    orderedItems: { id: string; categoryId: string }[]
  ) => void
  // Restaurant info operations
  updateRestaurantInfo: (info: Partial<RestaurantInfo>) => void
  // Stopped items tracking
  stoppedItems: Set<string>
  hiddenCategories: Set<string>
}

const MenuContext = createContext<MenuContextType | undefined>(undefined)

export function MenuProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [menuLoading, setMenuLoading] = useState(false)
  const [menuError, setMenuError] = useState<string | null>(null)
  const [stoppedItems, setStoppedItems] = useState<Set<string>>(new Set())
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set())
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo>({
    name: 'MUCHACHO',
    phone: '+79001102003',
    address: 'Большой проспект П.С., 39',
    workingHours: '12:00 - 23:00',
    sameHoursAllDays: true,
    weekdayHours: {
      mon: '12:00 - 23:00',
      tue: '12:00 - 23:00',
      wed: '12:00 - 23:00',
      thu: '12:00 - 23:00',
      fri: '12:00 - 23:00',
      sat: '12:00 - 23:00',
      sun: '12:00 - 23:00'
    },
    coords: '59.960275,30.303612'
  })

  // Category operations
  const addCategory = useCallback((category: Category) => {
    setCategories(prev => [...prev, category])
  }, [])

  const updateCategory = useCallback((id: string, updates: Partial<Category>) => {
    setCategories(prev => prev.map(cat => 
      cat.id === id ? { ...cat, ...updates } : cat
    ))
  }, [])

  const deleteCategory = useCallback((id: string) => {
    setCategories(prev => prev.filter(cat => cat.id !== id))
  }, [])

  const reorderCategories = useCallback((fromIndex: number, toIndex: number) => {
    setCategories(prev => {
      const result = [...prev]
      const [removed] = result.splice(fromIndex, 1)
      result.splice(toIndex, 0, removed)
      return result
    })
  }, [])

  // MenuItem operations
  const addMenuItem = useCallback((item: MenuItem) => {
    setMenuItems(prev => [...prev, item])
  }, [])

  const updateMenuItem = useCallback((id: string, updates: Partial<MenuItem>) => {
    setMenuItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ))
  }, [])

  const deleteMenuItem = useCallback((id: string) => {
    setMenuItems(prev => prev.filter(item => item.id !== id))
  }, [])

  const loadMenuFromApi = useCallback(async () => {
    setMenuLoading(true)
    setMenuError(null)
    try {
      const apiCategories = await fetchCategories()
      const loadedCategories = apiCategories.map(apiCategoryToCategory)
      setCategories(loadedCategories)
      const dishes = await fetchDishes({ limit: 200 })
      setMenuItems(activeDishesToMenuItems(dishes))
    } catch (err) {
      setCategories([])
      setMenuItems([])
      setMenuError(err instanceof Error ? err.message : 'Не удалось загрузить меню')
    } finally {
      setMenuLoading(false)
    }
  }, [])

  const refreshDishesFromApi = useCallback(async () => {
    const dishes = await fetchDishes({
      available_only: false,
      include_inactive: true,
      limit: 200,
    })
    setMenuItems(dishes.map(d => dishResponseToMenuItem(d)))
    setStoppedItems(new Set(dishes.filter(d => !d.is_active).map(d => String(d.id))))
  }, [categories])

  const createMenuItemApi = useCallback(async (data: Partial<MenuItem>) => {
    const payload = menuItemToCreatePayload(data, categories)
    await createDish(payload)
    await refreshDishesFromApi()
  }, [categories, refreshDishesFromApi])

  const updateMenuItemApi = useCallback(async (id: string, data: Partial<MenuItem>) => {
    const payload = menuItemToUpdatePayload(data, categories)
    await updateDish(id, payload)
    await refreshDishesFromApi()
  }, [categories, refreshDishesFromApi])

  const deleteMenuItemApiFn = useCallback(async (id: string) => {
    await deleteDishApi(id)
    await refreshDishesFromApi()
  }, [refreshDishesFromApi])

  const toggleItemStopApi = useCallback(async (id: string) => {
    const isStopped = stoppedItems.has(id)
    await updateDish(id, { is_active: isStopped })
    await refreshDishesFromApi()
  }, [stoppedItems, refreshDishesFromApi])

  const toggleItemStop = useCallback((id: string) => {
    setStoppedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  const toggleCategoryHidden = useCallback((id: string) => {
    setHiddenCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  const reorderMenuItems = useCallback((fromIndex: number, toIndex: number) => {
    setMenuItems(prev => {
      const result = [...prev]
      const [removed] = result.splice(fromIndex, 1)
      result.splice(toIndex, 0, removed)
      return result
    })
  }, [])

  const applyMenuLayout = useCallback((
    orderedCategoryIds: string[],
    orderedItems: { id: string; categoryId: string }[]
  ) => {
    setCategories(prev => {
      const byId = new Map(prev.map(c => [c.id, c]))
      return orderedCategoryIds
        .map(id => byId.get(id))
        .filter((c): c is Category => c !== undefined)
    })
    setMenuItems(prev => {
      const byId = new Map(prev.map(i => [i.id, i]))
      const reordered = orderedItems
        .map(({ id, categoryId }) => {
          const item = byId.get(id)
          return item ? { ...item, category_id: categoryId } : null
        })
        .filter((i): i is MenuItem => i !== null)

      const included = new Set(reordered.map(i => i.id))
      const rest = prev.filter(i => !included.has(i.id))
      return [...reordered, ...rest]
    })
  }, [])

  // Restaurant info operations
  const updateRestaurantInfo = useCallback((updates: Partial<RestaurantInfo>) => {
    setRestaurantInfo(prev => ({ ...prev, ...updates }))
  }, [])

  const loadRestaurantSettingsFromApi = useCallback(async () => {
    try {
      const data = await fetchRestaurantSettings()
      setRestaurantInfo((prev) => ({
        ...prev,
        name: data.restaurant_name?.trim() || prev.name,
        phone: data.restaurant_phone?.trim() || prev.phone,
        address: data.address?.trim() || prev.address,
        workingHours: data.working_hours?.trim() || prev.workingHours,
      }))
    } catch {
      /* keep defaults if settings endpoint is unavailable */
    }
  }, [])

  useEffect(() => {
    loadRestaurantSettingsFromApi()
  }, [loadRestaurantSettingsFromApi])

  return (
    <MenuContext.Provider
      value={{
        categories,
        menuItems,
        menuLoading,
        menuError,
        loadMenuFromApi,
        loadRestaurantSettingsFromApi,
        restaurantInfo,
        addCategory,
        updateCategory,
        deleteCategory,
        reorderCategories,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        createMenuItemApi,
        updateMenuItemApi,
        deleteMenuItemApi: deleteMenuItemApiFn,
        toggleItemStopApi,
        refreshDishesFromApi,
        toggleItemStop,
        toggleCategoryHidden,
        reorderMenuItems,
        applyMenuLayout,
        updateRestaurantInfo,
        stoppedItems,
        hiddenCategories,
      }}
    >
      {children}
    </MenuContext.Provider>
  )
}

export function useMenu() {
  const context = useContext(MenuContext)
  if (!context) {
    throw new Error('useMenu must be used within a MenuProvider')
  }
  return context
}
