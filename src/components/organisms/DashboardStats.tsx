import React from 'react'
import { FileText, CheckCircle, Clock } from 'lucide-react'
import { StatsCard } from '../molecules'

interface DashboardStatsProps {
  totalCount: number
  syncedCount: number
  pendingCount: number
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  totalCount,
  syncedCount,
  pendingCount,
}) => {
  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      <StatsCard
        icon={<FileText size={18} />}
        label="Wszystkie"
        value={totalCount}
      />
      <StatsCard
        icon={<CheckCircle size={18} />}
        label="Synced"
        value={syncedCount}
        iconColor="text-green-600"
        valueColor="text-green-600"
      />
      <StatsCard
        icon={<Clock size={18} />}
        label="Pending"
        value={pendingCount}
        iconColor="text-orange-600"
        valueColor="text-orange-600"
      />
    </div>
  )
}
