import React from 'react'
import { FileText, Cloud, HardDrive } from 'lucide-react'
import { InspectionCard } from '../molecules'
import type { Inspection } from '../../types'

interface InspectionsListProps {
  inspections: Inspection[]
  isLoading: boolean
  fromCache?: boolean
  onDelete: (id: string) => void
  onClick?: (inspection: Inspection) => void
}

const DataSourceChip: React.FC<{ fromCache: boolean }> = ({ fromCache }) => (
  <div
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
      fromCache
        ? 'bg-amber-900/50 text-amber-300 border border-amber-700/50'
        : 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50'
    }`}
  >
    {fromCache ? <HardDrive size={12} /> : <Cloud size={12} />}
    {fromCache ? 'Dane lokalne' : 'Aktualne'}
  </div>
)

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
          Pomiary ({inspections.length})
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
