import React, { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Card } from '../atoms'

interface NotesSectionProps {
  notes: string
  onNotesChange: (value: string) => void
}

export const NotesSection: React.FC<NotesSectionProps> = ({
  notes,
  onNotesChange,
}) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Card className="shadow-md">
      <button
        type="button"
        className="w-full flex items-center justify-between text-sm font-semibold text-slate-300"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>Uwagi do protokołu</span>
        {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </button>

      {isOpen && (
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Wpisz dodatkowe uwagi..."
          rows={4}
          className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      )}
    </Card>
  )
}
