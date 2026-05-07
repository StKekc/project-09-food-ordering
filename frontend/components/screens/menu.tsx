'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, MapPin, Phone, Plus, Minus, ChevronRight, ChevronLeft, ShoppingBag, X } from 'lucide-react'
import { useApp, RESTAURANT_PHONE, RESTAURANT_ADDRESS, RESTAURANT_COORDS } from '@/lib/app-context'
import { useCart } from '@/lib/cart-context'
import { categories, menuItems, type MenuItem } from '@/lib/data'
import Image from 'next/image'

const LOGO_URL = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Frame%202-ka88YF1wTzYyPws7x9erhGnno6h2HV.png'

export function MenuScreen() {
  const { setCurrentScreen } = useApp()
  const { addItem, removeItem, getItemQuantity, totalItems, totalPrice } = useCart()
  const [activeCategory, setActiveCategory] = useState(categories[0].slug)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const categoryScrollRef = useRef<HTMLDivElement>(null)
  const menuContentRef = useRef<HTMLDivElement>(null)
  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const isScrollingToCategory = useRef(false)

  // Group menu items by category
  const groupedMenu = categories.map(category => ({
    ...category,
    items: menuItems.filter(item => item.category === category.slug)
  })).filter(category => category.items.length > 0)

  // Scroll category tab into view
  const scrollCategoryTabIntoView = useCallback((slug: string) => {
    const activeButton = document.querySelector(`[data-category="${slug}"]`)
    if (activeButton && categoryScrollRef.current) {
      const container = categoryScrollRef.current
      const buttonRect = activeButton.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      
      if (buttonRect.left < containerRect.left || buttonRect.right > containerRect.right) {
        activeButton.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      }
    }
  }, [])

  // Handle category tab click - scroll to section
  const handleCategoryClick = (slug: string) => {
    isScrollingToCategory.current = true
    setActiveCategory(slug)
    
    const element = categoryRefs.current[slug]
    if (element && menuContentRef.current) {
      const headerHeight = 110
      const elementTop = element.getBoundingClientRect().top + window.scrollY - headerHeight
      
      window.scrollTo({
        top: elementTop,
        behavior: 'smooth'
      })
      
      setTimeout(() => {
        isScrollingToCategory.current = false
      }, 500)
    }
    
    scrollCategoryTabIntoView(slug)
  }

  // Update active category on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (isScrollingToCategory.current) return
      
      const headerHeight = 130
      
      for (let i = groupedMenu.length - 1; i >= 0; i--) {
        const category = groupedMenu[i]
        const element = categoryRefs.current[category.slug]
        
        if (element) {
          const rect = element.getBoundingClientRect()
          if (rect.top <= headerHeight) {
            if (activeCategory !== category.slug) {
              setActiveCategory(category.slug)
              scrollCategoryTabIntoView(category.slug)
            }
            break
          }
        }
      }
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [activeCategory, groupedMenu, scrollCategoryTabIntoView])

  // Scroll categories left/right
  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = 150
      categoryScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  // Open phone dialer
  const handlePhoneClick = () => {
    window.location.href = `tel:${RESTAURANT_PHONE.replace(/[^\d+]/g, '')}`
  }

  // Open maps
  const handleAddressClick = () => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${RESTAURANT_COORDS}`
    window.open(mapsUrl, '_blank')
  }

  return (
    <div className="min-h-screen flex flex-col pb-20 sm:pb-24">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 bg-[#0a0a0a]"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 border-b border-[#222]">
          <button 
            onClick={() => setCurrentScreen('profile')}
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-[#1a1a1a] rounded-lg border border-[#333] hover:border-[#D4AF37] transition-colors"
          >
            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#a1a1aa]" />
            <span className="text-xs sm:text-sm text-white">Профиль</span>
          </button>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={handleAddressClick}
              className="flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:gap-1 hover:text-[#D4AF37] transition-colors text-[#a1a1aa] sm:px-2 sm:py-1"
            >
              <MapPin className="w-4 h-4 sm:w-4 sm:h-4" />
              <span className="hidden md:inline text-sm">{RESTAURANT_ADDRESS}</span>
            </button>
            <button 
              onClick={handlePhoneClick}
              className="flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:gap-1 hover:text-[#D4AF37] transition-colors text-[#a1a1aa] sm:px-2 sm:py-1"
            >
              <Phone className="w-4 h-4 sm:w-4 sm:h-4" />
              <span className="hidden md:inline text-sm">{RESTAURANT_PHONE}</span>
            </button>
          </div>

          <div className="h-10 sm:h-12 aspect-[5/2] w-auto shrink-0 rounded-lg overflow-hidden">
            <Image
              src={LOGO_URL}
              alt="MUCHACHO"
              width={250}
              height={100}
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        {/* Categories with arrows */}
        <div className="relative flex items-center px-1 sm:px-2 py-2 sm:py-3 bg-[#0a0a0a] border-b border-[#222]">
          <button
            onClick={() => scrollCategories('left')}
            className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-[#D4AF37] hover:bg-[#1a1a1a] rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          
          <div
            ref={categoryScrollRef}
            className="flex gap-1.5 sm:gap-2 overflow-x-auto hide-scrollbar flex-1 px-1"
          >
            {categories.map((category) => (
              <button
                key={category.id}
                data-category={category.slug}
                onClick={() => handleCategoryClick(category.slug)}
                className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === category.slug
                    ? 'bg-[#D4AF37] text-black'
                    : 'text-[#a1a1aa] hover:text-white'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => scrollCategories('right')}
            className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-[#D4AF37] hover:bg-[#1a1a1a] rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </motion.header>

      {/* Menu Content - All items in one list */}
      <main ref={menuContentRef} className="flex-1 px-2 sm:px-4 bg-[#0a0a0a]">
        {groupedMenu.map((category, categoryIndex) => (
          <div
            key={category.id}
            ref={(el) => { categoryRefs.current[category.slug] = el }}
          >
            {/* Category header - sticky with proper z-index below cart */}
            <div className={`sticky top-[88px] sm:top-[104px] z-10 bg-[#0a0a0a] ${categoryIndex === 0 ? 'pt-3 sm:pt-4' : 'pt-4 sm:pt-6'} pb-2 sm:pb-3`}>
              <h2 className="text-base sm:text-xl font-bold text-white">
                {category.name}
              </h2>
            </div>
            
            <div className="space-y-2 sm:space-y-3 pb-2">
              {category.items.map((item) => {
                const quantity = getItemQuantity(item.id)
                
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#FFF8E7] rounded-lg sm:rounded-xl p-2.5 sm:p-4 flex items-center gap-2 sm:gap-3"
                  >
                    {/* Left side - name and weight */}
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedItem(item)}>
                      <h3 className="font-semibold text-black text-sm sm:text-base leading-tight">{item.name}</h3>
                      {item.weight && (
                        <span className="text-xs sm:text-sm text-[#888] mt-0.5 block">{item.weight}</span>
                      )}
                    </div>

                    {/* Right side - price and controls */}
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                      <span className="font-bold text-black text-sm sm:text-base whitespace-nowrap">
                        {item.price} ₽
                      </span>
                      
                      {quantity > 0 ? (
                        <div className="flex items-center gap-1 sm:gap-2 bg-white rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1 border border-[#ddd]">
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => removeItem(item.id)}
                            className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-[#D4AF37]"
                          >
                            <Minus className="w-4 h-4 sm:w-5 sm:h-5" />
                          </motion.button>
                          <span className="w-3 sm:w-4 text-center font-semibold text-black text-sm sm:text-base">
                            {quantity}
                          </span>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => addItem(item)}
                            className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-[#D4AF37]"
                          >
                            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                          </motion.button>
                        </div>
                      ) : (
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => addItem(item)}
                          className="w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center bg-white rounded-lg text-[#D4AF37] border border-[#ddd] hover:border-[#D4AF37] transition-colors"
                        >
                          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                        </motion.button>
                      )}

                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setSelectedItem(item)}
                        className="w-6 h-6 sm:w-9 sm:h-9 flex items-center justify-center text-[#D4AF37]"
                      >
                        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                      </motion.button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        ))}
      </main>

      {/* Cart Button - higher z-index than sticky headers */}
      <AnimatePresence>
        {totalItems > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 p-2 sm:p-4 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent pointer-events-none z-40"
          >
            <div className="max-w-3xl mx-auto pointer-events-auto">
              <motion.button
                onClick={() => setCurrentScreen('cart')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-[#D4AF37] text-black py-3 sm:py-4 px-4 sm:px-6 rounded-xl flex items-center justify-between font-semibold text-sm sm:text-lg shadow-lg shadow-[#D4AF37]/20"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="relative">
                    <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-black text-white text-[10px] sm:text-xs rounded-full flex items-center justify-center font-bold">
                      {totalItems}
                    </span>
                  </div>
                  <span>Корзина</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <span>{totalPrice} ₽</span>
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Item Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl bg-[#1a1a1a] rounded-t-3xl overflow-hidden max-h-[85vh] overflow-y-auto"
            >
              {/* Item Image */}
              <div className="relative h-40 sm:h-56 bg-[#252525]">
                <img
                  src={selectedItem.image_url}
                  alt={selectedItem.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setSelectedItem(null)}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 w-8 h-8 sm:w-10 sm:h-10 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* Item Details */}
              <div className="p-4 sm:p-6">
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <h3 className="text-xl sm:text-2xl font-bold text-white">{selectedItem.name}</h3>
                  {selectedItem.weight && (
                    <span className="text-xs sm:text-sm text-[#666] bg-[#252525] px-2 py-1 rounded">
                      {selectedItem.weight}
                    </span>
                  )}
                </div>

                <p className="text-sm sm:text-base text-[#a1a1aa] mb-4 sm:mb-6">{selectedItem.description}</p>

                {/* Nutrition Info per 100g */}
                <div className="mb-3 sm:mb-4">
                  <p className="text-xs sm:text-sm text-[#666] mb-2">Пищевая ценность на 100г</p>
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                    <div className="bg-[#252525] rounded-lg p-1.5 sm:p-2 text-center">
                      <p className="text-sm sm:text-base font-bold text-white">{selectedItem.calories}</p>
                      <p className="text-[10px] sm:text-xs text-[#666]">ккал</p>
                    </div>
                    <div className="bg-[#252525] rounded-lg p-1.5 sm:p-2 text-center">
                      <p className="text-sm sm:text-base font-bold text-white">{selectedItem.proteins}</p>
                      <p className="text-[10px] sm:text-xs text-[#666]">белки</p>
                    </div>
                    <div className="bg-[#252525] rounded-lg p-1.5 sm:p-2 text-center">
                      <p className="text-sm sm:text-base font-bold text-white">{selectedItem.fats}</p>
                      <p className="text-[10px] sm:text-xs text-[#666]">жиры</p>
                    </div>
                    <div className="bg-[#252525] rounded-lg p-1.5 sm:p-2 text-center">
                      <p className="text-sm sm:text-base font-bold text-white">{selectedItem.carbs}</p>
                      <p className="text-[10px] sm:text-xs text-[#666]">углеводы</p>
                    </div>
                  </div>
                </div>

                {/* Nutrition Info for entire dish */}
                <div className="mb-4 sm:mb-6">
                  <p className="text-xs sm:text-sm text-[#666] mb-2">Пищевая ценность блюда</p>
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                    <div className="bg-[#252525] rounded-lg p-1.5 sm:p-2 text-center">
                      <p className="text-sm sm:text-base font-bold text-[#D4AF37]">{selectedItem.dishNutrition.calories}</p>
                      <p className="text-[10px] sm:text-xs text-[#666]">ккал</p>
                    </div>
                    <div className="bg-[#252525] rounded-lg p-1.5 sm:p-2 text-center">
                      <p className="text-sm sm:text-base font-bold text-[#D4AF37]">{selectedItem.dishNutrition.proteins}</p>
                      <p className="text-[10px] sm:text-xs text-[#666]">белки</p>
                    </div>
                    <div className="bg-[#252525] rounded-lg p-1.5 sm:p-2 text-center">
                      <p className="text-sm sm:text-base font-bold text-[#D4AF37]">{selectedItem.dishNutrition.fats}</p>
                      <p className="text-[10px] sm:text-xs text-[#666]">жиры</p>
                    </div>
                    <div className="bg-[#252525] rounded-lg p-1.5 sm:p-2 text-center">
                      <p className="text-sm sm:text-base font-bold text-[#D4AF37]">{selectedItem.dishNutrition.carbs}</p>
                      <p className="text-[10px] sm:text-xs text-[#666]">углеводы</p>
                    </div>
                  </div>
                </div>

                {/* Add to Cart */}
                <div className="flex items-center justify-between">
                  <span className="text-xl sm:text-2xl font-bold text-[#D4AF37]">
                    {selectedItem.price} ₽
                  </span>
                  
                  {getItemQuantity(selectedItem.id) > 0 ? (
                    <div className="flex items-center gap-2 sm:gap-3 bg-[#252525] rounded-xl px-3 sm:px-4 py-1.5 sm:py-2">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => removeItem(selectedItem.id)}
                        className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-[#D4AF37]"
                      >
                        <Minus className="w-5 h-5 sm:w-6 sm:h-6" />
                      </motion.button>
                      <span className="w-6 sm:w-8 text-center text-lg sm:text-xl font-bold text-white">
                        {getItemQuantity(selectedItem.id)}
                      </span>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => addItem(selectedItem)}
                        className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-[#D4AF37]"
                      >
                        <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
                      </motion.button>
                    </div>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => addItem(selectedItem)}
                      className="bg-[#D4AF37] text-black px-5 sm:px-8 py-2.5 sm:py-3 rounded-xl font-semibold flex items-center gap-2 text-sm sm:text-base"
                    >
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                      Добавить
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
