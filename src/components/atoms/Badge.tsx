import React from 'react'

export type BadgeVariant = 'success' | 'danger' | 'warning' | 'info'

interface BadgeProps {
  variant: BadgeVariant
  icon?: React.ReactNode
  children: React.ReactNode
  pulse?: boolean
}

// Dark-mode palette, consistent with the app's design system (§11) and the
// DataSourceChip freshness indicator.
const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50',
  danger: 'bg-red-900/50 text-red-300 border border-red-700/50',
  warning: 'bg-amber-900/50 text-amber-300 border border-amber-700/50',
  info: 'bg-blue-900/50 text-blue-300 border border-blue-700/50',
}

export const Badge: React.FC<BadgeProps> = ({
  variant,
  icon,
  children,
  pulse = false,
}) => {
  return (
    <span
      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold ${variantClasses[variant]}`}
    >
      {icon && <span className={pulse ? 'animate-pulse' : ''}>{icon}</span>}
      {children}
    </span>
  )
}
