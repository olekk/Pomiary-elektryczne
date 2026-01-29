/**
 * Generate a unique inspection ID
 */
export const generateInspectionId = (): string => {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 11)
  return `insp_${timestamp}_${random}`
}

/**
 * Generate a unique measurement ID
 */
export const generateMeasurementId = (): string => {
  const timestamp = Date.now()
  const random = Math.random()
  return `m-${timestamp}-${random}`
}
