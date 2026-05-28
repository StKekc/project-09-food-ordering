'use client'

import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useApp } from '@/lib/app-context'

export function TermsScreen() {
  const { setCurrentScreen } = useApp()

  return (
    <div className="min-h-screen flex flex-col px-4 sm:px-6 py-6 sm:py-8 max-w-2xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8"
      >
        <button
          onClick={() => setCurrentScreen('auth-phone')}
          className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-[#1a1a1a] rounded-lg border border-[#333] hover:border-[#D4AF37] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Условия использования</h1>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col items-center justify-center"
      >
        <div className="bg-[#1a1a1a] rounded-xl p-6 sm:p-8 border border-[#333] text-center max-w-md">
          <p className="text-[#a1a1aa] text-sm sm:text-base leading-relaxed">
            При использовании сервиса вы разрешаете продать вашу душу по среднерыночной стоимости
          </p>
        </div>
      </motion.div>

      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setCurrentScreen('auth-phone')}
        className="w-full bg-[#D4AF37] text-black py-3 sm:py-4 rounded-xl font-semibold text-sm sm:text-base mt-6"
      >
        Вернуться назад
      </motion.button>
    </div>
  )
}
