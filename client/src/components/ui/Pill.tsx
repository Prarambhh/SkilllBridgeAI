import type React from 'react'

type PillProps = {
  label?: string
  text?: string
  color?: 'blue' | 'purple' | 'indigo' | 'green' | 'red' | 'slate' | 'orange' | 'cyan'
  className?: string
  variant?: 'default' | 'gradient'
  children?: React.ReactNode
}

const colorMap: Record<NonNullable<PillProps['color']>, string> = {
  blue: 'bg-blue-50 text-blue-700 ring-blue-200/60 dark:bg-blue-900/30 dark:text-blue-200 dark:ring-blue-800/60',
  purple: 'bg-purple-50 text-purple-700 ring-purple-200/60 dark:bg-purple-900/30 dark:text-purple-200 dark:ring-purple-800/60',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200/60 dark:bg-indigo-900/30 dark:text-indigo-200 dark:ring-indigo-800/60',
  green: 'bg-green-50 text-green-700 ring-green-200/60 dark:bg-green-900/30 dark:text-green-200 dark:ring-green-800/60',
  red: 'bg-red-50 text-red-700 ring-red-200/60 dark:bg-red-900/30 dark:text-red-200 dark:ring-red-800/60',
  slate: 'bg-slate-50 text-slate-700 ring-slate-200/60 dark:bg-slate-900/30 dark:text-slate-200 dark:ring-slate-800/60',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200/60 dark:bg-orange-900/30 dark:text-orange-200 dark:ring-orange-800/60',
  cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-200/60 dark:bg-cyan-900/30 dark:text-cyan-200 dark:ring-cyan-800/60',
}

const gradientMap: Record<NonNullable<PillProps['color']>, string> = {
  blue: 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-blue-700 ring-blue-300/40 dark:from-blue-400/20 dark:to-indigo-400/20 dark:text-blue-200 dark:ring-blue-600/40',
  purple: 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-700 ring-purple-300/40 dark:from-purple-400/20 dark:to-pink-400/20 dark:text-purple-200 dark:ring-purple-600/40',
  indigo: 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-700 ring-indigo-300/40 dark:from-indigo-400/20 dark:to-purple-400/20 dark:text-indigo-200 dark:ring-indigo-600/40',
  green: 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-700 ring-green-300/40 dark:from-green-400/20 dark:to-emerald-400/20 dark:text-green-200 dark:ring-green-600/40',
  red: 'bg-gradient-to-r from-red-500/10 to-rose-500/10 text-red-700 ring-red-300/40 dark:from-red-400/20 dark:to-rose-400/20 dark:text-red-200 dark:ring-red-600/40',
  slate: 'bg-gradient-to-r from-slate-500/10 to-gray-500/10 text-slate-700 ring-slate-300/40 dark:from-slate-400/20 dark:to-gray-400/20 dark:text-slate-200 dark:ring-slate-600/40',
  orange: 'bg-gradient-to-r from-orange-500/10 to-amber-500/10 text-orange-700 ring-orange-300/40 dark:from-orange-400/20 dark:to-amber-400/20 dark:text-orange-200 dark:ring-orange-600/40',
  cyan: 'bg-gradient-to-r from-cyan-500/10 to-teal-500/10 text-cyan-700 ring-cyan-300/40 dark:from-cyan-400/20 dark:to-teal-400/20 dark:text-cyan-200 dark:ring-cyan-600/40',
}

export function Pill({ label, text, color = 'slate', className = '', variant = 'default', children }: PillProps) {
  const content = text || label || children
  const colorClasses = variant === 'gradient' ? gradientMap[color] : colorMap[color]
  
  return (
    <span className={[
      'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ring-1 backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:shadow-sm',
      colorClasses,
      className,
    ].join(' ')}>
      {content}
    </span>
  )
}