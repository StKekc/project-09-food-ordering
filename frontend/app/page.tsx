'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Settings } from 'lucide-react'
import { CartProvider } from '@/lib/cart-context'
import { AppProvider, useApp } from '@/lib/app-context'
import { MenuProvider } from '@/lib/menu-context'
import { AuthPhoneScreen } from '@/components/screens/auth-phone'
import { AuthCodeScreen } from '@/components/screens/auth-code'
import { MenuScreen } from '@/components/screens/menu'
import { CartScreen } from '@/components/screens/cart'
import { OrderStatusScreen } from '@/components/screens/order-status'
import { ProfileScreen } from '@/components/screens/profile'
import { OrderHistoryScreen } from '@/components/screens/order-history'
import { TermsScreen } from '@/components/screens/terms'
import { AdminScreen } from '@/components/screens/admin'

function AppContent() {
  const { currentScreen, setCurrentScreen, setIsAdmin, isAuthenticated, isAdminUser } = useApp()

  const handleAdminClick = () => {
    setIsAdmin(true)
    setCurrentScreen('admin')
  }

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
            {currentScreen === 'order-history' && <OrderHistoryScreen />}
            {currentScreen === 'terms' && <TermsScreen />}
            {currentScreen === 'admin' && <AdminScreen />}
          </motion.div>
        </AnimatePresence>

        {/* Admin Button - Floating gear icon in bottom left, only for admin users */}
        {isAuthenticated && isAdminUser() && currentScreen !== 'admin' && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleAdminClick}
            className="fixed bottom-4 left-4 w-12 h-12 bg-[#1a1a1a] border border-[#333] rounded-full flex items-center justify-center text-[#666] hover:text-[#D4AF37] hover:border-[#D4AF37] transition-colors shadow-lg z-50"
          >
            <Settings className="w-5 h-5" />
          </motion.button>
        )}
      </div>
    </div>
  )
}

export default function MuchachoApp() {
  return (
    <AppProvider>
      <CartProvider>
        <MenuProvider>
          <AppContent />
        </MenuProvider>
      </CartProvider>
    </AppProvider>
  )
}
