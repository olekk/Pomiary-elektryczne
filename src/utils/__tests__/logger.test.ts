import { describe, it, expect, vi, afterEach } from 'vitest'
import { logger } from '../logger'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('logger', () => {
  it('forwards log calls to console.log with all arguments', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    logger.log('message', 123, { a: 1 })
    expect(spy).toHaveBeenCalledWith('message', 123, { a: 1 })
  })

  it('forwards warn calls to console.warn', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    logger.warn('careful')
    expect(spy).toHaveBeenCalledWith('careful')
  })

  it('forwards error calls to console.error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const err = new Error('boom')
    logger.error('failed:', err)
    expect(spy).toHaveBeenCalledWith('failed:', err)
  })
})
