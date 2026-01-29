export type ProtectionType = 'WNP' | 'BI'
export type Amperage = 16 | 20 | 25

export interface Measurement {
  id: string
  pointNumber: number
  protectionType: ProtectionType
  amperage: Amperage
  kFactor: number
  zsValue: number | null // Zmierzony Zs
  zsDop: number // Dopuszczalny Zs
  result: 'TAK' | 'NIE' | 'B.UZ' // Ocena
  noGrounding?: boolean // Brak uziemienia
}

export interface Project {
  id: string
  name: string
  createdAt: Date
  status: 'active' | 'archived'
}

export interface Inspection {
  id?: string
  projectId: string // WYMAGANE - każdy pomiar musi należeć do projektu
  address: string
  apartmentNumber: string
  date: Date
  technician: string
  measurements: Measurement[]
  signature?: string // Base64
  synced?: boolean
}

// Tabela dopuszczalnych impedancji (uproszczona)
export const ZS_DOP_TABLE: Record<ProtectionType, Record<Amperage, number>> = {
  WNP: {
    16: 2.88,
    20: 2.3,
    25: 1.84,
  },
  BI: {
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
