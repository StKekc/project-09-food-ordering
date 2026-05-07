'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useApp } from '@/lib/app-context'
import { toast } from '@/hooks/use-toast'

export function AuthCodeScreen() {
  const { phone, setCurrentScreen, setIsAuthenticated, userProfile } = useApp()
  const [code, setCode] = useState(['', '', '', ''])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value.slice(-1)
    setCode(newCode)
    setError('')

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all digits are entered
    if (newCode.every(digit => digit !== '') && value) {
      handleSubmit(newCode.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleSubmit = async (fullCode: string) => {
    setIsLoading(true)

    try {
      if (fullCode.length !== 4) {
        setError('Неверный код')
        setCode(['', '', '', ''])
        inputRefs.current[0]?.focus()
        return
      }

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL
      if (!apiBaseUrl) {
        const msg = 'Не задан NEXT_PUBLIC_API_URL'
        setError(msg)
        toast({ title: 'Ошибка', description: msg, variant: 'destructive' })
        return
      }

      const res = await fetch(`${apiBaseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          password: fullCode,
          name: userProfile?.name ?? '',
        }),
      })

      if (res.status === 201) {
        toast({
          title: 'Успешно',
          description: 'Пользователь зарегистрирован',
        })
        setIsAuthenticated(true)
        setCurrentScreen('menu')
        return
      }

      let backendMessage = `Ошибка регистрации (HTTP ${res.status})`
      try {
        const data = await res.json()
        const extracted =
          (typeof data?.detail === 'string' && data.detail) ||
          (typeof data?.message === 'string' && data.message) ||
          (typeof data?.error === 'string' && data.error)
        if (extracted) backendMessage = extracted
      } catch {
        // ignore non-JSON
      }

      setError(backendMessage)
      toast({
        title: 'Ошибка',
        description: backendMessage,
        variant: 'destructive',
      })
      setCode(['', '', '', ''])
      inputRefs.current[0]?.focus()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ошибка сети'
      setError(msg)
      toast({ title: 'Ошибка', description: msg, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = () => {
    if (countdown === 0) {
      setCountdown(60)
      // Simulate resending code
    }
  }

  return (
    <div className="min-h-screen flex flex-col px-4 sm:px-6 py-8 sm:py-12 max-w-md mx-auto">
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => setCurrentScreen('auth-phone')}
        className="flex items-center gap-2 text-[#a1a1aa] hover:text-white transition-colors mb-6 sm:mb-8 self-start"
      >
        <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="text-sm sm:text-base">Назад</span>
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex flex-col justify-center"
      >
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Введите код</h1>
          <p className="text-sm sm:text-base text-[#a1a1aa]">
            Код отправлен на номер{' '}
            <span className="text-[#D4AF37]">{phone}</span>
          </p>
        </div>

        <div className="flex justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          {code.map((digit, index) => (
            <motion.input
              key={index}
              ref={(el) => { inputRefs.current[index] = el }}
              type="text"
              inputMode="numeric"
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={isLoading}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`w-12 h-12 sm:w-16 sm:h-16 text-center text-xl sm:text-2xl font-bold bg-[#1a1a1a] border-2 rounded-lg sm:rounded-xl outline-none transition-all ${
                digit
                  ? 'border-[#D4AF37] text-white'
                  : 'border-[#333] text-white'
              } focus:border-[#D4AF37] disabled:opacity-50`}
            />
          ))}
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-red-500 text-xs sm:text-sm mb-4"
          >
            {error}
          </motion.p>
        )}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center mb-4"
          >
            <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-[#D4AF37] animate-spin" />
          </motion.div>
        )}

        <div className="text-center">
          <button
            onClick={handleResend}
            disabled={countdown > 0}
            className={`text-xs sm:text-sm flex items-center justify-center gap-2 mx-auto transition-colors ${
              countdown > 0
                ? 'text-[#666] cursor-not-allowed'
                : 'text-[#D4AF37] hover:text-[#e5c760]'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {countdown > 0
              ? `Отправить повторно через ${countdown} сек`
              : 'Отправить код повторно'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
