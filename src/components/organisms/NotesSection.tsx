import React, { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Card } from '../atoms'
import { cn } from '../../utils/cn'

interface NotesSectionProps {
  notes: string
  onNotesChange: (value: string) => void
  /** Collapsible disclosure with a chevron toggle (default). When false, renders an always-visible labeled field. */
  collapsible?: boolean
  rows?: number
  className?: string
}

export const NotesSection: React.FC<NotesSectionProps> = ({
  notes,
  onNotesChange,
  collapsible = true,
  rows = 4,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const textarea = (
    <textarea
      id="inspection-notes"
      value={notes}
      onChange={(e) => onNotesChange(e.target.value)}
      placeholder="Wpisz dodatkowe uwagi..."
      rows={rows}
      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
    />
  )

  if (!collapsible) {
    return (
      <Card className={cn('shadow-md', className)}>
        <label
          htmlFor="inspection-notes"
          className="block text-sm font-semibold text-slate-300 mb-2"
        >
          Uwagi do protokołu
        </label>
        {textarea}
      </Card>
    )
  }

  return (
    <Card className={cn('shadow-md', className)}>
      <button
        type="button"
        className="w-full flex items-center justify-between text-sm font-semibold text-slate-300"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>Uwagi do protokołu</span>
        {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </button>

      {isOpen && <div className="mt-3">{textarea}</div>}
    </Card>
  )
}
