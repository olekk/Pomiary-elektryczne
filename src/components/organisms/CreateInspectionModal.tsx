import React, { useState } from 'react';
import { Button, Input } from '../atoms';

interface CreateInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (address: string, apartmentNumber: string, technician: string) => void;
}

export const CreateInspectionModal: React.FC<CreateInspectionModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [address, setAddress] = useState('');
  const [apartmentNumber, setApartmentNumber] = useState('');
  const [technician, setTechnician] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!address.trim() || !apartmentNumber.trim() || !technician.trim()) {
      alert('Wypełnij wszystkie pola!');
      return;
    }

    onCreate(address, apartmentNumber, technician);
    setAddress('');
    setApartmentNumber('');
    setTechnician('');
  };

  const handleClose = () => {
    setAddress('');
    setApartmentNumber('');
    setTechnician('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Nowy Pomiar</h2>

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
            label="Technik"
            type="text"
            value={technician}
            onChange={(e) => setTechnician(e.target.value)}
            placeholder="Imię i nazwisko"
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
  );
};
