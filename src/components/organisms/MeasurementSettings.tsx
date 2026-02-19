import React from 'react'
import { Select, Card } from '../atoms'
import type { ProtectionType, Amperage, Room } from '../../types'

interface MeasurementSettingsProps {
  room: Room
  protectionType: ProtectionType
  amperage: Amperage
  onRoomChange: (value: Room) => void
  onProtectionTypeChange: (value: ProtectionType) => void
  onAmperageChange: (value: Amperage) => void
}

export const MeasurementSettings: React.FC<MeasurementSettingsProps> = ({
  room,
  protectionType,
  amperage,
  onRoomChange,
  onProtectionTypeChange,
  onAmperageChange,
}) => {
  return (
    <Card className="shadow-md">
      <h2 className="text-sm font-semibold text-slate-300 mb-3">
        Ustawienia następnego punktu
      </h2>

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Select
            label="Zabezpieczenie"
            value={protectionType}
            onChange={(e) =>
              onProtectionTypeChange(e.target.value as ProtectionType)
            }
            options={[
              { value: 'WNP', label: 'WNP (Wyłącznik Nadprądowy)' },
              { value: 'BI', label: 'BI (Bezpiecznik Topikowy)' },
            ]}
          />

          <Select
            label="Amperaż"
            value={amperage}
            onChange={(e) =>
              onAmperageChange(Number(e.target.value) as Amperage)
            }
            options={[
              { value: 10, label: '10A' },
              { value: 16, label: '16A' },
              { value: 20, label: '20A' },
              { value: 25, label: '25A' },
            ]}
          />
        </div>

        <Select
          label="Pokój"
          value={room}
          onChange={(e) => onRoomChange(e.target.value as Room)}
          options={[
            { value: 'Kuchnia', label: 'Kuchnia' },
            { value: 'Łazienka', label: 'Łazienka' },
          ]}
        />
      </div>
    </Card>
  )
}
