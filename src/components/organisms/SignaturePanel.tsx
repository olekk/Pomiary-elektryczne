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
  const [isExpanded, setIsExpanded] = useState(false)

  const hasStoredSignature = Boolean(initialSignature && initialSignature.trim().length > 0)

  // Wczytaj istniejący podpis gdy canvas się pojawi (po rozwinięciu)
  useEffect(() => {
    if (isExpanded && initialSignature && signatureRef.current) {
      try {
        signatureRef.current.fromDataURL(initialSignature)
        setHasSignature(true)
      } catch (error) {
        console.error('Error loading signature:', error)
      }
    }
  }, [initialSignature, isExpanded])

  // Reset expanded state when the inspection changes (new initialSignature reference)
  useEffect(() => {
    setIsExpanded(false)
  }, [initialSignature])

  const handleClear = () => {
    signatureRef.current?.clear()
    setHasSignature(false)
  }

  const handleSave = () => {
    if (signatureRef.current) {
      const dataURL = signatureRef.current.toDataURL()

      // onSave już aktualizuje store natychmiast i synchronizuje w tle
      const result = onSave(dataURL)

      // Jeśli onSave zwraca Promise, obsługujemy błędy w tle
      if (result instanceof Promise) {
        result.catch((error) => {
          console.error('❌ Error saving signature:', error)
          // Podpis już zapisany lokalnie, sync nastąpi później
        })
      }

      setHasSignature(true)
      setIsExpanded(false)
    }
  }

  // Collapsed state: show preview or "sign" button
  if (!isExpanded) {
    return (
      <Card className="mb-4">
        <h3 className="font-bold text-slate-100 mb-3">Podpis</h3>
        {hasStoredSignature ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-700 bg-slate-950 p-2">
              <img src={initialSignature} alt="Podgląd podpisu właściciela" className="w-full h-32 object-contain rounded bg-white" />
            </div>
            <Button variant="secondary" fullWidth onClick={() => setIsExpanded(true)}>
              Zmień / Edytuj podpis
            </Button>
          </div>
        ) : (
          <Button variant="primary" fullWidth onClick={() => setIsExpanded(true)}>
            Złóż podpis
          </Button>
        )}
      </Card>
    )
  }

  // Expanded state: show signature canvas
  return (
    <div className="space-y-3 mb-4">
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
            disabled={!hasSignature}
          >
            Zapisz podpis
          </Button>
        </div>
      </Card>
      <Button variant="secondary" fullWidth onClick={() => setIsExpanded(false)}>
        Anuluj i zwiń panel
      </Button>
    </div>
  )
}
