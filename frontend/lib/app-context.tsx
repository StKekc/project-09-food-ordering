'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type Screen = 'auth-phone' | 'auth-code' | 'menu' | 'cart' | 'order-status' | 'profile' | 'order-history' | 'terms' | 'admin'
export type OrderType = 'dine-in' | 'takeaway'

interface Order {
  id: string
  items: Array<{ name: string; quantity: number; price: number }>
  total: number
  type: OrderType
  status: 'accepted' | 'preparing' | 'ready'
  orderNumber: number | string
  date?: string
}

export interface HistoryOrder extends Order {
  date: string
}

export interface UserProfile {
  name: string
  birthday: string
  email: string
  role: string
}

interface AppContextType {
  currentScreen: Screen
  setCurrentScreen: (screen: Screen) => void
  phone: string
  setPhone: (phone: string) => void
  isAuthenticated: boolean
  setIsAuthenticated: (value: boolean) => void
  orderType: OrderType
  setOrderType: (type: OrderType) => void
  currentOrder: Order | null
  setCurrentOrder: (order: Order | null) => void
  userProfile: UserProfile
  setUserProfile: (profile: UserProfile) => void
  userId: number | null
  setUserId: (id: number | null) => void
  orderHistory: HistoryOrder[]
  setOrderHistory: (orders: HistoryOrder[]) => void
  addToOrderHistory: (order: HistoryOrder) => void
  updateOrderStatusById: (orderId: string, status: Order['status']) => void
  isAdmin: boolean
  setIsAdmin: (value: boolean) => void
  adminPhones: string[]
  addAdminPhone: (phone: string) => void
  removeAdminPhone: (phone: string) => void
  isAdminUser: () => boolean
  logout: () => void
}

// Restaurant constants
export const RESTAURANT_PHONE = '+7(900) 110-20-03'
export const RESTAURANT_ADDRESS = 'Большой проспект П.С., 39'
export const RESTAURANT_COORDS = '59.960275,30.303612' // St. Petersburg coordinates

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentScreen, setCurrentScreen] = useState<Screen>('auth-phone')
  const [phone, setPhone] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [orderType, setOrderType] = useState<OrderType>('dine-in')
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '',
    birthday: '',
    email: '',
    role: 'user',
  })
  const [userId, setUserId] = useState<number | null>(null)
  const [orderHistory, setOrderHistoryState] = useState<HistoryOrder[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  // Default admin phone - can be extended via admin panel
  const [adminPhones, setAdminPhones] = useState<string[]>(['+7 (999) 999-99-99'])

  const setOrderHistory = useCallback((orders: HistoryOrder[]) => {
    setOrderHistoryState(orders)
  }, [])

  const addToOrderHistory = useCallback((order: HistoryOrder) => {
    setOrderHistoryState(prev => [order, ...prev])
  }, [])

  const updateOrderStatusById = useCallback((orderId: string, status: Order['status']) => {
    setCurrentOrder(prev => (prev?.id === orderId ? { ...prev, status } : prev))
    setOrderHistoryState(prev =>
      prev.map(order => (order.id === orderId ? { ...order, status } : order))
    )
  }, [])

  const addAdminPhone = useCallback((newPhone: string) => {
    setAdminPhones(prev => prev.includes(newPhone) ? prev : [...prev, newPhone])
  }, [])

  const removeAdminPhone = useCallback((phoneToRemove: string) => {
    // Don't allow removing the default admin phone
    if (phoneToRemove === '+7 (999) 999-99-99') return
    setAdminPhones(prev => prev.filter(p => p !== phoneToRemove))
  }, [])

  const isAdminUser = useCallback(() => {
    return userProfile.role === 'admin' || adminPhones.includes(phone)
  }, [adminPhones, phone, userProfile.role])

  const logout = useCallback(() => {
    setIsAuthenticated(false)
    setPhone('')
    setUserProfile({ name: '', birthday: '', email: '', role: 'user' })
    setUserId(null)
    setCurrentOrder(null)
    setOrderHistory([])
    setIsAdmin(false)
    setCurrentScreen('auth-phone')
  }, [])

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        setCurrentScreen,
        phone,
        setPhone,
        isAuthenticated,
        setIsAuthenticated,
        orderType,
        setOrderType,
        currentOrder,
        setCurrentOrder,
        userProfile,
        setUserProfile,
        userId,
        setUserId,
        orderHistory,
        setOrderHistory,
        addToOrderHistory,
        updateOrderStatusById,
        isAdmin,
        setIsAdmin,
        adminPhones,
        addAdminPhone,
        removeAdminPhone,
        isAdminUser,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
