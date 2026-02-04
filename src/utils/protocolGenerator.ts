/**
 * Generator Numeru Protokołu
 * Centralne miejsce definiujące format numeru protokołu pomiarów.
 *
 * Format: RRRR/MM/NRMIESZKANIA
 * Przykład: 2026/02/15A
 */

/**
 * Generuje unikalny numer protokołu dla inspekcji
 * @param date Data pomiaru
 * @param apartmentNumber Numer mieszkania/lokalu
 * @returns Sformatowany numer protokołu
 */
export const generateProtocolNumber = (
  date: Date,
  apartmentNumber: string
): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')

  // Normalizuj numer mieszkania (usuń spacje, wielkie litery)
  const normalizedApartment = apartmentNumber.trim().toUpperCase()

  return `${year}/${month}/${normalizedApartment}`
}
