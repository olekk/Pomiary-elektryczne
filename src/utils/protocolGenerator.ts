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
 * @param buidlingAddress Numer mieszkania/lokalu
 * @returns Sformatowany numer protokołu
 */
export const generateProtocolNumber = (
  date: Date,
  apartmentNumber: string,
  buidlingAddress: string
): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  // Normalizuj numer mieszkania (usuń spacje, wielkie litery)
  const normalizedApartment = apartmentNumber.trim().toUpperCase()
  const normalizedBuildingAddress = buidlingAddress.trim().toUpperCase()

  return `PROT/${year}/${month}/${day}/${normalizedBuildingAddress}/${normalizedApartment}`
}
