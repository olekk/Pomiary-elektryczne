import React from 'react'
import {
  Trash2,
  CheckCircle,
  Clock,
  FileText,
  AlertTriangle,
} from 'lucide-react'
import { Card, Badge, ActionMenu } from '../atoms'
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
  const isInaccessible = inspection.status === 'INACCESSIBLE'

  const handleCardClick = () => {
    if (onClick) {
      onClick(inspection)
    }
  }



  return (
    <Card>
      <div
        className={`flex items-start justify-between cursor-pointer ${
          isInaccessible ? 'border-l-4 border-orange-500 pl-3 -ml-1' : ''
        }`}
        onClick={handleCardClick}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isInaccessible ? (
              <AlertTriangle size={18} className="text-orange-400" />
            ) : (
              <FileText size={18} className="text-blue-400" />
            )}
            <span
              className={`font-mono text-sm break-all ${
                isInaccessible ? 'text-orange-400' : 'text-blue-400'
              }`}
            >
              {inspection.protocolNumber}
            </span>
          </div>
          <h3
            className={`font-bold text-lg ${
              isInaccessible ? 'text-orange-200' : 'text-slate-100'
            }`}
          >
            {inspection.unitType === 'lokal'
              ? 'Lokal'
              : inspection.unitType === 'klatka'
                ? 'Klatka'
                : 'Mieszkanie'}: {inspection.apartmentNumber}
          </h3>
          {isInaccessible && (
            <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-orange-900/50 text-orange-300 border border-orange-700/50 mb-1">
              Niedostępne
            </span>
          )}
          <p className="text-sm text-slate-300">{inspection.address}</p>
          {inspection.ownerName && (
            <p className="text-sm text-slate-400">{inspection.ownerName}</p>
          )}
          <p className="text-sm text-slate-300">
            Technik: {inspection.technicianName}
          </p>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            <span className="text-xs text-slate-400">
              {new Date(inspection.date).toLocaleDateString('pl-PL')}
            </span>
            {!isInaccessible && (
              <span className="text-xs text-slate-400">
                Punkty: {inspection.measurements.length}
              </span>
            )}
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
        <div className="ml-2" onClick={(e) => e.stopPropagation()}>
          <ActionMenu
            ariaLabel="Opcje inspekcji"
            iconSize={20}
            items={[
              {
                label: 'Usuń',
                icon: <Trash2 size={16} className="text-red-400" />,
                onClick: () => onDelete(inspection.id!),
                className: 'text-red-400 hover:bg-red-900/40',
              },
            ]}
          />
        </div>
      </div>
    </Card>
  )
}
