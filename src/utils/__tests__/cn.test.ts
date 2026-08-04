import { describe, it, expect } from 'vitest'
import { cn } from '../cn'

describe('cn', () => {
  it('joins multiple class strings', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('drops falsy values', () => {
    const disabled: boolean = false
    expect(cn('a', disabled && 'b', undefined, null, '')).toBe('a')
  })

  it('supports conditional object syntax', () => {
    expect(cn('base', { active: true, hidden: false })).toBe('base active')
  })

  it('merges conflicting Tailwind classes (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
    expect(cn('bg-slate-900', 'bg-slate-800')).toBe('bg-slate-800')
  })

  it('keeps non-conflicting Tailwind classes', () => {
    expect(cn('p-2', 'text-slate-100')).toBe('p-2 text-slate-100')
  })
})
