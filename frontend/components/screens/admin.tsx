'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  Edit3, 
  Trash2, 
  Equal,
  Plus, 
  X, 
  MoreVertical,
  StopCircle,
  EyeOff,
  Check,
  Image as ImageIcon,
  Upload,
  Users
} from 'lucide-react'
import { useApp } from '@/lib/app-context'
import { useMenu, type RestaurantInfo } from '@/lib/menu-context'
import type { MenuItem, Category } from '@/lib/data'
import {
  buildFlatList,
  flatToLayout,
  getDropPosition,
  reorderFlatList,
  type DropTarget,
} from '@/lib/admin-menu-dnd'
import { apiCategoryToCategory, parseWeightGrams } from '@/lib/dishes-api'
import { groupItemsByCategory } from '@/lib/menu-grouping'

type EditMode = 'none' | 'info' | 'category' | 'item' | 'admins'

interface ApiCategory {
  id: number
  name: string
}

type ItemFormData = Omit<Partial<MenuItem>, 'category_id'> & { category_id?: number }

interface EditingItem {
  type: 'category' | 'item'
  id: string | null // null for new items
  data: Partial<MenuItem | Category> | ItemFormData
}

const WEEKDAY_NAMES: Record<string, string> = {
  mon: 'Понедельник',
  tue: 'Вторник',
  wed: 'Среда',
  thu: 'Четверг',
  fri: 'Пятница',
  sat: 'Суббота',
  sun: 'Воскресенье'
}

const API_URL = process.env.NEXT_PUBLIC_API_URL

const DEFAULT_RESTAURANT_PHONE = '+79001102003'
const DEFAULT_RESTAURANT_ADDRESS = 'Большой проспект П.С., 39'
const RESTAURANT_NAME_FIXED = 'MUCHACHO'

function hasNonEmptySetting(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

const DISH_IMAGE_PLACEHOLDER =
  'https://habrastorage.org/r/w1560/getpro/habr/upload_files/cb0/f0b/c6f/cb0f0bc6f20ed4cb8b2d04e62efb4799.jpeg'

export function AdminScreen() {
  const { setCurrentScreen, setIsAdmin, adminPhones, addAdminPhone, removeAdminPhone } = useApp()
  const { 
    categories, 
    menuItems, 
    restaurantInfo,
    refreshDishesFromApi,
    loadMenuFromApi,
    toggleCategoryHidden,
    applyMenuLayout,
    updateRestaurantInfo,
    loadRestaurantSettingsFromApi,
    stoppedItems,
    hiddenCategories
  } = useMenu()

  const [editMode, setEditMode] = useState<EditMode>('none')
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [infoForm, setInfoForm] = useState<RestaurantInfo>(() => ({
    ...restaurantInfo,
    name: RESTAURANT_NAME_FIXED,
    phone: DEFAULT_RESTAURANT_PHONE,
    address: DEFAULT_RESTAURANT_ADDRESS,
  }))
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [newAdminPhone, setNewAdminPhone] = useState('')
  const [draggedItem, setDraggedItem] = useState<{ type: 'category' | 'item', id: string } | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [localCategories, setLocalCategories] = useState(categories)
  const [localMenuItems, setLocalMenuItems] = useState(menuItems)
  const [localAdminPhones, setLocalAdminPhones] = useState(adminPhones)
  const [localRestaurantInfo, setLocalRestaurantInfo] = useState(restaurantInfo)
  const [formCategories, setFormCategories] = useState<ApiCategory[]>([])

  const loadCategoriesFromApi = useCallback(async () => {
    if (!API_URL) return
    const res = await fetch(`${API_URL}/categories`)
    if (!res.ok) throw new Error('Failed to load categories')
    const cats = (await res.json()) as ApiCategory[]
    setFormCategories(cats)
    setLocalCategories(cats.map(apiCategoryToCategory))
  }, [])

  useEffect(() => {
    loadCategoriesFromApi().catch((err) =>
      console.error('Failed to fetch categories', err)
    )
  }, [loadCategoriesFromApi])

  useEffect(() => {
    if (formCategories.length === 0) return
    setEditingItem((prev) => {
      if (!prev || prev.type !== 'item' || prev.id) return prev
      const data = prev.data as ItemFormData
      if (data.category_id) return prev
      return { ...prev, data: { ...data, category_id: formCategories[0].id } }
    })
  }, [formCategories])

  // Sync from menu context only when it has loaded data (avoid wiping API categories with [])
  useEffect(() => {
    if (categories.length > 0) {
      setLocalCategories(categories)
      setFormCategories(
        categories.map((c) => ({ id: Number(c.id), name: c.name }))
      )
    }
  }, [categories])

  useEffect(() => {
    setLocalMenuItems(menuItems)
  }, [menuItems])

  useEffect(() => {
    setLocalAdminPhones(adminPhones)
  }, [adminPhones])

  useEffect(() => {
    setLocalRestaurantInfo(restaurantInfo)
  }, [restaurantInfo])

  useEffect(() => {
    refreshDishesFromApi().catch(() => {
      /* keep local menu if API is unavailable */
    })
  }, [refreshDishesFromApi])

  const groupedItems = groupItemsByCategory(localCategories, localMenuItems, {
    hideEmpty: false,
  })

  const handleBackToMenu = () => {
    setIsAdmin(false)
    setCurrentScreen('menu')
  }

  const handleEditInfo = () => {
    setInfoForm({
      ...localRestaurantInfo,
      name: RESTAURANT_NAME_FIXED,
      phone: hasNonEmptySetting(localRestaurantInfo.phone)
        ? localRestaurantInfo.phone.trim()
        : DEFAULT_RESTAURANT_PHONE,
      address: hasNonEmptySetting(localRestaurantInfo.address)
        ? localRestaurantInfo.address.trim()
        : DEFAULT_RESTAURANT_ADDRESS,
    })
    setActionError(null)
    setEditMode('info')
  }

  useEffect(() => {
    if (editMode !== 'info' || !API_URL) return

    const controller = new AbortController()

    ;(async () => {
      try {
        setActionError(null)
        const resp = await fetch(`${API_URL}/restaurant/settings`, {
          signal: controller.signal,
        })
        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}))
          const detail = errData?.detail
          throw new Error(
            typeof detail === 'string' ? detail : 'Не удалось загрузить настройки ресторана'
          )
        }
        const data = await resp.json()
        setInfoForm((prev) => ({
          ...prev,
          ...(hasNonEmptySetting(data.restaurant_phone)
            ? { phone: data.restaurant_phone.trim() }
            : {}),
          ...(hasNonEmptySetting(data.address)
            ? { address: data.address.trim() }
            : {}),
          ...(hasNonEmptySetting(data.working_hours)
            ? { workingHours: data.working_hours.trim() }
            : {}),
        }))
      } catch (err) {
        if (controller.signal.aborted) return
        setActionError(
          err instanceof Error ? err.message : 'Не удалось загрузить настройки ресторана'
        )
        console.error(err)
      }
    })()

    return () => controller.abort()
  }, [editMode])

  const resolveWorkingHoursForApi = (): string => {
    if (infoForm.sameHoursAllDays) {
      return infoForm.workingHours.trim()
    }
    const perDay = Object.values(infoForm.weekdayHours)
      .map((h) => h.trim())
      .filter(Boolean)
    return perDay.length > 0 ? perDay.join(', ') : infoForm.workingHours.trim()
  }

  const handleSaveInfo = async () => {
    if (!API_URL) {
      setActionError('NEXT_PUBLIC_API_URL не настроен')
      return
    }

    setSaving(true)
    setActionError(null)
    try {
      const resp = await fetch(`${API_URL}/restaurant/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_name: RESTAURANT_NAME_FIXED,
          restaurant_phone: infoForm.phone.trim(),
          address: infoForm.address.trim(),
          working_hours: resolveWorkingHoursForApi(),
        }),
      })
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}))
        const detail = errData?.detail
        throw new Error(
          typeof detail === 'string' ? detail : 'Ошибка сохранения настроек ресторана'
        )
      }
      const data = await resp.json()
      const updated: RestaurantInfo = {
        ...infoForm,
        name: RESTAURANT_NAME_FIXED,
        phone: hasNonEmptySetting(data.restaurant_phone)
          ? data.restaurant_phone.trim()
          : infoForm.phone,
        address: hasNonEmptySetting(data.address)
          ? data.address.trim()
          : infoForm.address,
        workingHours: hasNonEmptySetting(data.working_hours)
          ? data.working_hours.trim()
          : resolveWorkingHoursForApi(),
      }
      setInfoForm(updated)
      setLocalRestaurantInfo(updated)
      updateRestaurantInfo(updated)
      await loadRestaurantSettingsFromApi()
      setEditMode('none')
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Не удалось сохранить информацию'
      )
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // --- fetch-запросы для меню и категорий

  // КАТЕГОРИЯ: Добавить/Обновить/Удалить
  const handleMenuAction = async (
    action: 'edit' | 'stop' | 'hide' | 'delete',
    type: 'category' | 'item',
    id: string
  ) => {
    setActiveMenu(null)
    setActionError(null)

    if (action === 'edit') {
      if (type === 'category') {
        const category = localCategories.find(c => c.id === id)
        if (category) {
          setEditingItem({ type: 'category', id, data: { ...category } })
          setEditMode('category')
        }
      } else {
        const item = localMenuItems.find(i => i.id === id)
        if (item) {
          setEditingItem({
            type: 'item',
            id,
            data: {
              ...item,
              category_id: item.category_id
                ? Number(item.category_id)
                : formCategories[0]?.id,
            },
          })
          setSelectedImage(item.image_url)
          setEditMode('item')
        }
      }
      return
    }

    if (action === 'stop' && type === 'item') {
      try {
        const isStopped = stoppedItems.has(id)
        const resp = await fetch(`${API_URL}/dishes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: isStopped }),
        })
        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}))
          setActionError(errData?.detail || 'Ошибка стоп-листа')
          return
        }
        await refreshDishesFromApi()
      } catch (err) {
        setActionError('Не удалось изменить статус (stop)')
        console.error(err)
      }
      return
    }

    if (action === 'hide' && type === 'category') {
      toggleCategoryHidden(id)
      return
    }

    if (action === 'delete') {
      if (type === 'category') {
        // DELETE /categories/{id}
        try {
          const url = `${API_URL}/categories/${id}`
          const resp = await fetch(url, { method: 'DELETE' })
          if (resp.ok) {
            setLocalCategories(cats => cats.filter(cat => cat.id !== id))
          } else {
            const errData = await resp.json().catch(() => ({}))
            setActionError(errData?.detail || 'Ошибка удаления категории')
            console.error('Ошибка удаления категории', errData)
          }
        } catch (err) {
          setActionError('Не удалось удалить категорию')
          console.error(err)
        }
        return
      }
      // DELETE /dishes/{id}
      try {
        const resp = await fetch(`${API_URL}/dishes/${id}`, { method: 'DELETE' })
        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}))
          setActionError(errData?.detail || 'Ошибка удаления блюда')
          return
        }
        setLocalMenuItems((items) => items.filter((item) => item.id !== id))
        await refreshDishesFromApi()
      } catch (err) {
        setActionError('Не удалось удалить блюдо')
        console.error(err)
      }
    }
  }

  const handleAddCategory = () => {
    setEditingItem({
      type: 'category',
      id: null,
      data: { name: '' }
    })
    setEditMode('category')
  }

  const handleAddItem = () => {
    setEditingItem({
      type: 'item',
      id: null,
      data: {
        name: '',
        description: '',
        price: 0,
        calories: 0,
        proteins: 0,
        fats: 0,
        carbs: 0,
        dishNutrition: { calories: 0, proteins: 0, fats: 0, carbs: 0 },
        image_url: '',
        category_id:
          formCategories[0]?.id ??
          (localCategories[0] ? Number(localCategories[0].id) : undefined),
        weight: ''
      }
    })
    setSelectedImage(null)
    setEditMode('item')
  }

  const updateCategoryFormName = (name: string) => {
    setEditingItem((prev) =>
      prev && prev.type === 'category'
        ? { ...prev, data: { ...(prev.data as Partial<Category>), name } }
        : prev
    )
  }

  // --- POST/PUT для категории:
  const handleSaveCategory = async () => {
    if (!editingItem || editingItem.type !== 'category' || !API_URL) return
    const data = editingItem.data as Partial<Category>
    const categoryName = (data.name ?? '').trim()
    if (!categoryName) return

    setSaving(true)
    setActionError(null)
    try {
      const currentCategoryId = editingItem.id
      if (currentCategoryId) {
        const resp = await fetch(`${API_URL}/categories/${currentCategoryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: categoryName }),
        })
        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}))
          setActionError(errData?.detail || 'Ошибка обновления категории')
          return
        }
        await loadCategoriesFromApi()
        await loadMenuFromApi().catch(() => undefined)
        setEditMode('none')
        setEditingItem(null)
      } else {
        const resp = await fetch(`${API_URL}/categories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: categoryName }),
        })
        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}))
          setActionError(errData?.detail || 'Ошибка добавления категории')
          return
        }
        await loadCategoriesFromApi()
        await loadMenuFromApi().catch(() => undefined)
        setEditingItem({
          type: 'category',
          id: null,
          data: { name: '' },
        })
      }
    } catch (err) {
      setActionError('Не удалось сохранить категорию')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // --- POST/PUT для блюда:
  const handleSaveItem = async () => {
    if (!editingItem || editingItem.type !== 'item' || saving) return
    const data = editingItem.data as ItemFormData
    if (!data.category_id) {
      setActionError('Выберите раздел')
      return
    }

    const hasUploadedImage = Boolean(selectedImage || data.image_url)
    const imageUrl = hasUploadedImage
      ? (selectedImage || data.image_url)!
      : DISH_IMAGE_PLACEHOLDER

    setSaving(true)
    setActionError(null)
    try {
      if (editingItem.id) {
        const payload = {
          category_id: data.category_id,
          name: data.name || '',
          description: data.description || null,
          price: Number(data.price) || 0,
          nutrition_info: {
            calories: data.calories ?? 0,
            proteins: data.proteins ?? 0,
            fats: data.fats ?? 0,
            carbs: data.carbs ?? 0,
          },
          weight_grams: parseWeightGrams(data.weight),
          image_url: imageUrl,
          is_active: true,
        }
        const resp = await fetch(`${API_URL}/dishes/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}))
          setActionError(errData?.detail || 'Ошибка обновления блюда')
          return
        }
        await refreshDishesFromApi()
      } else {
        const payload = {
          name: data.name || '',
          description: data.description || '',
          price: Number(data.price) || 0,
          category_id: data.category_id,
          image_url: imageUrl,
        }
        const resp = await fetch(`${API_URL}/dishes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}))
          setActionError(errData?.detail || 'Ошибка добавления блюда')
          return
        }
        await refreshDishesFromApi()
      }
      setEditMode('none')
      setEditingItem(null)
      setSelectedImage(null)
    } catch (err) {
      setActionError('Не удалось сохранить блюдо')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setSelectedImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // --- FETCH запросы для админов
  const handleAddAdmin = async () => {
    if (!newAdminPhone.trim()) return
    setSaving(true)
    setActionError(null)
    try {
      const body = { phone: newAdminPhone.trim() }
      const resp = await fetch(`${API_URL}/make-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (resp.ok) {
        setLocalAdminPhones(phones => [...phones, newAdminPhone.trim()])
        setNewAdminPhone('')
      } else {
        const errData = await resp.json().catch(() => ({}))
        setActionError(errData?.detail || 'Ошибка добавления администратора')
        console.error('Ошибка make-admin', errData)
      }
    } catch (err) {
      setActionError('Не удалось добавить администратора')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveAdmin = async (phone: string) => {
    setSaving(true)
    setActionError(null)
    try {
      // POST /remove-admin или (PUT на user), тут POST /remove-admin
      const resp = await fetch(`${API_URL}/remove-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      })
      if (resp.ok) {
        setLocalAdminPhones(phones => phones.filter(p => p !== phone))
      } else {
        const errData = await resp.json().catch(() => ({}))
        setActionError(errData?.detail || 'Ошибка снятия прав администратора')
        console.error('Ошибка remove-admin', errData)
      }
    } catch (err) {
      setActionError('Не удалось снять права администратора')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const getDropHighlight = (kind: 'category' | 'item', id: string) => {
    if (!dropTarget || dropTarget.kind !== kind || dropTarget.id !== id) return ''
    return dropTarget.position === 'before'
      ? 'ring-2 ring-inset ring-[#D4AF37]'
      : 'ring-2 ring-inset ring-[#D4AF37]'
  }

  const handleDragStart = (
    e: React.DragEvent,
    type: 'category' | 'item',
    id: string
  ) => {
    e.stopPropagation()
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
    setDraggedItem({ type, id })
  }

  const handleDragOver = (
    e: React.DragEvent,
    kind: 'category' | 'item',
    id: string
  ) => {
    e.preventDefault()
    e.stopPropagation()
    if (!draggedItem) return
    if (draggedItem.type === 'category' && kind === 'item') return
    if (draggedItem.type === kind && draggedItem.id === id) return

    e.dataTransfer.dropEffect = 'move'
    setDropTarget({ kind, id, position: getDropPosition(e) })
  }

  const handleDrop = (
    e: React.DragEvent,
    kind: 'category' | 'item',
    id: string
  ) => {
    e.preventDefault()
    e.stopPropagation()
    if (!draggedItem) return
    if (draggedItem.type === 'category' && kind === 'item') return

    const target: DropTarget = {
      kind,
      id,
      position: getDropPosition(e),
    }

    const flat = buildFlatList(groupedItems)
    const reordered = reorderFlatList(flat, draggedItem, target)
    const layout = flatToLayout(reordered, localCategories, localMenuItems)
    applyMenuLayout(layout.orderedCategoryIds, layout.orderedItems)

    setDraggedItem(null)
    setDropTarget(null)
  }

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null)
    setDropTarget(null)
  }, [])

  // Render admins edit screen
  if (editMode === 'admins') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setEditMode('none')}
              className="w-10 h-10 flex items-center justify-center bg-[#1a1a1a] rounded-lg border border-[#333]"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-xl font-bold text-white">Редактировать администраторов</h1>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#a1a1aa] mb-2">Добавить администратора</label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={newAdminPhone}
                  onChange={(e) => setNewAdminPhone(e.target.value)}
                  placeholder="+7 (XXX) XXX-XX-XX"
                  className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]"
                  disabled={saving}
                />
                <button
                  onClick={handleAddAdmin}
                  className="bg-[#D4AF37] text-black px-4 rounded-xl font-semibold"
                  disabled={saving}
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              {actionError && <p className="text-red-400 text-sm mt-2">{actionError}</p>}
            </div>

            <div>
              <label className="block text-sm text-[#a1a1aa] mb-2">Список администраторов</label>
              <div className="space-y-2">
                {localAdminPhones.map((phone, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3"
                  >
                    <span className="text-white">{phone}</span>
                    {phone !== '+7 (999) 999-99-99' && (
                      <button
                        onClick={() => handleRemoveAdmin(phone)}
                        className="text-red-400 hover:text-red-300"
                        disabled={saving}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Render edit info form
  if (editMode === 'info') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] px-4 py-6 pb-24">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setEditMode('none')}
              className="w-10 h-10 flex items-center justify-center bg-[#1a1a1a] rounded-lg border border-[#333]"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-xl font-bold text-white">Редактировать информацию</h1>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#a1a1aa] mb-2">Телефон</label>
              <input
                type="tel"
                value={infoForm.phone}
                onChange={(e) => setInfoForm({ ...infoForm, phone: e.target.value })}
                placeholder="+7(XXX) XXX-XX-XX"
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#a1a1aa] mb-2">Адрес</label>
              <input
                type="text"
                value={infoForm.address}
                onChange={(e) => setInfoForm({ ...infoForm, address: e.target.value })}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            
            {/* Working hours section */}
            <div className="pt-4 border-t border-[#333]">
              <div className="flex items-center gap-3 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={infoForm.sameHoursAllDays}
                    onChange={(e) => setInfoForm({ ...infoForm, sameHoursAllDays: e.target.checked })}
                    className="w-5 h-5 rounded border-[#333] bg-[#1a1a1a] text-[#D4AF37] focus:ring-[#D4AF37] focus:ring-offset-0"
                  />
                  <span className="text-white text-sm">Одинаковые часы работы все дни недели</span>
                </label>
              </div>
              
              {infoForm.sameHoursAllDays ? (
                <div>
                  <label className="block text-sm text-[#a1a1aa] mb-2">Часы работы</label>
                  <input
                    type="text"
                    value={infoForm.workingHours}
                    onChange={(e) => setInfoForm({ ...infoForm, workingHours: e.target.value })}
                    placeholder="12:00 - 23:00"
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-sm text-[#a1a1aa] mb-2">Часы работы по дням</label>
                  {Object.entries(WEEKDAY_NAMES).map(([key, name]) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className="w-28 text-sm text-[#a1a1aa]">{name}</span>
                      <input
                        type="text"
                        value={infoForm.weekdayHours[key as keyof typeof infoForm.weekdayHours]}
                        onChange={(e) => setInfoForm({ 
                          ...infoForm, 
                          weekdayHours: { 
                            ...infoForm.weekdayHours, 
                            [key]: e.target.value 
                          } 
                        })}
                        placeholder="12:00 - 23:00"
                        className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {actionError && (
            <p className="mt-4 text-sm text-red-400">{actionError}</p>
          )}

          <button
            onClick={handleSaveInfo}
            disabled={saving}
            className="w-full mt-6 bg-[#D4AF37] text-black py-4 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-5 h-5" />
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </div>
    )
  }

  // Render edit category form
  if (editMode === 'category' && editingItem) {
    const categoryForm = editingItem.data as Partial<Category>
    const categoryName = categoryForm.name ?? ''
    return (
      <div className="min-h-screen bg-[#0a0a0a] px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => { setEditMode('none'); setEditingItem(null) }}
              className="w-10 h-10 flex items-center justify-center bg-[#1a1a1a] rounded-lg border border-[#333]"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-xl font-bold text-white">
              {editingItem.id ? 'Редактировать категорию' : 'Новая категория'}
            </h1>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#a1a1aa] mb-2">Название категории *</label>
              <input
                type="text"
                value={categoryName}
                onChange={(e) => updateCategoryFormName(e.target.value)}
                disabled={saving}
                autoComplete="off"
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] disabled:opacity-50"
                placeholder="Например: Десерты"
              />
            </div>
          </div>

          {actionError && (
            <p className="mt-4 text-sm text-red-400">{actionError}</p>
          )}

          <button
            onClick={handleSaveCategory}
            disabled={!categoryName.trim() || saving}
            className="w-full mt-6 bg-[#D4AF37] text-black py-4 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-5 h-5" />
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </div>
    )
  }

  // Render edit item form
  if (editMode === 'item' && editingItem) {
    const data = editingItem.data as ItemFormData
    return (
      <div className="min-h-screen bg-[#0a0a0a] px-4 py-6 pb-24">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setEditMode('none'); setEditingItem(null); setSelectedImage(null) }}
                className="w-10 h-10 flex items-center justify-center bg-[#1a1a1a] rounded-lg border border-[#333]"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <h1 className="text-xl font-bold text-white">
                {editingItem.id ? 'Редактировать блюдо' : 'Новое блюдо'}
              </h1>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#a1a1aa] mb-2">Название *</label>
              <input
                type="text"
                value={data.name || ''}
                onChange={(e) => setEditingItem({ ...editingItem, data: { ...data, name: e.target.value } })}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-sm text-[#a1a1aa] mb-2">Описание</label>
              <textarea
                value={data.description || ''}
                onChange={(e) => setEditingItem({ ...editingItem, data: { ...data, description: e.target.value } })}
                rows={3}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#a1a1aa] mb-2">Размер порции</label>
                <input
                  type="text"
                  value={data.weight || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, data: { ...data, weight: e.target.value } })}
                  placeholder="250г"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div>
                <label className="block text-sm text-[#a1a1aa] mb-2">Стоимость, руб. *</label>
                <input
                  type="number"
                  value={data.price || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, data: { ...data, price: Number(e.target.value) } })}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-[#a1a1aa] mb-2">Раздел *</label>
              <select
                value={data.category_id ?? ''}
                onChange={(e) =>
                  setEditingItem({
                    ...editingItem,
                    data: { ...data, category_id: Number(e.target.value) },
                  })
                }
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="" disabled>
                  {formCategories.length === 0 ? 'Загрузка…' : 'Выберите раздел'}
                </option>
                {formCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-4 border-t border-[#333]">
              <h3 className="text-white font-semibold mb-4">Пищевая ценность на 100г</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#a1a1aa] mb-2">Энергетическая ценность, кКал</label>
                  <input
                    type="number"
                    value={data.calories || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, data: { ...data, calories: Number(e.target.value) } })}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#a1a1aa] mb-2">Белки, грамм</label>
                  <input
                    type="number"
                    value={data.proteins || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, data: { ...data, proteins: Number(e.target.value) } })}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#a1a1aa] mb-2">Жиры, грамм</label>
                  <input
                    type="number"
                    value={data.fats || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, data: { ...data, fats: Number(e.target.value) } })}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#a1a1aa] mb-2">Углеводы, грамм</label>
                  <input
                    type="number"
                    value={data.carbs || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, data: { ...data, carbs: Number(e.target.value) } })}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#333]">
              <h3 className="text-white font-semibold mb-4">Фотография</h3>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              
              {selectedImage ? (
                <div className="relative">
                  <img
                    src={selectedImage}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-xl"
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 bg-[#D4AF37] text-black py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Изменить фото
                    </button>
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="flex-1 bg-red-500/20 text-red-400 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Удалить фото
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-48 border-2 border-dashed border-[#333] rounded-xl flex flex-col items-center justify-center text-[#666] hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors"
                >
                  <ImageIcon className="w-12 h-12 mb-2" />
                  <span>Нажмите для загрузки</span>
                </button>
              )}
            </div>
          </div>

          {actionError && (
            <p className="mt-4 text-sm text-red-400">{actionError}</p>
          )}

          <button
            onClick={handleSaveItem}
            disabled={!data.name || !data.price || !data.category_id || saving}
            className="w-full mt-6 bg-[#D4AF37] text-black py-4 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-5 h-5" />
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </div>
    )
  }

  // Main admin view
  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0a0a0a] border-b border-[#222] px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackToMenu}
              className="w-10 h-10 flex items-center justify-center bg-[#1a1a1a] rounded-lg border border-[#333] hover:border-[#D4AF37] transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">{localRestaurantInfo.name}</h1>
              <p className="text-xs text-[#666]">{localRestaurantInfo.workingHours} | {localRestaurantInfo.address}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        <button
          onClick={handleEditInfo}
          className="w-full bg-[#D4AF37] text-black py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
        >
          <Edit3 className="w-4 h-4" />
          Редактировать информацию
        </button>
        <button
          onClick={() => setEditMode('admins')}
          className="w-full bg-[#1a1a1a] border border-[#333] text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:border-[#D4AF37] transition-colors"
        >
          <Users className="w-4 h-4" />
          Редактировать администраторов
        </button>
      </div>

      {/* Menu List */}
      <div className="max-w-2xl mx-auto px-4">
        {actionError && (
          <p className="mb-3 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2">
            {actionError}
          </p>
        )}
        {groupedItems.map((group) => (
          <div key={group.category.id} className="mb-4">
            {/* Category Header */}
            <div
              className={`flex items-center justify-between bg-[#1a1a1a] rounded-xl px-4 py-3 mb-2 ${getDropHighlight('category', group.category.id)} ${
                draggedItem?.type === 'category' && draggedItem.id === group.category.id ? 'opacity-40' : ''
              }`}
              onDragOver={(e) => handleDragOver(e, 'category', group.category.id)}
              onDrop={(e) => handleDrop(e, 'category', group.category.id)}
            >
              <span className={`font-semibold text-white ${hiddenCategories.has(group.category.id) ? 'opacity-50' : ''}`}>
                {group.category.name}
                {hiddenCategories.has(group.category.id) && (
                  <span className="ml-2 text-xs bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded">СКРЫТ</span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <div className="relative z-[60]">
                  <button
                    onClick={() => setActiveMenu(activeMenu === `cat-${group.category.id}` ? null : `cat-${group.category.id}`)}
                    className="w-8 h-8 flex items-center justify-center text-[#666] hover:text-white"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  <AnimatePresence>
                    {activeMenu === `cat-${group.category.id}` && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute right-0 top-10 z-[60] bg-[#1a1a1a] border border-[#333] rounded-xl shadow-xl overflow-hidden min-w-[200px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleMenuAction('edit', 'category', group.category.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-[#252525] text-left"
                        >
                          <Edit3 className="w-4 h-4" />
                          Редактировать
                        </button>
                        <button
                          onClick={() => handleMenuAction('hide', 'category', group.category.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-yellow-400 hover:bg-[#252525] text-left"
                        >
                          <EyeOff className="w-4 h-4" />
                          {hiddenCategories.has(group.category.id) ? 'Показать раздел' : 'Скрыть раздел'}
                        </button>
                        <button
                          onClick={() => handleMenuAction('delete', 'category', group.category.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-[#252525] text-left"
                        >
                          <Trash2 className="w-4 h-4" />
                          Удалить
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'category', group.category.id)}
                  onDragEnd={handleDragEnd}
                  className="w-8 h-8 flex items-center justify-center text-[#666] cursor-grab active:cursor-grabbing touch-none"
                >
                  <Equal className="w-5 h-5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Items in Category */}
            {group.items.map((item) => (
              <div
                key={item.id}
                onDragOver={(e) => handleDragOver(e, 'item', item.id)}
                onDrop={(e) => handleDrop(e, 'item', item.id)}
                className={`flex items-center justify-between rounded-xl px-4 py-3 mb-2 ${
                  stoppedItems.has(item.id) ? 'bg-[#e5dfd0]' : 'bg-[#FFF8E7]'
                } ${getDropHighlight('item', item.id)} ${
                  draggedItem?.type === 'item' && draggedItem.id === item.id ? 'opacity-40' : ''
                }`}
              >
                <div className={`flex-1 ${stoppedItems.has(item.id) ? 'opacity-50' : ''}`}>
                  <span className="font-medium text-black">{item.name}</span>
                  {stoppedItems.has(item.id) && (
                    <span className="ml-2 text-xs bg-red-500/20 text-red-600 px-2 py-0.5 rounded">СТОП</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-black font-semibold ${stoppedItems.has(item.id) ? 'opacity-50' : ''}`}>{item.price} P</span>
                  <div className="relative z-[60]">
                    <button
                      onClick={() => setActiveMenu(activeMenu === `item-${item.id}` ? null : `item-${item.id}`)}
                      className="w-8 h-8 flex items-center justify-center text-[#999] hover:text-black"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    <AnimatePresence>
                      {activeMenu === `item-${item.id}` && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute right-0 top-10 z-[60] bg-[#1a1a1a] border border-[#333] rounded-xl shadow-xl overflow-hidden min-w-[200px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="px-4 py-2 border-b border-[#333]">
                            <span className="text-white font-medium text-sm">{item.name}</span>
                          </div>
                          <button
                            onClick={() => handleMenuAction('edit', 'item', item.id)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-[#252525] text-left"
                          >
                            <Edit3 className="w-4 h-4" />
                            Редактировать позицию
                          </button>
                          <button
                            onClick={() => handleMenuAction('stop', 'item', item.id)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-yellow-400 hover:bg-[#252525] text-left"
                          >
                            <StopCircle className="w-4 h-4" />
                            {stoppedItems.has(item.id) ? 'Снять со стопа' : 'Поставить на стоп'}
                          </button>
                          <button
                            onClick={() => handleMenuAction('delete', 'item', item.id)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-[#252525] text-left"
                          >
                            <Trash2 className="w-4 h-4" />
                            Удалить позицию
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'item', item.id)}
                    onDragEnd={handleDragEnd}
                    className="w-8 h-8 flex items-center justify-center text-[#999] cursor-grab active:cursor-grabbing touch-none"
                  >
                    <Equal className="w-5 h-5 pointer-events-none" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Add Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleAddCategory}
            className="flex-1 bg-[#1a1a1a] border border-[#D4AF37] text-[#D4AF37] py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Добавить подраздел
          </button>
          <button
            onClick={handleAddItem}
            className="flex-1 bg-[#D4AF37] text-black py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Добавить позицию
          </button>
        </div>
      </div>

      {/* Click outside to close menu */}
      {activeMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setActiveMenu(null)}
        />
      )}
    </div>
  )
}
