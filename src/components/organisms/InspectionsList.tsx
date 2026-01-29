import React from 'react'
import { FileText } from 'lucide-react'
import { InspectionCard } from '../molecules'
import type { Inspection } from '../../types'

interface InspectionsListProps {
  inspections: Inspection[]
  isLoading: boolean
  onDelete: (id: string) => void
}

export const InspectionsList: React.FC<InspectionsListProps> = ({
  inspections,
  isLoading,
  onDelete,
}) => {
  if (isLoading) {
    return <div className="text-center text-gray-500 py-8">Ładowanie...</div>
  }

  if (inspections.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <FileText size={48} className="mx-auto mb-2 opacity-50" />
        <p>Brak pomiarów. Utwórz nowy pomiar poniżej.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {inspections.map((inspection) => (
        <InspectionCard
          key={inspection.id}
          inspection={inspection}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
