'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Phone, ArrowRight } from 'lucide-react'
import { useApp } from '@/lib/app-context'
import Image from 'next/image'

const LOGO_URL = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Frame%201-nBWzNHylZcJCWzCqbYizfwUY2U52Tn.png'

export function AuthPhoneScreen() {
  const { setCurrentScreen, setPhone } = useApp()
  const [phoneValue, setPhoneValue] = useState('')
  const [error, setError] = useState('')

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (digits.length === 0) return ''
    if (digits.length <= 1) return `+7 (${digits}`
    if (digits.length <= 4) return `+7 (${digits.slice(1)}`
    if (digits.length <= 7) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4)}`
    if (digits.length <= 9) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const digits = value.replace(/\D/g, '')
    
    if (digits.length === 0) {
      setPhoneValue('')
      return
    }
    
    // Ensure it starts with 7
    let normalizedDigits = digits
    if (!digits.startsWith('7')) {
      normalizedDigits = '7' + digits
    }
    
    if (normalizedDigits.length <= 11) {
      setPhoneValue(formatPhone(normalizedDigits))
    }
    setError('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const digits = phoneValue.replace(/\D/g, '')
    
    if (digits.length !== 11) {
      setError('Введите корректный номер телефона')
      return
    }
    
    setPhone(phoneValue)
    setCurrentScreen('auth-code')
  }

  const isValid = phoneValue.replace(/\D/g, '').length === 11

  return (
    <div className="min-h-screen flex flex-col justify-center px-4 sm:px-6 py-8 sm:py-12 max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8 sm:mb-12"
      >
        <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-4 sm:mb-6 rounded-2xl overflow-hidden">
          <Image
            src={LOGO_URL}
            alt="MUCHACHO"
            width={128}
            height={128}
            className="w-full h-full object-cover"
          />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#D4AF37] mb-2">MUCHACHO</h1>
        <p className="text-sm sm:text-base text-[#a1a1aa]">Премиальная мексиканская кухня</p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        onSubmit={handleSubmit}
        className="space-y-4 sm:space-y-6"
      >
        <div>
          <label className="block text-xs sm:text-sm font-medium text-[#a1a1aa] mb-2">
            Номер телефона
          </label>
          <div className="relative">
            <Phone className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-[#666]" />
            <input
              type="tel"
              value={phoneValue}
              onChange={handleChange}
              placeholder="+7 (900) 000-00-00"
              className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 bg-[#1a1a1a] border border-[#333] rounded-xl text-white placeholder:text-[#555] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all text-base sm:text-lg"
            />
          </div>
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 text-xs sm:text-sm text-red-500"
            >
              {error}
            </motion.p>
          )}
        </div>

        <motion.button
          type="submit"
          disabled={!isValid}
          whileHover={{ scale: isValid ? 1.02 : 1 }}
          whileTap={{ scale: isValid ? 0.98 : 1 }}
          className={`w-full py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg flex items-center justify-center gap-2 transition-all ${
            isValid
              ? 'bg-[#D4AF37] text-black hover:bg-[#e5c760]'
              : 'bg-[#333] text-[#666] cursor-not-allowed'
          }`}
        >
          Получить код
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </motion.button>
      </motion.form>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="text-center text-[#666] text-xs sm:text-sm mt-6 sm:mt-8"
      >
        Нажимая кнопку, вы соглашаетесь с{' '}
        <span className="text-[#D4AF37]">условиями использования</span>
      </motion.p>
    </div>
  )
}
