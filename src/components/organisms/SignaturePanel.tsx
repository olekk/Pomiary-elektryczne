import React, { useRef, useState, useEffect } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { Card, Button } from '../atoms'

interface SignaturePanelProps {
  onSave: (signature: string) => Promise<void> | void
  initialSignature?: string
}

export const SignaturePanel: React.FC<SignaturePanelProps> = ({
  onSave,
  initialSignature,
}) => {
  const signatureRef = useRef<SignatureCanvas>(null)
  const [hasSignature, setHasSignature] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Wczytaj istniejący podpis przy inicjalizacji
  useEffect(() => {
    if (initialSignature && signatureRef.current) {
      try {
        signatureRef.current.fromDataURL(initialSignature)
        setHasSignature(true)
      } catch (error) {
        console.error('Error loading signature:', error)
      }
    }
  }, [initialSignature])

  const handleClear = () => {
    signatureRef.current?.clear()
    setHasSignature(false)
  }

  const handleSave = async () => {
    if (signatureRef.current && !isSaving) {
      const dataURL = signatureRef.current.toDataURL()

      setIsSaving(true)
      try {
        await onSave(dataURL)
        setHasSignature(true)
      } catch (error) {
        console.error('Error saving signature:', error)
        alert('Błąd podczas zapisywania podpisu')
      } finally {
        setIsSaving(false)
      }
    }
  }

  return (
    <Card>
      <h3 className="font-bold text-slate-100 mb-3">Podpis</h3>
      <div className="border-2 border-slate-700 rounded-lg overflow-hidden shadow-lg">
        <SignatureCanvas
          ref={signatureRef}
          canvasProps={{
            className: 'w-full h-48 bg-white cursor-crosshair',
          }}
          onEnd={() => setHasSignature(true)}
        />
      </div>
      <div className="flex gap-2 mt-3">
        <Button variant="secondary" fullWidth onClick={handleClear}>
          Wyczyść
        </Button>
        <Button
          variant="primary"
          fullWidth
          onClick={handleSave}
          disabled={!hasSignature || isSaving}
        >
          {isSaving ? 'Zapisywanie...' : 'Zapisz podpis'}
        </Button>
      </div>
    </Card>
  )
}
