import React from 'react'

export type BadgeVariant = 'success' | 'danger' | 'warning' | 'info'

interface BadgeProps {
  variant: BadgeVariant
  icon?: React.ReactNode
  children: React.ReactNode
  pulse?: boolean
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-green-50 text-green-600 border-green-500',
  danger: 'bg-red-50 text-red-600 border-red-500',
  warning: 'bg-orange-50 text-orange-600 border-orange-500',
  info: 'bg-blue-50 text-blue-600 border-blue-500',
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
