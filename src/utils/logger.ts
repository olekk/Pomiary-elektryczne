/**
 * Logger utility — wraps console methods.
 * All levels always log so that vConsole (activated via ?debug=1)
 * can capture them on mobile devices.
 */

export const logger = {
  log: (...args: unknown[]) => console.log(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
}
