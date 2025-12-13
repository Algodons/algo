'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface TooltipProps {
  content: string | React.ReactNode
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

export function Tooltip({ content, children, position = 'top', delay = 200 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    const id = setTimeout(() => setIsVisible(true), delay)
    setTimeoutId(id)
  }

  const handleMouseLeave = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      setTimeoutId(null)
    }
    setIsVisible(false)
  }

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent',
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className={`absolute ${positionClasses[position]} z-50 pointer-events-none whitespace-nowrap`}
          >
            <div
              className="px-3 py-2 text-xs font-medium text-white bg-gray-900 border border-white/10 rounded-lg shadow-lg"
              style={{
                backdropFilter: 'blur(10px)',
              }}
            >
              {content}
              <div
                className={`absolute ${arrowClasses[position]} w-0 h-0 border-4 border-gray-900`}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Tutorial tooltip variant with progress indicator
interface TutorialTooltipProps extends TooltipProps {
  step: number
  totalSteps: number
  onNext?: () => void
  onSkip?: () => void
}

export function TutorialTooltip({
  content,
  children,
  position = 'bottom',
  step,
  totalSteps,
  onNext,
  onSkip,
}: TutorialTooltipProps) {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return <>{children}</>

  return (
    <div className="relative inline-block">
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ duration: 0.3 }}
            className={`absolute ${
              position === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'
            } left-1/2 -translate-x-1/2 z-50 w-64`}
          >
            <div
              className="p-4 bg-blue-600 rounded-lg shadow-2xl border border-blue-500"
              style={{
                backdropFilter: 'blur(10px)',
              }}
            >
              <div className="mb-3">
                <div className="text-xs font-semibold text-blue-200 mb-1">
                  Step {step} of {totalSteps}
                </div>
                <div className="text-sm text-white">{content}</div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1">
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 w-4 rounded-full ${
                        i < step ? 'bg-white' : 'bg-white/30'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  {onSkip && (
                    <button
                      onClick={() => {
                        onSkip()
                        setIsVisible(false)
                      }}
                      className="text-xs text-blue-200 hover:text-white transition-colors"
                    >
                      Skip
                    </button>
                  )}
                  {onNext && (
                    <button
                      onClick={onNext}
                      className="text-xs font-medium bg-white text-blue-600 px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                    >
                      {step === totalSteps ? 'Finish' : 'Next'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
