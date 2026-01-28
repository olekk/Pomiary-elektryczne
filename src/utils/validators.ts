/**
 * Validate if a string is not empty
 */
export const isNotEmpty = (value: string): boolean => {
  return value.trim().length > 0;
};

/**
 * Validate inspection form data
 */
export const validateInspectionForm = (
  address: string,
  apartmentNumber: string,
  technician: string
): { isValid: boolean; error?: string } => {
  if (!isNotEmpty(address)) {
    return { isValid: false, error: 'Adres jest wymagany' };
  }
  
  if (!isNotEmpty(apartmentNumber)) {
    return { isValid: false, error: 'Numer mieszkania jest wymagany' };
  }
  
  if (!isNotEmpty(technician)) {
    return { isValid: false, error: 'Imię technika jest wymagane' };
  }
  
  return { isValid: true };
};

/**
 * Validate measurement value
 */
export const validateMeasurementValue = (value: string): { isValid: boolean; error?: string } => {
  const zsValue = parseFloat(value);
  
  if (isNaN(zsValue)) {
    return { isValid: false, error: 'Wprowadź poprawną wartość liczbową' };
  }
  
  if (zsValue <= 0) {
    return { isValid: false, error: 'Wartość musi być większa od 0' };
  }
  
  return { isValid: true };
};
