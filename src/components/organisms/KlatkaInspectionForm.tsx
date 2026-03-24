import React from 'react'
import { Select, Input, Card } from '../atoms'
import type { KlatkaData, PrzylaczType, PwpStatus } from '../../types'

interface KlatkaInspectionFormProps {
  value: KlatkaData
  onChange: (data: KlatkaData) => void
}

export const KlatkaInspectionForm: React.FC<KlatkaInspectionFormProps> = ({
  value,
  onChange,
}) => {
  const handlePrzylaczChange = (przylacze: PrzylaczType) => {
    onChange({
      ...value,
      przylacze,
      // Clear cable fields when switching to napowietrzne
      ...(przylacze === 'napowietrzne' ? { typKabla: undefined, przekroj: undefined } : {}),
    })
  }

  return (
    <Card className="shadow-md">
      <h2 className="text-sm font-semibold text-slate-300 mb-4">
        Formularz klatki schodowej
      </h2>

      <div className="space-y-4">
        {/* Point 1: Przyłącze */}
        <div className="border border-slate-700 rounded-lg p-4">
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-lg font-bold text-blue-400 shrink-0">1.</span>
            <Select
              label="Przyłącze"
              value={value.przylacze}
              onChange={(e) => handlePrzylaczChange(e.target.value as PrzylaczType)}
              options={[
                { value: 'napowietrzne', label: 'Napowietrzne' },
                { value: 'kabelowe', label: 'Kabelowe' },
              ]}
            />
          </div>

          {/* Sub-points for kabelowe */}
          {value.przylacze === 'kabelowe' && (
            <div className="ml-8 space-y-3 border-l-2 border-slate-700 pl-4">
              <div className="flex items-baseline gap-3">
                <span className="text-sm font-semibold text-blue-300 shrink-0">1.1</span>
                <Input
                  label="Typ kabla"
                  type="text"
                  value={value.typKabla || ''}
                  onChange={(e) => onChange({ ...value, typKabla: e.target.value })}
                  placeholder="np. YKY"
                />
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-sm font-semibold text-blue-300 shrink-0">1.2</span>
                <Input
                  label="Przekrój"
                  type="text"
                  value={value.przekroj || ''}
                  onChange={(e) => onChange({ ...value, przekroj: e.target.value })}
                  placeholder="np. 4x10mm²"
                />
              </div>
            </div>
          )}
        </div>

        {/* Point 2: Wyłącznik pożarowy PWP */}
        <div className="border border-slate-700 rounded-lg p-4">
          <div className="flex items-baseline gap-3">
            <span className="text-lg font-bold text-blue-400 shrink-0">2.</span>
            <Select
              label="Wyłącznik pożarowy prądu (PWP)"
              value={value.pwpStatus}
              onChange={(e) => onChange({ ...value, pwpStatus: e.target.value as PwpStatus })}
              options={[
                { value: 'jest', label: 'Jest' },
                { value: 'brak', label: 'Brak' },
              ]}
            />
          </div>
        </div>
      </div>
    </Card>
  )
}
