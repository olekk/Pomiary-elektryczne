export type ProtectionType = 'WNP' | 'BI'
export type Amperage = 10 | 16 | 20 | 25
export type NoGroundingType = 'NO_PIN' | 'NO_CONN' | 'HIGH_Z' | null
export type Room = 'Kuchnia' | 'Łazienka'

export interface Measurement {
  id: string
  pointNumber: number
  room: Room
  protectionType: ProtectionType
  amperage: Amperage
  zsValue: number | null // Zmierzony Zs
  zsDop: number // Dopuszczalny Zs
  result: 'TAK' | 'NIE' | 'B.UZ' // Ocena
  noGrounding?: NoGroundingType // Rodzaj braku uziemienia
}

export interface Project {
  id: string
  name: string
  createdAt: Date
  status: 'active' | 'archived'
}

export interface Building {
  id: string
  projectId: string
  name: string
  createdAt: Date
  updatedAt: Date
  userId: string
}

export interface Inspection {
  id?: string
  projectId: string // WYMAGANE - każdy pomiar musi należeć do projektu
  buildingId: string // WYMAGANE - każdy pomiar musi należeć do budynku
  address: string
  apartmentNumber: string
  ownerName?: string // Imię i nazwisko właściciela/najemcy
  date: Date
  technicianName: string
  technicianSignature?: string // Base64 podpisu technika (snapshot z ustawień)
  notes?: string
  measurements: Measurement[]
  ownerSignature?: string // Base64 podpisu właściciela/użytkownika
  protocolNumber: string // Unikalny numer protokołu
  synced?: boolean
}

export interface UserSettings {
  displayName: string
  signatureBase64: string
}

// Tabela dopuszczalnych impedancji (uproszczona)
export const ZS_DOP_TABLE: Record<ProtectionType, Record<Amperage, number>> = {
  WNP: {
    10: 4.6,
    16: 2.88,
    20: 2.3,
    25: 1.71,
  },
  BI: {
    10: 4.26,
    16: 2.66,
    20: 2.13,
    25: 1.7,
  },
}

// Domyślne współczynniki k
export const DEFAULT_K_FACTORS: Record<ProtectionType, number> = {
  WNP: 5,
  BI: 5.4,
}
