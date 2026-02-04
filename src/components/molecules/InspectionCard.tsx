import React from 'react'
import { Trash2, CheckCircle, Clock } from 'lucide-react'
import { Card, Badge } from '../atoms'
import type { Inspection } from '../../types'

interface InspectionCardProps {
  inspection: Inspection
  onDelete: (id: string) => void
  onClick?: (inspection: Inspection) => void
}

export const InspectionCard: React.FC<InspectionCardProps> = ({
  inspection,
  onDelete,
  onClick,
}) => {
  const handleCardClick = () => {
    if (onClick) {
      onClick(inspection)
    }
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(inspection.id!)
  }

  return (
    <Card>
      <div
        className="flex items-start justify-between cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="flex-1">
          <h3 className="font-bold text-lg text-slate-100">
            Mieszkanie: {inspection.apartmentNumber}
          </h3>
          <p className="text-sm text-slate-300">{inspection.address}</p>
          <p className="text-sm text-slate-300">
            Technik: {inspection.technician}
          </p>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            <span className="text-xs text-slate-400">
              {new Date(inspection.date).toLocaleDateString('pl-PL')}
            </span>
            <span className="text-xs text-slate-400">
              Punkty: {inspection.measurements.length}
            </span>
            {inspection.synced ? (
              <Badge variant="success" icon={<CheckCircle size={14} />}>
                Synced
              </Badge>
            ) : (
              <Badge variant="warning" icon={<Clock size={14} />} pulse>
                Oczekuje na sync
              </Badge>
            )}
          </div>
        </div>
        <button
          onClick={handleDeleteClick}
          className="ml-2 p-2 text-red-400 hover:bg-red-900 active:bg-red-800 rounded cursor-pointer transition-colors"
        >
          <Trash2 size={20} />
        </button>
      </div>
    </Card>
  )
}
