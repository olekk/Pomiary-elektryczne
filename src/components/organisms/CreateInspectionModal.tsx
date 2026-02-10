import React, { useState } from 'react'
import { Button, Input } from '../atoms'
import type { Inspection } from '../../types'

function deriveInitialValue(
  editingInspection: Inspection | null,
  field: keyof Inspection,
  fallback: string
): string {
  if (editingInspection) {
    return (editingInspection[field] as string) || ''
  }
  return fallback
}

interface CreateInspectionModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (
    address: string,
    apartmentNumber: string,
    ownerName: string
  ) => void
  onMarkInaccessible?: (
    address: string,
    apartmentNumber: string,
    ownerName: string
  ) => void
  onResumeInspection?: (
    inspection: Inspection,
    address: string,
    apartmentNumber: string,
    ownerName: string
  ) => void
  defaultAddress?: string
  defaultApartmentNumber?: string
  editingInspection?: Inspection | null
}

export const CreateInspectionModal: React.FC<CreateInspectionModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  onMarkInaccessible,
  onResumeInspection,
  defaultAddress = '',
  defaultApartmentNumber = '',
  editingInspection = null,
}) => {
  // Stan inicjalizowany z props — komponent jest key-owany w rodzicu,
  // więc zmiana editingInspection/defaults powoduje nowy mount (nowy stan).
  const [address, setAddress] = useState(
    deriveInitialValue(editingInspection, 'address', defaultAddress)
  )
  const [apartmentNumber, setApartmentNumber] = useState(
    deriveInitialValue(
      editingInspection,
      'apartmentNumber',
      defaultApartmentNumber
    )
  )
  const [ownerName, setOwnerName] = useState(
    deriveInitialValue(editingInspection, 'ownerName', '')
  )

  if (!isOpen) return null

  const isResumeMode = !!editingInspection

  const validateFields = (requireOwner = true): boolean => {
    if (!address.trim() || !apartmentNumber.trim()) {
      alert('Wypełnij adres i numer mieszkania!')
      return false
    }
    if (requireOwner && !ownerName.trim()) {
      alert('Wypełnij wszystkie pola!')
      return false
    }
    return true
  }

  const resetForm = () => {
    setAddress('')
    setApartmentNumber('')
    setOwnerName('')
  }

  const handleSubmit = () => {
    if (!validateFields()) return

    if (isResumeMode && onResumeInspection) {
      onResumeInspection(
        editingInspection,
        address.trim(),
        apartmentNumber.trim(),
        ownerName.trim()
      )
    } else {
      onCreate(address.trim(), apartmentNumber.trim(), ownerName.trim())
    }
    resetForm()
  }

  const handleInaccessible = () => {
    if (!validateFields(false)) return

    onMarkInaccessible?.(
      address.trim(),
      apartmentNumber.trim(),
      ownerName.trim()
    )
    resetForm()
  }

  const handleClose = () => {
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-700">
        <h2 className="text-xl font-bold text-slate-100 mb-4">
          {isResumeMode ? 'Wznów pomiar' : 'Nowy Pomiar'}
        </h2>

        <div className="space-y-4">
          <Input
            label="Adres"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="np. ul. Kwiatowa 15"
          />

          <Input
            label="Numer mieszkania"
            type="text"
            value={apartmentNumber}
            onChange={(e) => setApartmentNumber(e.target.value)}
            placeholder="np. 42"
          />

          <Input
            label="Imię i nazwisko Właściciela/Najemcy"
            type="text"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="np. Jan Kowalski"
          />
        </div>

        <div className="flex flex-col gap-3 mt-6">
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={handleClose}>
              Anuluj
            </Button>
            <Button variant="primary" fullWidth onClick={handleSubmit}>
              {isResumeMode ? 'Rozpocznij pomiar' : 'Rozpocznij'}
            </Button>
          </div>

          {!isResumeMode && (
            <Button variant="warning" fullWidth onClick={handleInaccessible}>
              Niedostępne
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
