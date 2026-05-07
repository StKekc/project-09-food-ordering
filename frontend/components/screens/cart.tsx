'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Minus, Trash2, UtensilsCrossed, ShoppingBag, CreditCard } from 'lucide-react'
import { useApp, type OrderType } from '@/lib/app-context'
import { useCart } from '@/lib/cart-context'

export function CartScreen() {
  const { setCurrentScreen, orderType, setOrderType, setCurrentOrder } = useApp()
  const { items, updateQuantity, removeItem, clearCart, totalPrice } = useCart()

  const handleCheckout = () => {
    if (items.length === 0) return

    // Create order
    const order = {
      id: crypto.randomUUID(),
      items: items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      total: totalPrice,
      type: orderType,
      status: 'accepted' as const,
      orderNumber: Math.floor(Math.random() * 900) + 100,
    }

    setCurrentOrder(order)
    clearCart()
    setCurrentScreen('order-status')
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-10 bg-[#0a0a0a] border-b border-[#222] px-3 sm:px-4 py-3 sm:py-4"
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setCurrentScreen('menu')}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-[#1a1a1a] rounded-lg sm:rounded-xl border border-[#333] hover:border-[#D4AF37] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </motion.button>
          <h1 className="text-lg sm:text-xl font-bold text-white">Корзина</h1>
          {items.length > 0 && (
            <span className="ml-auto text-xs sm:text-sm text-[#a1a1aa]">
              {items.length} {items.length === 1 ? 'позиция' : items.length < 5 ? 'позиции' : 'позиций'}
            </span>
          )}
        </div>
      </motion.header>

      {/* Cart Items */}
      <main className="flex-1 px-3 sm:px-4 py-3 sm:py-4">
        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full py-16 sm:py-20"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#1a1a1a] rounded-full flex items-center justify-center mb-3 sm:mb-4">
              <ShoppingBag className="w-8 h-8 sm:w-10 sm:h-10 text-[#333]" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white mb-2">Корзина пуста</h2>
            <p className="text-[#666] text-center text-sm sm:text-base mb-4 sm:mb-6">
              Добавьте что-нибудь из меню
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentScreen('menu')}
              className="bg-[#D4AF37] text-black px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold text-sm sm:text-base"
            >
              Перейти в меню
            </motion.button>
          </motion.div>
        ) : (
          <AnimatePresence>
            <div className="space-y-2 sm:space-y-3">
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-[#1a1a1a] rounded-lg sm:rounded-xl p-3 sm:p-4 border border-[#252525]"
                >
                  <div className="flex gap-3 sm:gap-4">
                    {/* Item Image */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-[#252525] flex-shrink-0">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white text-sm sm:text-base truncate">{item.name}</h3>
                      {item.weight && (
                        <p className="text-xs sm:text-sm text-[#666]">{item.weight}</p>
                      )}
                      <p className="text-[#D4AF37] font-bold mt-1 text-sm sm:text-base">
                        {item.price * item.quantity} ₽
                      </p>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex flex-col items-end justify-between">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => removeItem(item.id)}
                        className="text-[#666] hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </motion.button>

                      <div className="flex items-center gap-1.5 sm:gap-2 bg-[#252525] rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-[#D4AF37]"
                        >
                          <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </motion.button>
                        <span className="w-4 sm:w-5 text-center font-semibold text-white text-xs sm:text-sm">
                          {item.quantity}
                        </span>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-[#D4AF37]"
                        >
                          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}

        {/* Order Type Selection */}
        {items.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 sm:mt-6"
          >
            <h3 className="text-xs sm:text-sm font-medium text-[#a1a1aa] mb-2 sm:mb-3">Способ получения</h3>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <OrderTypeButton
                type="dine-in"
                label="В зале"
                icon={<UtensilsCrossed className="w-4 h-4 sm:w-5 sm:h-5" />}
                isActive={orderType === 'dine-in'}
                onClick={() => setOrderType('dine-in')}
              />
              <OrderTypeButton
                type="takeaway"
                label="Навынос"
                icon={<ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />}
                isActive={orderType === 'takeaway'}
                onClick={() => setOrderType('takeaway')}
              />
            </div>
          </motion.div>
        )}
      </main>

      {/* Checkout Footer */}
      {items.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-0 bg-[#0a0a0a] border-t border-[#222] p-3 sm:p-4"
        >
          {/* Summary */}
          <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
            <div className="flex justify-between text-[#a1a1aa] text-sm sm:text-base">
              <span>Сумма заказа</span>
              <span>{totalPrice} ₽</span>
            </div>
            <div className="flex justify-between text-[#a1a1aa] text-sm sm:text-base">
              <span>Сервисный сбор</span>
              <span>0 ₽</span>
            </div>
            <div className="flex justify-between text-white text-base sm:text-lg font-bold pt-2 border-t border-[#222]">
              <span>Итого</span>
              <span className="text-[#D4AF37]">{totalPrice} ₽</span>
            </div>
          </div>

          {/* Checkout Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCheckout}
            className="w-full bg-[#D4AF37] text-black py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg flex items-center justify-center gap-2 shadow-lg shadow-[#D4AF37]/20"
          >
            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
            Оплатить {totalPrice} ₽
          </motion.button>
        </motion.div>
      )}
    </div>
  )
}

function OrderTypeButton({
  type,
  label,
  icon,
  isActive,
  onClick,
}: {
  type: OrderType
  label: string
  icon: React.ReactNode
  isActive: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 flex flex-col items-center gap-1.5 sm:gap-2 transition-all ${
        isActive
          ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]'
          : 'bg-[#1a1a1a] border-[#333] text-[#a1a1aa] hover:border-[#444]'
      }`}
    >
      {icon}
      <span className="font-medium text-sm sm:text-base">{label}</span>
    </motion.button>
  )
}
