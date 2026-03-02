import React, { useId } from 'react'

interface SelectOption {
  value: string | number
  label: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: SelectOption[]
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  className = '',
  id: externalId,
  ...props
}) => {
  const autoId = useId()
  const selectId = externalId || autoId

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-semibold text-slate-300 mb-1">{label}</label>
      )}
      <select
        id={selectId}
        className={`w-full p-3 border border-slate-700 rounded-lg text-lg bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
