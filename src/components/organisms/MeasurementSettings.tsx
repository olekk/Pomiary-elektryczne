import React from 'react'
import { Select, Card } from '../atoms'
import type { ProtectionType, Amperage } from '../../types'

interface MeasurementSettingsProps {
  protectionType: ProtectionType
  amperage: Amperage
  kFactor: number
  onProtectionTypeChange: (value: ProtectionType) => void
  onAmperageChange: (value: Amperage) => void
  onKFactorChange: (value: number) => void
}

export const MeasurementSettings: React.FC<MeasurementSettingsProps> = ({
  protectionType,
  amperage,
  kFactor,
  onProtectionTypeChange,
  onAmperageChange,
  onKFactorChange,
}) => {
  return (
    <Card className="shadow-md">
      <h2 className="text-sm font-semibold text-gray-600 mb-3">
        Ustawienia następnego punktu
      </h2>

      <div className="grid grid-cols-3 gap-2">
        <Select
          label="Zabezpieczenie"
          value={protectionType}
          onChange={(e) =>
            onProtectionTypeChange(e.target.value as ProtectionType)
          }
          options={[
            { value: 'WNP', label: 'WNP' },
            { value: 'BI', label: 'BI' },
          ]}
        />

        <Select
          label="Współczynnik k"
          value={kFactor}
          onChange={(e) => onKFactorChange(parseFloat(e.target.value))}
          options={[
            { value: 5, label: '5' },
            { value: 5.4, label: '5.4' },
          ]}
        />

        <Select
          label="Amperaż"
          value={amperage}
          onChange={(e) => onAmperageChange(Number(e.target.value) as Amperage)}
          options={[
            { value: 16, label: '16A' },
            { value: 20, label: '20A' },
            { value: 25, label: '25A' },
          ]}
        />
      </div>
    </Card>
  )
}
