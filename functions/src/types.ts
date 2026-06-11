/**
 * Shared types for PDF generation.
 * Duplicated from src/types/index.ts — only the types needed for rendering.
 */

export type ProtectionType = 'WNP' | 'BI'
export type Amperage = 10 | 16 | 20 | 25
export type NoGroundingType = 'NO_PIN' | 'NO_CONN' | 'HIGH_Z' | null
export type Room = 'Łazienka' | 'Kuchnia' | (string & {})
export type SocketType = 'Gniazdo 230V' | 'Gniazdo IP44'
export type UnitType = 'mieszkanie' | 'lokal' | 'klatka'

export type PrzylaczType = 'napowietrzne' | 'kabelowe'
export type PwpStatus = 'jest' | 'brak'
export type JestBrak = 'jest' | 'brak'
export type TakNie = 'tak' | 'nie'
export type DobryZly = 'dobry' | 'zły'

export interface KlatkaData {
  przylacze: PrzylaczType
  typKabla?: string
  przekrojPrzylacza?: string
  pwpStatus: PwpStatus
  pwpLokalizacja?: string
  zabezpieczenieTyp?: string
  zabezpieczenieWartosc?: string
  glzTyp?: string
  glzPrzekroj?: string
  wlzTyp?: string
  wlzPrzekroj?: string
  stanIzolacji?: DobryZly
  przewodPE?: JestBrak
  przewodPETyp?: string
  przewodPEPrzekroj?: string
  rodzajObudowy?: 'metalowa' | 'drewniana'
  uziemioneDrzwiczki?: TakNie
  tabliceLokalizacja?: 'klatka' | 'mieszkania'
  iloscLokali?: string
  ochronnikTyp?: JestBrak
  urzadzeniePKradziezy?: JestBrak
  tablicaAdmLokalizacja?: string
  wylaczniki?: 'topikowe' | 'nadmiarowo-pradowy'
  klatkaVoltage?: '230V' | '24V'
  klatkaPrzewod?: string
  klatkaAutomat?: 'automat-schodowy' | 'czujnik-ruchu'
  strychMontaz?: 'natynkowo' | 'podtynkowo'
  piwnicaMontaz?: 'natynkowo' | 'podtynkowo'
  rezystancjaWLZ?: 'w-normie' | 'niezgodne'
  napiecieL1?: string
  napiecieL2?: string
  napiecieL3?: string
  piorunochron?: JestBrak
  piorunochronStan?: DobryZly
  piorunochronUwagi?: string
  piorunochronWynik?: 'pozytywny' | 'negatywny'
  ocenaInstalacji?: 'nadaje' | 'nie-nadaje'
  terminUsterek?: string
}

export interface Measurement {
  id: string
  pointNumber: number
  room: Room
  protectionType: ProtectionType
  amperage: Amperage
  zsValue: number | null
  zsDop: number
  result: 'TAK' | 'NIE'
  noGrounding?: NoGroundingType
  socketType: SocketType
}

export type InspectionStatus = 'COMPLETED' | 'INACCESSIBLE'

export interface Inspection {
  id?: string
  projectId: string
  buildingId: string
  address: string
  apartmentNumber: string
  ownerName?: string
  date: Date
  technicianName: string
  technicianLicenseNumber?: string
  technicianSignature?: string
  notes?: string
  measurements: Measurement[]
  ownerSignature?: string
  protocolNumber: string
  synced?: boolean
  status?: InspectionStatus
  unitType?: UnitType
  klatkaData?: KlatkaData
}
