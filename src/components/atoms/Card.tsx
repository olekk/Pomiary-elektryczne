import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: boolean
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = true,
}) => {
  return (
    <div
      className={`bg-slate-800 rounded-lg shadow-lg border border-slate-700 ${
        padding ? 'p-4' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}
