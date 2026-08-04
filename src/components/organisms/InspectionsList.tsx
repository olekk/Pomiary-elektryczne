import React from 'react'
import { FileText } from 'lucide-react'
import { InspectionCard, DataSourceChip } from '../molecules'
import type { Inspection } from '../../types'

interface InspectionsListProps {
  inspections: Inspection[]
  isLoading: boolean
  fromCache?: boolean
  onDelete: (id: string) => void
  onClick?: (inspection: Inspection) => void
}

export const InspectionsList: React.FC<InspectionsListProps> = ({
  inspections,
  isLoading,
  fromCache = false,
  onDelete,
  onClick,
}) => {
  if (isLoading && inspections.length === 0) {
    return <div className="text-center text-slate-400 py-8">Ładowanie...</div>
  }

  if (inspections.length === 0) {
    return (
      <div className="text-center text-slate-400 py-8">
        <FileText size={48} className="mx-auto mb-2 opacity-50" />
        <p>Brak pomiarów. Utwórz nowy pomiar poniżej.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-400">
          Protokoły ({inspections.length})
        </span>
        <DataSourceChip fromCache={fromCache} />
      </div>
      {inspections.map((inspection) => (
        <InspectionCard
          key={inspection.id}
          inspection={inspection}
          onDelete={onDelete}
          onClick={onClick}
        />
      ))}
    </div>
  )
}
