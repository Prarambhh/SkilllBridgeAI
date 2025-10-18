import type React from 'react'

type SectionHeaderProps = {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  right?: React.ReactNode
  className?: string
  gradient?: boolean
}

export function SectionHeader({ title, subtitle, icon, right, className = '', gradient = false }: SectionHeaderProps) {
  return (
    <div className={["flex items-center justify-between", className].join(' ')}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex-shrink-0 p-2 rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400 animate-bounce-in">
            {icon}
          </div>
        )}
        <div>
          <h2 className={[
            "text-xl font-bold transition-all duration-200",
            gradient 
              ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400" 
              : "text-slate-800 dark:text-slate-200"
          ].join(' ')}>
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 animate-fade-in">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {right && (
        <div className="flex items-center gap-2 animate-slide-in-right">
          {right}
        </div>
      )}
    </div>
  )
}