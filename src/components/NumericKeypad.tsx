import React from 'react'
import { Delete, AlertCircle } from 'lucide-react'

interface NumericKeypadProps {
  value: string
  onValueChange: (value: string) => void
  onEnter: () => void
  onNoGrounding: () => void
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

  const handleBackspace = () => {
    onValueChange(value.slice(0, -1) || '0')
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
    <div className="w-full bg-gray-50 p-4 rounded-lg shadow-inner">
      {/* Display */}
      <div className="bg-white rounded-lg mb-4 p-6 text-right border-2 border-blue-200">
        <div className="text-4xl font-bold text-gray-800 font-mono">
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
                className="bg-white hover:bg-gray-100 active:bg-gray-200 text-2xl font-semibold text-gray-800 p-6 rounded-lg shadow-md border border-gray-300 transition-colors"
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
          onClick={handleBackspace}
          className="bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-white p-6 rounded-lg shadow-md flex items-center justify-center gap-2 font-semibold transition-colors"
        >
          <Delete size={20} />
          <span className="text-sm">Cofnij</span>
        </button>
        <button
          onClick={onEnter}
          className="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white p-6 rounded-lg shadow-md text-xl font-bold transition-colors"
        >
          ENTER ✓
        </button>
        <button
          onClick={onNoGrounding}
          className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white p-6 rounded-lg shadow-md flex items-center justify-center gap-1 font-semibold transition-colors"
        >
          <AlertCircle size={20} />
          <span className="text-sm">B.UZ</span>
        </button>
      </div>
    </div>
  )
}
