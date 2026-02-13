/**
 * Logger utility — wraps console methods behind a dev-only guard.
 * In production builds, all log/warn calls become no-ops.
 * Errors are always logged regardless of environment.
 */

const isDev = import.meta.env.DEV

export const logger = {
  log: isDev
    ? (...args: unknown[]) => console.log(...args)
    : () => {},

  warn: isDev
    ? (...args: unknown[]) => console.warn(...args)
    : () => {},

  error: (...args: unknown[]) => console.error(...args),
}
