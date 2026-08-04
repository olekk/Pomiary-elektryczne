import React from 'react'
import { Plus } from 'lucide-react'

interface FabProps {
  onClick: () => void
  ariaLabel: string
  icon?: React.ReactNode
}

/** Floating action button pinned to the bottom-right corner of the screen. */
export const Fab: React.FC<FabProps> = ({ onClick, ariaLabel, icon }) => (
  <button
    onClick={onClick}
    aria-label={ariaLabel}
    className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white p-5 rounded-full shadow-2xl flex items-center justify-center transition-colors"
    style={{ width: '64px', height: '64px' }}
  >
    {icon ?? <Plus size={32} />}
  </button>
)
