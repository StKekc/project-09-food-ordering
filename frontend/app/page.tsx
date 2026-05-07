'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { CartProvider } from '@/lib/cart-context'
import { AppProvider, useApp } from '@/lib/app-context'
import { AuthPhoneScreen } from '@/components/screens/auth-phone'
import { AuthCodeScreen } from '@/components/screens/auth-code'
import { MenuScreen } from '@/components/screens/menu'
import { CartScreen } from '@/components/screens/cart'
import { OrderStatusScreen } from '@/components/screens/order-status'
import { ProfileScreen } from '@/components/screens/profile'

function AppContent() {
  const { currentScreen } = useApp()

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Responsive container - full width on desktop, constrained on mobile */}
      <div className="w-full max-w-3xl mx-auto min-h-screen bg-[#0a0a0a] relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="min-h-screen"
          >
            {currentScreen === 'auth-phone' && <AuthPhoneScreen />}
            {currentScreen === 'auth-code' && <AuthCodeScreen />}
            {currentScreen === 'menu' && <MenuScreen />}
            {currentScreen === 'cart' && <CartScreen />}
            {currentScreen === 'order-status' && <OrderStatusScreen />}
            {currentScreen === 'profile' && <ProfileScreen />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function MuchachoApp() {
  return (
    <AppProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </AppProvider>
  )
}
