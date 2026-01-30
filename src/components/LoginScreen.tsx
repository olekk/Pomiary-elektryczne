import React, { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'
import { Input } from './atoms/Input'
import { Button } from './atoms/Button'
import { AlertCircle, Loader } from 'lucide-react'

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await signInWithEmailAndPassword(auth, email, password)
      // onAuthStateChanged w App.tsx automatycznie obsłuży nawigację
    } catch (err: unknown) {
      console.error('Błąd logowania:', err)

      // Obsługa typowych błędów Firebase Auth
      if (err instanceof Error) {
        const errorCode = (err as { code?: string }).code

        switch (errorCode) {
          case 'auth/invalid-email':
            setError('Nieprawidłowy format adresu email')
            break
          case 'auth/user-disabled':
            setError('To konto zostało zablokowane')
            break
          case 'auth/user-not-found':
            setError('Nie znaleziono użytkownika z tym adresem email')
            break
          case 'auth/wrong-password':
            setError('Nieprawidłowe hasło')
            break
          case 'auth/invalid-credential':
            setError('Nieprawidłowy email lub hasło')
            break
          case 'auth/network-request-failed':
            setError('Brak połączenia z internetem')
            break
          default:
            setError('Błąd logowania. Spróbuj ponownie.')
        }
      } else {
        setError('Wystąpił nieznany błąd')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 p-8 w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">
            Pomiary Elektryczne
          </h1>
          <p className="text-slate-400">Zaloguj się do aplikacji</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            type="email"
            label="Email"
            placeholder="twoj@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={isLoading}
          />

          <Input
            type="password"
            label="Hasło"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            disabled={isLoading}
          />

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Login Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={isLoading}
            icon={
              isLoading ? (
                <Loader size={20} className="animate-spin" />
              ) : undefined
            }
          >
            {isLoading ? 'Logowanie...' : 'Zaloguj'}
          </Button>
        </form>

        {/* Forgot Password (UI only) */}
        <div className="mt-6 text-center">
          <button
            type="button"
            className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
            onClick={() => alert('Skontaktuj się z administratorem systemu')}
          >
            Zapomniałeś hasła?
          </button>
        </div>

        {/* Footer Info */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <p className="text-xs text-slate-500 text-center">
            Konta są zarządzane przez administratora.
            <br />
            Skontaktuj się z działem IT, jeśli potrzebujesz dostępu.
          </p>
        </div>
      </div>
    </div>
  )
}
