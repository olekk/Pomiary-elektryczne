import React from 'react'
import { Trash2 } from 'lucide-react'
import type { Measurement } from '../../types'
import { cn } from '../../utils'
import { ActionMenu } from '../atoms'

interface MeasurementListItemProps {
  measurement: Measurement
  onDelete?: (id: string) => void
  showDelete?: boolean
}

export const MeasurementListItem: React.FC<MeasurementListItemProps> = ({
  measurement: m,
  onDelete,
  showDelete = true,
}) => {
  const borderColor =
    m.result === 'TAK' ? 'border-green-500' : 'border-red-500'

  const resultColor =
    m.result === 'TAK' ? 'text-green-600' : 'text-red-600'

  return (
    <div
      className={cn(
        'bg-slate-800 p-3 rounded-lg border border-slate-700',
        'flex items-center justify-between border-l-4',
        borderColor
      )}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg text-slate-100">
            {m.room} #{m.pointNumber}
          </span>
          <span className="text-lg text-slate-100">{m.socketType}</span>
          <span className="text-sm text-slate-400">
            {m.protectionType} {m.amperage}A
          </span>
          <span className={cn('ml-auto font-bold text-lg', resultColor)}>
            {m.result}
          </span>
        </div>
        <div className="text-sm text-slate-300 mt-1">
          {m.noGrounding ? (
            <span>
              {m.noGrounding === 'NO_PIN' && 'Brak bolca w gnieździe'}
              {m.noGrounding === 'NO_CONN' && 'Brak połączenia z przewodem PE'}
              {m.noGrounding === 'HIGH_Z' && 'Zbyt wysoka impedancja'}
            </span>
          ) : (
            <>
              Zs:{' '}
              <span className="font-semibold">{m.zsValue?.toFixed(2)} Ω</span>{' '}
              (dop: {m.zsDop.toFixed(2)} Ω)
            </>
          )}
        </div>
      </div>
      {showDelete && onDelete && (
        <div className="ml-2">
          <ActionMenu
            ariaLabel="Opcje pomiaru"
            iconSize={20}
            items={[
              {
                label: 'Usuń',
                icon: <Trash2 size={16} className="text-red-400" />,
                onClick: () => onDelete(m.id),
                className: 'text-red-400 hover:bg-red-900/40',
              },
            ]}
          />
        </div>
      )}
    </div>
  )
}

interface CompactMeasurementListItemProps {
  measurement: Measurement
}

export const CompactMeasurementListItem: React.FC<
  CompactMeasurementListItemProps
> = ({ measurement: m }) => {
  const borderColor =
    m.result === 'TAK' ? 'border-green-500' : 'border-red-500'

  const bgColor =
    m.result === 'TAK' ? 'bg-green-900/20' : 'bg-red-900/20'

  const resultColor =
    m.result === 'TAK' ? 'text-green-400' : 'text-red-400'

  return (
    <div className={cn('p-2 rounded border-l-4', borderColor, bgColor)}>
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-100">{m.room} #{m.pointNumber}</span>
        <span className="text-sm text-slate-400">
          {m.protectionType} {m.amperage}A
        </span>
        <span className={cn('font-bold', resultColor)}>{m.result}</span>
      </div>
      {!m.noGrounding && (
        <div className="text-xs text-slate-400 mt-1">
          Zs: {m.zsValue?.toFixed(2)} Ω (dop: {m.zsDop.toFixed(2)} Ω)
        </div>
      )}
    </div>
  )
}
