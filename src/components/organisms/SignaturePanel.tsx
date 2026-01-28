import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Card, Button } from '../atoms';

interface SignaturePanelProps {
  onSave: (signature: string) => void;
}

export const SignaturePanel: React.FC<SignaturePanelProps> = ({ onSave }) => {
  const signatureRef = useRef<SignatureCanvas>(null);
  const [hasSignature, setHasSignature] = useState(false);

  const handleClear = () => {
    signatureRef.current?.clear();
    setHasSignature(false);
  };

  const handleSave = () => {
    if (signatureRef.current) {
      const dataURL = signatureRef.current.toDataURL();
      onSave(dataURL);
      setHasSignature(true);
      alert('Podpis zapisany!');
    }
  };

  return (
    <Card>
      <h3 className="font-bold mb-3">Podpis</h3>
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
        <SignatureCanvas
          ref={signatureRef}
          canvasProps={{
            className: 'w-full h-48 bg-white',
          }}
          onEnd={() => setHasSignature(true)}
        />
      </div>
      <div className="flex gap-2 mt-3">
        <Button variant="secondary" fullWidth onClick={handleClear}>
          Wyczyść
        </Button>
        <Button variant="primary" fullWidth onClick={handleSave} disabled={!hasSignature}>
          Zapisz podpis
        </Button>
      </div>
    </Card>
  );
};
