/**
 * Ensures a value is converted to a Date object
 * Handles Date instances, timestamps, and date strings
 */
export const ensureDate = (date: Date | string | number): Date => {
  if (date instanceof Date) {
    return date
  }
  return new Date(date)
}
