/**
 * Company ID generation utilities.
 *
 * Company IDs are stable forever: slug(initialName) + "-" + 6-char random suffix.
 * Example: "HC INSTAL" → "hc-instal-a7k29m"
 */

/**
 * Generate a URL-safe slug from a string.
 * Handles Polish diacritics, lowercases, replaces spaces/special chars with hyphens.
 */
export function generateSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'l')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // non-alphanumeric → hyphen
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
}

/**
 * Generate a 6-character random alphanumeric suffix.
 */
function randomSuffix(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

/**
 * Generate a stable company ID from the initial company name.
 * Format: slug-xxxxxx (e.g. "hc-instal-a7k29m")
 *
 * This ID is used as the Firestore document path and NEVER changes,
 * even if the company display name is edited later.
 */
export function generateCompanyId(initialName: string): string {
  const slug = generateSlug(initialName)
  return `${slug}-${randomSuffix()}`
}
