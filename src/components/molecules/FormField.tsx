import React from 'react'
import { Input, Select } from '../atoms'

interface FormFieldProps {
  label: string
  type?: 'text' | 'select'
  value: string | number
  onChange: (value: string) => void
  placeholder?: string
  options?: Array<{ value: string | number; label: string }>
  required?: boolean
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  options,
  required = false,
}) => {
  if (type === 'select' && options) {
    return (
      <Select
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        options={options}
        required={required}
      />
    )
  }

  return (
    <Input
      label={label}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
    />
  )
}
