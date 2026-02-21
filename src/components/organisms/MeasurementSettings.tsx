import React, { useState } from 'react'
import { Select, Card } from '../atoms'
import type { ProtectionType, Amperage, Room, SocketType } from '../../types'

const KNOWN_ROOMS = ['Łazienka','Kuchnia'] as const
const INNE_SENTINEL = '__inne__'

interface MeasurementSettingsProps {
  room: Room
  protectionType: ProtectionType
  amperage: Amperage
  socketType: SocketType
  onRoomChange: (value: Room) => void
  onProtectionTypeChange: (value: ProtectionType) => void
  onAmperageChange: (value: Amperage) => void
  onSocketTypeChange: (value: SocketType) => void
}

export const MeasurementSettings: React.FC<MeasurementSettingsProps> = ({
  room,
  protectionType,
  amperage,
  socketType,
  onRoomChange,
  onProtectionTypeChange,
  onAmperageChange,
  onSocketTypeChange,
}) => {
  const isCustom = !KNOWN_ROOMS.includes(room as typeof KNOWN_ROOMS[number])
  const [customRoom, setCustomRoom] = useState(isCustom ? room : '')

  const handleSelectChange = (value: string) => {
    if (value === INNE_SENTINEL) {
      onRoomChange(customRoom || 'Inne')
    } else {
      onRoomChange(value as Room)
    }
  }

  const handleCustomRoomChange = (value: string) => {
    setCustomRoom(value)
    onRoomChange(value || 'Inne')
  }

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

        <div className="grid grid-cols-2 gap-2">
        <Select
          label="Pokój"
          value={isCustom ? INNE_SENTINEL : room}
          onChange={(e) => handleSelectChange(e.target.value)}
          options={[
            { value: 'Łazienka', label: 'Łazienka' },
            { value: 'Kuchnia', label: 'Kuchnia' },
            { value: INNE_SENTINEL, label: 'Inne' },
          ]}
        />

        <Select
          label="Punkt pomiarowy"
          value={socketType}
          onChange={(e) => onSocketTypeChange(e.target.value as SocketType)}
          options={[
            { value: 'Gniazdo 230V', label: 'Gniazdo 230V' },
            { value: 'Gniazdo IP44', label: 'Gniazdo IP44' },
          ]}
        />

        {isCustom && (
          <input
            type="text"
            value={customRoom}
            onChange={(e) => handleCustomRoomChange(e.target.value)}
            placeholder="Wpisz nazwę pokoju..."
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        )}
        </div>
      </div>
    </Card>
  )
}
