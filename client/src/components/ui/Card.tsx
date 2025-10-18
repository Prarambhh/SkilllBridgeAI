import type React from 'react'

type CardProps = {
  children: React.ReactNode
  className?: string
  hover?: boolean
  gradient?: boolean
}

export function Card({ children, className = '', hover = false, gradient = false }: CardProps) {
  const baseClasses = 'rounded-2xl backdrop-blur-sm shadow-lg ring-1 transition-all duration-300'
  
  const backgroundClasses = gradient
    ? 'bg-gradient-to-br from-white/95 via-white/90 to-slate-50/95 dark:from-slate-900/95 dark:via-slate-900/90 dark:to-slate-800/95'
    : 'bg-white/90 dark:bg-slate-900/90'
  
  const ringClasses = 'ring-slate-200/50 dark:ring-slate-700/50'
  
  const hoverClasses = hover
    ? 'hover:shadow-xl hover:shadow-slate-200/20 hover:ring-slate-300/60 hover:-translate-y-1 dark:hover:shadow-slate-900/40 dark:hover:ring-slate-600/60'
    : ''
  
  return (
    <section className={[
      baseClasses,
      backgroundClasses,
      ringClasses,
      hoverClasses,
      className,
    ].join(' ')}>
      {children}
    </section>
  )
}