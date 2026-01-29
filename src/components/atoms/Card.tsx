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
      className={`bg-white rounded-lg shadow ${padding ? 'p-4' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
