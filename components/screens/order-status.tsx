'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Check, Clock, ChefHat, PartyPopper, Home, UtensilsCrossed, ShoppingBag } from 'lucide-react'
import { useApp } from '@/lib/app-context'

type OrderStatus = 'accepted' | 'preparing' | 'ready'

const statusConfig = {
  accepted: {
    title: 'Заказ принят',
    description: 'Мы получили ваш заказ и уже передаём его на кухню',
    icon: Clock,
    color: '#D4AF37',
  },
  preparing: {
    title: 'Готовится',
    description: 'Кухня уже занимается приготовлением вашего заказа',
    icon: ChefHat,
    color: '#D4AF37',
  },
  ready: {
    title: 'Готов!',
    description: 'Ваш заказ готов к получению',
    icon: PartyPopper,
    color: '#22c55e',
  },
}

export function OrderStatusScreen() {
  const { currentOrder, setCurrentScreen, setCurrentOrder } = useApp()
  const [status, setStatus] = useState<OrderStatus>(currentOrder?.status || 'accepted')

  // Simulate order progress
  useEffect(() => {
    if (status === 'accepted') {
      const timer = setTimeout(() => setStatus('preparing'), 5000)
      return () => clearTimeout(timer)
    }
    if (status === 'preparing') {
      const timer = setTimeout(() => setStatus('ready'), 10000)
      return () => clearTimeout(timer)
    }
  }, [status])

  const handleNewOrder = () => {
    setCurrentOrder(null)
    setCurrentScreen('menu')
  }

  if (!currentOrder) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[#666]">Нет активного заказа</p>
      </div>
    )
  }

  const currentConfig = statusConfig[status]
  const StatusIcon = currentConfig.icon

  return (
    <div className="min-h-screen flex flex-col px-4 sm:px-6 py-8 sm:py-12 max-w-lg mx-auto">
      {/* Order Number */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6 sm:mb-8"
      >
        <p className="text-[#a1a1aa] text-xs sm:text-sm mb-1">Номер заказа</p>
        <p className="text-3xl sm:text-4xl font-bold text-[#D4AF37]">#{currentOrder.orderNumber}</p>
      </motion.div>

      {/* Status Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        className="flex justify-center mb-6 sm:mb-8"
      >
        <div
          className="w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${currentConfig.color}20` }}
        >
          <motion.div
            animate={{ rotate: status === 'preparing' ? 360 : 0 }}
            transition={{ duration: 2, repeat: status === 'preparing' ? Infinity : 0, ease: 'linear' }}
          >
            <StatusIcon
              className="w-12 h-12 sm:w-16 sm:h-16"
              style={{ color: currentConfig.color }}
            />
          </motion.div>
        </div>
      </motion.div>

      {/* Status Text */}
      <motion.div
        key={status}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center mb-6 sm:mb-8"
      >
        <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">{currentConfig.title}</h1>
        <p className="text-sm sm:text-base text-[#a1a1aa]">{currentConfig.description}</p>
      </motion.div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-1 sm:gap-2 mb-8 sm:mb-12">
        <ProgressStep
          label="Принят"
          isActive={status === 'accepted'}
          isCompleted={status === 'preparing' || status === 'ready'}
        />
        <ProgressLine isActive={status === 'preparing' || status === 'ready'} />
        <ProgressStep
          label="Готовится"
          isActive={status === 'preparing'}
          isCompleted={status === 'ready'}
        />
        <ProgressLine isActive={status === 'ready'} />
        <ProgressStep
          label="Готов"
          isActive={status === 'ready'}
          isCompleted={false}
        />
      </div>

      {/* Order Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-[#1a1a1a] rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6"
      >
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          {currentOrder.type === 'dine-in' ? (
            <UtensilsCrossed className="w-4 h-4 sm:w-5 sm:h-5 text-[#D4AF37]" />
          ) : (
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-[#D4AF37]" />
          )}
          <span className="text-white font-medium text-sm sm:text-base">
            {currentOrder.type === 'dine-in' ? 'В зале' : 'Навынос'}
          </span>
        </div>
        
        <div className="space-y-1.5 sm:space-y-2 mb-2 sm:mb-3">
          {currentOrder.items.map((item, index) => (
            <div key={index} className="flex justify-between text-xs sm:text-sm">
              <span className="text-[#a1a1aa]">
                {item.name} x {item.quantity}
              </span>
              <span className="text-white">{item.price * item.quantity} ₽</span>
            </div>
          ))}
        </div>
        
        <div className="flex justify-between pt-2 sm:pt-3 border-t border-[#333]">
          <span className="font-medium text-white text-sm sm:text-base">Итого</span>
          <span className="font-bold text-[#D4AF37] text-sm sm:text-base">{currentOrder.total} ₽</span>
        </div>
      </motion.div>

      {/* Action Button */}
      <div className="mt-auto">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleNewOrder}
          className={`w-full py-3 sm:py-4 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base flex items-center justify-center gap-2 ${
            status === 'ready'
              ? 'bg-[#D4AF37] text-black'
              : 'bg-[#1a1a1a] text-[#a1a1aa] border border-[#333]'
          }`}
        >
          <Home className="w-4 h-4 sm:w-5 sm:h-5" />
          Вернуться в меню
        </motion.button>
      </div>
    </div>
  )
}

function ProgressStep({
  label,
  isActive,
  isCompleted,
}: {
  label: string
  isActive: boolean
  isCompleted: boolean
}) {
  return (
    <div className="flex flex-col items-center">
      <motion.div
        initial={false}
        animate={{
          backgroundColor: isActive || isCompleted ? '#D4AF37' : '#333',
          scale: isActive ? 1.1 : 1,
        }}
        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mb-1.5 sm:mb-2"
      >
        {isCompleted ? (
          <Check className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
        ) : (
          <div
            className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
              isActive ? 'bg-black' : 'bg-[#666]'
            }`}
          />
        )}
      </motion.div>
      <span
        className={`text-[10px] sm:text-xs ${
          isActive || isCompleted ? 'text-[#D4AF37]' : 'text-[#666]'
        }`}
      >
        {label}
      </span>
    </div>
  )
}

function ProgressLine({ isActive }: { isActive: boolean }) {
  return (
    <motion.div
      initial={false}
      animate={{ backgroundColor: isActive ? '#D4AF37' : '#333' }}
      className="w-8 sm:w-12 h-0.5 sm:h-1 rounded-full -mt-5 sm:-mt-6"
    />
  )
}
