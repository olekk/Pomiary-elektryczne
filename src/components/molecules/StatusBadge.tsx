import React from 'react'
import { Cloud, CloudOff, AlertCircle } from 'lucide-react'

interface StatusBadgeProps {
  isOnline: boolean
  pendingCount: number
  onRetrySync?: () => void
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  isOnline,
  pendingCount,
  onRetrySync,
}) => {
  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 bg-orange-500 px-3 py-1.5 rounded-full text-white">
        <CloudOff size={18} />
        <span className="text-sm font-semibold">Offline</span>
      </div>
    )
  }

  if (pendingCount > 0) {
    return (
      <button
        onClick={onRetrySync}
        className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 px-3 py-1.5 rounded-full transition-colors text-white"
      >
        <AlertCircle size={18} />
        <span className="text-sm font-semibold">{pendingCount} oczekuje</span>
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 bg-green-500 px-3 py-1.5 rounded-full text-white">
      <Cloud size={18} />
      <span className="text-sm font-semibold">Online</span>
    </div>
  )
}
