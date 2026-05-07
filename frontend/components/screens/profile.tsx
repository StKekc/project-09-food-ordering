'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, User, Calendar, Save } from 'lucide-react'
import { useApp } from '@/lib/app-context'

const normalizeBirthdayForDisplay = (value: string) => {
  if (!value) return ''

  // Convert old ISO value from date input to dd/mm/yyyy.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-')
    return `${day}/${month}/${year}`
  }

  return value
}

const formatBirthdayInput = (value: string) => {
  const digitsOnly = value.replace(/\D/g, '').slice(0, 8)
  const day = digitsOnly.slice(0, 2)
  const month = digitsOnly.slice(2, 4)
  const year = digitsOnly.slice(4, 8)

  if (digitsOnly.length <= 2) return day
  if (digitsOnly.length <= 4) return `${day}/${month}`

  return `${day}/${month}/${year}`
}

export function ProfileScreen() {
  const { setCurrentScreen, userProfile, setUserProfile, phone } = useApp()
  const [name, setName] = useState(userProfile.name)
  const [birthday, setBirthday] = useState(normalizeBirthdayForDisplay(userProfile.birthday))
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setUserProfile({ name, birthday })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const formatPhoneDisplay = (phoneNumber: string) => {
    if (!phoneNumber) return '+7 (XXX) XXX-XX-XX'
    return phoneNumber
  }

  return (
    <div className="min-h-screen flex flex-col px-4 sm:px-6 py-6 sm:py-8 max-w-md mx-auto">
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
        className="mb-6 sm:mb-8"
      >
        <label className="block text-xs sm:text-sm text-[#a1a1aa] mb-2">
          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-2" />
          Дата рождения
        </label>
        <input
          type="text"
          value={birthday}
          onChange={(e) => setBirthday(formatBirthdayInput(e.target.value))}
          placeholder="дд/мм/гггг"
          inputMode="numeric"
          maxLength={10}
          className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg sm:rounded-xl px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base text-white placeholder-[#666] focus:outline-none focus:border-[#D4AF37] transition-colors"
        />
      </motion.div>

      {/* Save Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSave}
        className="w-full bg-[#D4AF37] text-black py-3 sm:py-4 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base flex items-center justify-center gap-2 mb-3 sm:mb-4"
      >
        <Save className="w-4 h-4 sm:w-5 sm:h-5" />
        {saved ? 'Сохранено!' : 'Сохранить'}
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
    </div>
  )
}
