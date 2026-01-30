import React from 'react'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'success'
  | 'warning'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  icon?: React.ReactNode
  children: React.ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white',
  secondary:
    'bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200',
  danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white',
  success: 'bg-green-500 hover:bg-green-600 active:bg-green-700 text-white',
  warning: 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'p-2 text-sm',
  md: 'p-3 text-base',
  lg: 'p-4 text-lg',
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  children,
  disabled,
  className = '',
  ...props
}) => {
  const baseClasses =
    'rounded-lg font-semibold transition-colors flex items-center justify-center gap-2'
  const widthClass = fullWidth ? 'w-full' : ''
  const disabledClass = disabled
    ? 'opacity-50 cursor-not-allowed'
    : 'cursor-pointer'

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${disabledClass} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}
