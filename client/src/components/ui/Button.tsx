import type React from 'react'

type ButtonProps = {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'outline' | 'dark' | 'indigo' | 'slate' | 'green' | 'red'
  size?: 'sm' | 'md' | 'lg'
  ariaLabel?: string
}

const base = 'inline-flex items-center justify-center gap-2 rounded-xl font-semibold shadow-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2'
const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}
const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25 hover:shadow-blue-500/40 focus:ring-blue-500',
  secondary: 'bg-white/80 backdrop-blur-sm text-slate-700 ring-1 ring-slate-200 hover:bg-white hover:ring-slate-300 shadow-slate-200/50 hover:shadow-slate-300/60 dark:bg-slate-800/80 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700 dark:hover:ring-slate-600 focus:ring-slate-500',
  outline: 'bg-transparent text-slate-700 ring-2 ring-slate-300 hover:bg-slate-50 hover:ring-slate-400 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800/50 dark:hover:ring-slate-600 focus:ring-slate-500',
  dark: 'bg-gradient-to-r from-slate-800 to-slate-900 text-white hover:from-slate-900 hover:to-black shadow-slate-500/25 hover:shadow-slate-500/40 focus:ring-slate-500',
  indigo: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-indigo-500/25 hover:shadow-indigo-500/40 focus:ring-indigo-500',
  slate: 'bg-gradient-to-r from-slate-600 to-slate-700 text-white hover:from-slate-700 hover:to-slate-800 shadow-slate-500/25 hover:shadow-slate-500/40 focus:ring-slate-500',
  green: 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-green-500/25 hover:shadow-green-500/40 focus:ring-green-500',
  red: 'bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700 shadow-red-500/25 hover:shadow-red-500/40 focus:ring-red-500',
}

export function Button({ children, className = '', onClick, disabled, loading, variant = 'primary', size = 'md', ariaLabel }: ButtonProps) {
  return (
    <button
      className={[base, sizes[size], variants[variant], className].join(' ')}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
          <span className="animate-pulse">{children}</span>
        </div>
      ) : (
        <span className="flex items-center gap-2">{children}</span>
      )}
    </button>
  )
}