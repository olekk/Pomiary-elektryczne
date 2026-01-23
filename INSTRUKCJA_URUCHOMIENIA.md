# 📋 Instrukcja Uruchomienia - Pomiary Elektryczne

## Krok 1: Instalacja Zależności ✅

Wszystkie zależności zostały już zainstalowane. Projekt zawiera:
- React 19 + TypeScript
- Tailwind CSS
- Firebase (Firestore + Auth)
- Zustand (state management)
- React Router
- React PDF Renderer
- React Signature Canvas
- Lucide React (ikony)

## Krok 2: Konfiguracja Firebase 🔥

**WAŻNE:** Musisz skonfigurować własny projekt Firebase!

1. Przejdź do [Firebase Console](https://console.firebase.google.com/)
2. Utwórz nowy projekt
3. Włącz **Firestore Database**:
   - Tryb: Production lub Test
   - Lokalizacja: europe-central2 (Warszawa)
4. Włącz **Authentication**:
   - Metoda: Anonymous
5. W ustawieniach projektu skopiuj konfigurację
6. Otwórz plik `src/firebase.ts`
7. Zastąp placeholdery swoimi wartościami:

```typescript
const firebaseConfig = {
  apiKey: "TWÓJ_API_KEY",
  authDomain: "TWÓJ_PROJECT_ID.firebaseapp.com",
  projectId: "TWÓJ_PROJECT_ID",
  storageBucket: "TWÓJ_PROJECT_ID.appspot.com",
  messagingSenderId: "TWÓJ_MESSAGING_SENDER_ID",
  appId: "TWÓJ_APP_ID"
};
```

## Krok 3: Ikony PWA 📱

Aby mieć pełną funkcjonalność PWA, wygeneruj ikony:

**Opcja A - Użyj dowolnego narzędzia online:**
1. Utwórz logo aplikacji (najlepiej 512x512 px)
2. Użyj np. [RealFaviconGenerator](https://realfavicongenerator.net/)
3. Wygeneruj ikony 192x192 i 512x512
4. Zapisz je jako `public/icon-192.png` i `public/icon-512.png`

**Opcja B - Szybkie ikony placeholder:**
Możesz tymczasowo użyć dowolnych obrazów PNG 192x192 i 512x512 px.

## Krok 4: Uruchomienie Aplikacji 🚀

```bash
# Uruchom serwer deweloperski
npm run dev
```

Aplikacja będzie dostępna pod adresem: `http://localhost:3000`

## Krok 5: Build Production 🏗️

```bash
# Zbuduj wersję produkcyjną
npm run build

# Podejrzyj build
npm run preview
```

## Krok 6: Testowanie PWA 📲

### Na komputerze:
1. Otwórz Chrome DevTools (F12)
2. Zakładka "Application" → "Service Workers"
3. Sprawdź czy service worker się zarejestrował

### Na telefonie:
1. Wdróż aplikację na hosting (np. Firebase Hosting, Vercel, Netlify)
2. Otwórz w przeglądarce mobilnej
3. **iOS**: Kliknij przycisk "Udostępnij" → "Dodaj do ekranu głównego"
4. **Android**: Menu → "Zainstaluj aplikację" lub "Dodaj do ekranu głównego"

## 🎯 Jak używać aplikacji?

1. **Dashboard**: 
   - Zobacz listę wszystkich pomiarów
   - Kliknij "+" aby rozpocząć nowy pomiar
   
2. **Nowy pomiar**:
   - Podaj adres, numer mieszkania, nazwisko technika
   - Kliknij "Rozpocznij"
   
3. **Wprowadzanie pomiarów**:
   - Ustaw typ zabezpieczenia (WNP/BI)
   - Ustaw amperaż (16A/20A/25A)
   - Wpisz wartość Zs używając klawiatury na ekranie
   - Kliknij "ENTER" aby dodać punkt
   - Aplikacja automatycznie skopiuje ustawienia do następnego punktu
   - Dla punktów bez uziemienia kliknij "Brak Uziemienia (B.UZ)"
   
4. **Zapisanie**:
   - Kliknij "Zapisz i Przejdź Dalej"
   - Dodaj podpis cyfrowy
   - Wygeneruj PDF

## 🔧 Rozwiązywanie problemów

### Firebase nie działa:
- Sprawdź czy skopiowałeś poprawną konfigurację
- Upewnij się że włączyłeś Anonymous Auth
- Sprawdź reguły Firestore (mogą być zbyt restrykcyjne)

### PWA nie instaluje się:
- Upewnij się że używasz HTTPS (lokalne http://localhost jest OK)
- Sprawdź czy ikony istnieją
- Sprawdź Console w DevTools czy są błędy

### Brak danych offline:
- Firebase automatycznie cache'uje dane
- Service Worker cache'uje statyczne zasoby
- Sprawdź czy Persistence się włączyło (zobacz console)

## 📞 Wsparcie

Jeśli masz problemy:
1. Sprawdź Console w przeglądarce (F12)
2. Sprawdź zakładkę "Network" czy requesty wychodzą
3. Sprawdź "Application" → "IndexedDB" czy dane się zapisują

## 🎉 Gotowe!

Aplikacja jest w pełni funkcjonalna. Możesz ją dostosować do swoich potrzeb edytując:
- `src/types/index.ts` - logikę elektryczną (tabele Zs_dop)
- `src/components/` - wygląd komponentów
- `src/store/useInspectionStore.ts` - logikę biznesową
