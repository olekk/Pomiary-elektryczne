import React, { useState } from 'react'
import { Button, Input } from '../atoms'

interface CreateInspectionModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (
    address: string,
    apartmentNumber: string,
    ownerName: string
  ) => void
  defaultAddress?: string
  defaultApartmentNumber?: string
}

export const CreateInspectionModal: React.FC<CreateInspectionModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  defaultAddress = '',
  defaultApartmentNumber = '',
}) => {
  // Inicjalizuj stan z domyślnych wartości
  const [address, setAddress] = useState(defaultAddress)
  const [apartmentNumber, setApartmentNumber] = useState(defaultApartmentNumber)
  const [ownerName, setOwnerName] = useState('')

  if (!isOpen) return null

  const handleSubmit = () => {
    if (!address.trim() || !apartmentNumber.trim() || !ownerName.trim()) {
      alert('Wypełnij wszystkie pola!')
      return
    }

    onCreate(address, apartmentNumber, ownerName.trim())
    setAddress('')
    setApartmentNumber('')
    setOwnerName('')
  }

  const handleClose = () => {
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-700">
        <h2 className="text-xl font-bold text-slate-100 mb-4">Nowy Pomiar</h2>

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

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" fullWidth onClick={handleClose}>
            Anuluj
          </Button>
          <Button variant="primary" fullWidth onClick={handleSubmit}>
            Rozpocznij
          </Button>
        </div>
      </div>
    </div>
  )
}
