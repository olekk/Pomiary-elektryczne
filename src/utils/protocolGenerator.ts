import { normalizeAddressForProtocol } from './addressHelper'

/**
 * Generator Numeru Protokołu
 * Centralne miejsce definiujące format numeru protokołu pomiarów.
 *
 * Format: ULICA_NUMER/MIESZKANIE/RRRR/MM/DD/PROT
 * Przykład: LESNA_5/42/2026/02/12/PROT
 */

/**
 * Generuje unikalny numer protokołu dla inspekcji
 * @param date Data pomiaru
 * @param apartmentNumber Numer mieszkania/lokalu
 * @param buildingStreet Ulica i numer budynku (bez kodu pocztowego i miasta)
 * @returns Sformatowany numer protokołu
 */
export const generateProtocolNumber = (
  date: Date,
  apartmentNumber: string,
  buildingStreet: string
): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  // Normalizuj numer mieszkania
  const normalizedApartment = apartmentNumber
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[,.]/g, '')

  // Normalizuj adres ulicy (używa helpera - usuwa "ul.", polskie znaki, etc.)
  const normalizedStreet = normalizeAddressForProtocol(buildingStreet)

  return `${normalizedStreet}/${normalizedApartment}/${year}/${month}/${day}/PROT`
}
