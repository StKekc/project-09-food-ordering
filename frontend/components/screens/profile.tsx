'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, User, Calendar, Save, Mail, History, LogOut } from 'lucide-react'
import { useApp } from '@/lib/app-context'
import { useCart } from '@/lib/cart-context'
import {
  updateUserProfile,
  normalizePhoneForApi,
  birthdayToIso,
  mapUserResponseToSession,
} from '@/lib/users-api'

export function ProfileScreen() {
  const { setCurrentScreen, userProfile, setUserProfile, setUserId, setIsAdmin, phone, logout } = useApp()
  const { clearCart } = useCart()
  const [name, setName] = useState(userProfile.name)
  const [birthday, setBirthday] = useState(userProfile.birthday)
  const [email, setEmail] = useState(userProfile.email || '')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!phone) {
      setSaveError('Номер телефона не указан')
      return
    }

    setSaving(true)
    setSaveError(null)
    try {
      const user = await updateUserProfile({
        phone: normalizePhoneForApi(phone),
        name: name.trim() || null,
        email: email.trim() || null,
        birth_date: birthdayToIso(birthday),
      })
      const session = mapUserResponseToSession(user)
      setUserProfile(session.profile)
      setUserId(session.userId)
      setIsAdmin(session.isAdmin)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Не удалось сохранить профиль')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    clearCart()
    logout()
  }

  const formatPhoneDisplay = (phoneNumber: string) => {
    if (!phoneNumber) return '+7 (XXX) XXX-XX-XX'
    return phoneNumber
  }

  const formatBirthday = (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (digits.length === 0) return ''
    if (digits.length <= 2) return digits
    if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`
    return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4, 8)}`
  }

  const handleBirthdayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const digits = value.replace(/\D/g, '')
    if (digits.length <= 8) {
      setBirthday(formatBirthday(digits))
    }
  }

  return (
    <div className="min-h-screen flex flex-col px-4 sm:px-6 py-6 sm:py-8 pb-8 max-w-md mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8"
      >
        <button
          onClick={() => setCurrentScreen('menu')}
          className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-[#1a1a1a] rounded-lg border border-[#333] hover:border-[#D4AF37] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Профиль</h1>
      </motion.div>

      {/* Avatar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="flex justify-center mb-6 sm:mb-8"
      >
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#1a1a1a] rounded-full flex items-center justify-center border-2 border-[#D4AF37]">
          <User className="w-10 h-10 sm:w-12 sm:h-12 text-[#D4AF37]" />
        </div>
      </motion.div>

      {/* Phone (readonly) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-4 sm:mb-6"
      >
        <label className="block text-xs sm:text-sm text-[#a1a1aa] mb-2">Номер телефона</label>
        <div className="bg-[#1a1a1a] border border-[#333] rounded-lg sm:rounded-xl px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base text-[#666]">
          {formatPhoneDisplay(phone)}
        </div>
        <p className="text-[10px] sm:text-xs text-[#666] mt-1">Номер телефона нельзя изменить</p>
      </motion.div>

      {/* Name */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-4 sm:mb-6"
      >
        <label className="block text-xs sm:text-sm text-[#a1a1aa] mb-2">
          <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-2" />
          Ваше имя
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Введите имя"
          className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg sm:rounded-xl px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base text-white placeholder-[#666] focus:outline-none focus:border-[#D4AF37] transition-colors"
        />
      </motion.div>

      {/* Birthday */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-4 sm:mb-6"
      >
        <label className="block text-xs sm:text-sm text-[#a1a1aa] mb-2">
          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-2" />
          Дата рождения
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={birthday}
          onChange={handleBirthdayChange}
          placeholder="ДД.ММ.ГГГГ"
          className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg sm:rounded-xl px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base text-white placeholder-[#666] focus:outline-none focus:border-[#D4AF37] transition-colors"
        />
      </motion.div>

      {/* Email */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="mb-6 sm:mb-8"
      >
        <label className="block text-xs sm:text-sm text-[#a1a1aa] mb-2">
          <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-2" />
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@mail.com"
          className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg sm:rounded-xl px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base text-white placeholder-[#666] focus:outline-none focus:border-[#D4AF37] transition-colors"
        />
      </motion.div>

      {saveError && (
        <p className="text-sm text-red-400 mb-4">{saveError}</p>
      )}

      {/* Save Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-[#D4AF37] text-black py-3 sm:py-4 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base flex items-center justify-center gap-2 mb-3 sm:mb-4 disabled:opacity-50"
      >
        <Save className="w-4 h-4 sm:w-5 sm:h-5" />
        {saving ? 'Сохранение…' : saved ? 'Сохранено!' : 'Сохранить'}
      </motion.button>

      {/* Order History Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setCurrentScreen('order-history')}
        className="w-full bg-[#1a1a1a] text-white py-3 sm:py-4 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base border border-[#333] hover:border-[#D4AF37] transition-colors flex items-center justify-center gap-2 mb-3 sm:mb-4"
      >
        <History className="w-4 h-4 sm:w-5 sm:h-5" />
        История заказов
      </motion.button>

      {/* Back to Menu Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setCurrentScreen('menu')}
        className="w-full bg-[#1a1a1a] text-white py-3 sm:py-4 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base border border-[#333] hover:border-[#D4AF37] transition-colors"
      >
        Вернуться в меню
      </motion.button>

      <div className="flex-1 min-h-4" />

      {/* Logout Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleLogout}
        className="w-full bg-transparent text-red-400 py-3 sm:py-4 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base border border-red-400/40 hover:border-red-400 hover:bg-red-400/10 transition-colors flex items-center justify-center gap-2 mt-auto"
      >
        <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
        Выйти из аккаунта
      </motion.button>
    </div>
  )
}
