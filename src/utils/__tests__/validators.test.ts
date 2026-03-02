import { describe, it, expect } from 'vitest'
import {
  isNotEmpty,
  validateInspectionForm,
  validateMeasurementValue,
} from '../validators'

// ─── isNotEmpty ────────────────────────────────────────────────────────────────

describe('isNotEmpty', () => {
  it('returns true for non-empty string', () => {
    expect(isNotEmpty('hello')).toBe(true)
  })

  it('returns false for empty string', () => {
    expect(isNotEmpty('')).toBe(false)
  })

  it('returns false for whitespace-only string', () => {
    expect(isNotEmpty('   ')).toBe(false)
    expect(isNotEmpty('\t')).toBe(false)
    expect(isNotEmpty('\n')).toBe(false)
  })

  it('returns true for string with leading/trailing spaces but content', () => {
    expect(isNotEmpty('  hello  ')).toBe(true)
  })
})

// ─── validateInspectionForm ────────────────────────────────────────────────────

describe('validateInspectionForm', () => {
  it('returns valid for all non-empty fields', () => {
    const result = validateInspectionForm('ul. Testowa 1', '42', 'Jan Kowalski')
    expect(result).toEqual({ isValid: true })
  })

  it('returns error for empty address', () => {
    const result = validateInspectionForm('', '42', 'Jan')
    expect(result.isValid).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('returns error for whitespace-only address', () => {
    const result = validateInspectionForm('   ', '42', 'Jan')
    expect(result.isValid).toBe(false)
  })

  it('returns error for empty apartment number', () => {
    const result = validateInspectionForm('ul. Testowa 1', '', 'Jan')
    expect(result.isValid).toBe(false)
    expect(result.error).toMatch(/mieszkania/i)
  })

  it('returns error for empty technician name', () => {
    const result = validateInspectionForm('ul. Testowa 1', '42', '')
    expect(result.isValid).toBe(false)
    expect(result.error).toMatch(/technik/i)
  })

  it('validates in order: address first', () => {
    // All three empty — should return address error first
    const result = validateInspectionForm('', '', '')
    expect(result.error).toContain('Adres')
  })
})

// ─── validateMeasurementValue ──────────────────────────────────────────────────

describe('validateMeasurementValue', () => {
  it('returns valid for positive number string', () => {
    expect(validateMeasurementValue('2.88')).toEqual({ isValid: true })
  })

  it('returns valid for integer string', () => {
    expect(validateMeasurementValue('3')).toEqual({ isValid: true })
  })

  it('returns error for NaN', () => {
    const result = validateMeasurementValue('abc')
    expect(result.isValid).toBe(false)
    expect(result.error!.length).toBeGreaterThan(0)
  })

  it('returns error for empty string', () => {
    const result = validateMeasurementValue('')
    expect(result.isValid).toBe(false)
  })

  it('returns error for zero with meaningful message', () => {
    const result = validateMeasurementValue('0')
    expect(result.isValid).toBe(false)
  })

  it('returns error for negative value', () => {
    const result = validateMeasurementValue('-1.5')
    expect(result.isValid).toBe(false)
  })

  it('returns valid for very small positive value', () => {
    expect(validateMeasurementValue('0.01')).toEqual({ isValid: true })
  })

  it('returns valid for large value', () => {
    expect(validateMeasurementValue('999.99')).toEqual({ isValid: true })
  })
})
