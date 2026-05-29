'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Clock, ShoppingBag } from 'lucide-react'
import { useApp } from '@/lib/app-context'
import { fetchOrderHistory } from '@/lib/users-api'

export function OrderHistoryScreen() {
  const { setCurrentScreen, phone, orderHistory, setOrderHistory } = useApp()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!phone) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchOrderHistory(phone)
      .then(data => {
        if (!cancelled) setOrderHistory(data)
      })
      .catch(err => {
        if (!cancelled) {
          setOrderHistory([])
          setError(err instanceof Error ? err.message : 'Не удалось загрузить историю')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [phone, setOrderHistory])

  return (
    <div className="min-h-screen flex flex-col px-4 sm:px-6 py-6 sm:py-8 max-w-md mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8"
      >
        <button
          onClick={() => setCurrentScreen('profile')}
          className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-[#1a1a1a] rounded-lg border border-[#333] hover:border-[#D4AF37] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-white">История заказов</h1>
      </motion.div>

      {loading && (
        <p className="text-center text-[#a1a1aa] py-12">Загрузка…</p>
      )}

      {!loading && error && (
        <p className="text-center text-red-400 py-12 px-4">{error}</p>
      )}

      {!loading && !error && orderHistory.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col items-center justify-center text-center py-12"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#1a1a1a] rounded-full flex items-center justify-center mb-4">
            <ShoppingBag className="w-8 h-8 sm:w-10 sm:h-10 text-[#666]" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">Заказов пока нет</h2>
          <p className="text-sm sm:text-base text-[#666]">Ваши заказы будут отображаться здесь</p>
        </motion.div>
      )}

      {!loading && !error && orderHistory.length > 0 && (
        <div className="space-y-3 sm:space-y-4">
          {orderHistory.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-[#1a1a1a] rounded-xl p-4 border border-[#333]"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[#D4AF37] font-bold">#{order.orderNumber}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    order.status === 'ready'
                      ? 'bg-green-500/20 text-green-400'
                      : order.status === 'preparing'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {order.status === 'ready' ? 'Готов' : order.status === 'preparing' ? 'Готовится' : 'Принят'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[#666] text-sm">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{order.date}</span>
                </div>
              </div>

              <div className="space-y-1 mb-3">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-[#a1a1aa]">{item.name} x{item.quantity}</span>
                    <span className="text-white">{item.price * item.quantity} ₽</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-[#333]">
                <span className="text-sm text-[#666]">
                  {order.type === 'dine-in' ? 'В зале' : 'С собой'}
                </span>
                <span className="text-[#D4AF37] font-bold">{order.total} ₽</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
