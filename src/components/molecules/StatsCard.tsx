import React from 'react'
import { Card } from '../atoms'

interface StatsCardProps {
  icon: React.ReactNode
  label: string
  value: number
  iconColor?: string
  valueColor?: string
}

export const StatsCard: React.FC<StatsCardProps> = ({
  icon,
  label,
  value,
  iconColor = 'text-gray-600',
  valueColor = 'text-gray-800',
}) => {
  return (
    <Card>
      <div className={`flex items-center gap-2 ${iconColor} mb-1`}>
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
    </Card>
  )
}
