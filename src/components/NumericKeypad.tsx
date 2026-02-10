import React from 'react'
import { AlertCircle, XCircle } from 'lucide-react'
import type { NoGroundingType } from '../types'

interface NumericKeypadProps {
  value: string
  onValueChange: (value: string) => void
  onEnter: () => void
  onNoGrounding: (type: NoGroundingType) => void
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({
  value,
  onValueChange,
  onEnter,
  onNoGrounding,
}) => {
  const handlePress = (digit: string) => {
    if (digit === '.' && value.includes('.')) return
    if (value === '0' && digit !== '.') {
      onValueChange(digit)
    } else {
      onValueChange(value + digit)
    }
  }

  const handleClear = () => {
    onValueChange('0')
  }

  const buttons = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    ['C', '0', '.'],
  ]

  return (
    <div className="w-full bg-slate-900 p-4 rounded-lg border border-slate-700">
      {/* Display */}
      <div className="bg-slate-800 rounded-lg mb-4 p-6 text-right border border-slate-700">
        <div className="text-4xl font-bold text-slate-100 font-mono">
          {value} Ω
        </div>
      </div>

      {/* Keypad Grid */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        {buttons.map((row, rowIdx) => (
          <React.Fragment key={rowIdx}>
            {row.map((btn) => (
              <button
                key={btn}
                onClick={() => {
                  if (btn === 'C') handleClear()
                  else handlePress(btn)
                }}
                className="bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-2xl font-semibold text-slate-100 p-6 rounded-lg border border-slate-700 transition-colors"
              >
                {btn}
              </button>
            ))}
          </React.Fragment>
        ))}
      </div>

      {/* Action Buttons - 3 buttons in grid */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => onNoGrounding('NO_PIN')}
          className="bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-white p-6 rounded-lg shadow-md flex flex-col items-center justify-center font-semibold transition-colors"
        >
          <AlertCircle size={20} />
          <span className="text-xs mt-1">BRAK BOLCA</span>
        </button>
        <button
          onClick={() => onNoGrounding('NO_CONN')}
          className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white p-6 rounded-lg shadow-md flex flex-col items-center justify-center font-semibold transition-colors"
        >
          <XCircle size={20} />
          <span className="text-xs mt-1">BRAK POŁ.</span>
        </button>
        <button
          onClick={onEnter}
          className="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white p-6 rounded-lg shadow-md text-xl font-bold transition-colors"
        >
          ENTER ✓
        </button>
      </div>
    </div>
  )
}
