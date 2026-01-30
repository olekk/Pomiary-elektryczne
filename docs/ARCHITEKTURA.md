# 🏗️ Architektura Aplikacji - Pomiary Elektryczne

## 📁 Struktura Projektu (Atomic Design)

```
pomiary-elektryczne/
├── public/                      # Zasoby statyczne
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                   # Service Worker
│   ├── icon-192.png, icon-512.png  # Ikony PWA
│   └── fonts/                  # Roboto fonts
│
├── src/
│   ├── components/             # Komponenty React (Atomic Design)
│   │   ├── atoms/              # ⚛️ Podstawowe building blocks
│   │   │   ├── Badge.tsx       # Kolorowa etykieta
│   │   │   ├── Button.tsx      # Przycisk (z wariantami)
│   │   │   ├── Card.tsx        # Kontener z cieniem
│   │   │   ├── Input.tsx       # Pole tekstowe
│   │   │   ├── Select.tsx      # Lista rozwijana
│   │   │   └── index.ts        # Re-export
│   │   │
│   │   ├── molecules/          # 🧬 Proste kombinacje atomów
│   │   │   ├── FormField.tsx   # Label + Input + Error
│   │   │   ├── InspectionCard.tsx  # Karta pomiaru
│   │   │   ├── MeasurementListItem.tsx  # Element listy punktów
│   │   │   ├── StatsCard.tsx   # Karta statystyki
│   │   │   ├── StatusBadge.tsx # Badge online/offline + sync
│   │   │   └── index.ts        # Re-export
│   │   │
│   │   ├── organisms/          # 🦠 Złożone sekcje biznesowe
│   │   │   ├── CreateInspectionModal.tsx  # Modal tworzenia pomiaru
│   │   │   ├── DashboardHeader.tsx  # Nagłówek z wylogowaniem
│   │   │   ├── DashboardStats.tsx   # Sekcja statystyk
│   │   │   ├── InspectionsList.tsx  # Lista pomiarów
│   │   │   ├── MeasurementSettings.tsx  # Panel ustawień pomiaru
│   │   │   ├── SignaturePanel.tsx   # Panel podpisu
│   │   │   └── index.ts        # Re-export
│   │   │
│   │   ├── ProjectsScreen.tsx  # 📄 Ekran główny (lista projektów)
│   │   ├── ProjectDetailsScreen.tsx  # 📄 Szczegóły projektu (lista pomiarów)
│   │   ├── LoginScreen.tsx     # 🔐 Ekran logowania
│   │   ├── MeasurementScreen.tsx  # 📄 Ekran wprowadzania pomiarów
│   │   ├── NumericKeypad.tsx   # ⌨️ Klawiatura numeryczna
│   │   ├── PdfGenerator.tsx    # 📄 Generator PDF
│   │   └── SummaryScreen.tsx   # 📄 Podsumowanie
│   │
│   ├── services/               # 🔥 Integracje zewnętrzne
│   │   ├── firebaseService.ts  # CRUD operations (Firestore)
│   │   └── index.ts            # Re-export
│   │
│   ├── utils/                  # 🛠️ Pure functions
│   │   ├── idGenerator.ts      # Generowanie ID
│   │   ├── measurementCalculations.ts  # Zs_dop, wyniki
│   │   ├── validators.ts       # Walidacja danych
│   │   └── index.ts            # Re-export
│   │
│   ├── store/                  # 🗄️ State management (Slices Pattern)
│   │   ├── slices/             # Store slices
│   │   │   ├── authSlice.ts    # Autoryzacja (user)
│   │   │   ├── projectSlice.ts # Projekty
│   │   │   ├── inspectionSlice.ts  # Przeglądy i pomiary
│   │   │   ├── offlineSlice.ts # Offline & settings
│   │   │   └── index.ts        # Re-export
│   │   ├── useAppStore.ts      # Główny store (łączy wszystkie slice'y)
│   │   └── index.ts            # Re-export
│   │
│   ├── types/                  # 📝 TypeScript types
│   │   └── index.ts            # Typy i stałe
│   │
│   ├── App.tsx                 # 🔐 Routing + Auth Guard
│   ├── main.tsx                # Entry point
│   ├── firebase.ts             # Konfiguracja Firebase (Auth + Firestore)
│   └── index.css               # Style globalne
│
├── docs/                       # 📚 Dokumentacja
│   ├── ARCHITEKTURA.md         # Struktura i autoryzacja
│   ├── ARCHITECTURE_REFACTORING.md  # Historia refactoringu
│   ├── CHANGELOG.md            # Historia zmian
│   └── ...                     # Inne dokumenty
│
├── dist/                       # Build output (generowany)
├── node_modules/               # Zależności
│
├── index.html                  # HTML template
├── vite.config.ts              # Konfiguracja Vite + PWA
├── tailwind.config.js          # Konfiguracja Tailwind
├── postcss.config.js           # Konfiguracja PostCSS
├── tsconfig.json               # Konfiguracja TypeScript
├── package.json                # Zależności i skrypty
│
└── README.md                   # Dokumentacja główna
```

## 🔐 System Autoryzacji (Firebase Auth)

### Architektura Autentykacji

```
┌─────────────────────────────────────────────────────────┐
│                        App.tsx                           │
│  onAuthStateChanged() → Nasłuchuje zmian sesji          │
└──────────────┬──────────────────────┬───────────────────┘
               │                      │
      user === null           user !== null
               │                      │
               ▼                      ▼
    ┌──────────────────┐   ┌──────────────────────────┐
    │  LoginScreen     │   │  BrowserRouter           │
    │  - Email/Hasło   │   │  - Dashboard             │
    │  - Error Handling│   │  - MeasurementScreen     │
    │  - Offline Info  │   │  - SummaryScreen         │
    └──────────────────┘   └──────────────────────────┘
```

### Kluczowe Komponenty Autoryzacji

#### 1. **firebase.ts**

```typescript
import { getAuth } from 'firebase/auth'

const auth = getAuth(app) // Instancja Firebase Auth
export { auth }

// Firebase Auth automatycznie cache'uje sesję w LocalStorage
// → Działa offline! 👍
```

#### 2. **App.tsx - Auth Guard**

```typescript
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      setUser(firebaseUser)  // Zapisz do Zustand Store
    } else {
      setUser(null)
    }
  })
  return () => unsubscribe()
}, [])

// Warunkowe renderowanie
if (!user) return <LoginScreen />
return <BrowserRouter>{/* Routes */}</BrowserRouter>
```

#### 3. **LoginScreen.tsx**

```typescript
const handleLogin = async (e) => {
  await signInWithEmailAndPassword(auth, email, password)
  // onAuthStateChanged automatycznie przekieruje do Dashboard
}

// Obsługa błędów z czytelnymi komunikatami PL:
// - auth/invalid-credential → "Nieprawidłowy email lub hasło"
// - auth/network-request-failed → "Brak połączenia z internetem"
// - itd.
```

#### 4. **Dashboard.tsx - Wylogowanie**

```typescript
const handleLogout = async () => {
  if (confirm('Czy na pewno chcesz się wylogować?')) {
    await signOut(auth)
    // onAuthStateChanged automatycznie przekieruje do LoginScreen
  }
}

// Przycisk wylogowania w DashboardHeader (ikona LogOut)
```

#### 5. **useAppStore.ts - User State (via AuthSlice)**

Store zarządza stanem użytkownika poprzez `authSlice`:

```typescript
// authSlice.ts
interface AuthSlice {
  user: User | null // Firebase User
  setUser: (user: User | null) => void
}

// useAppStore.ts - łączy wszystkie slice'y
type AppStore = AuthSlice & ProjectSlice & InspectionSlice & OfflineSlice
```

### Offline Support

**Firebase Auth cache'uje token w LocalStorage:**

- ✅ Użytkownik loguje się online
- ✅ Token zapisany lokalnie
- ✅ Wyłączenie internetu → Użytkownik **nadal zalogowany**
- ✅ Odświeżenie strony → Sesja **zachowana**
- ❌ Próba logowania offline → Komunikat "Brak połączenia z internetem"

### Firestore Rules (wymagane w Firebase Console)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /inspections/{inspection} {
      // Tylko zalogowani użytkownicy mogą czytać/pisać
      allow read, write: if request.auth != null;
    }
  }
}
```

### Tworzenie Użytkowników

**Ręcznie w Firebase Console:**

1. Firebase Console → Authentication → Users
2. Add user → Email + Password
3. Brak publicznej rejestracji w App (zgodnie z założeniem MVP)

---

## 🔄 Przepływ Danych (Data Flow)

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER INTERFACE                               │
│  (LoginScreen → ProjectsScreen → ProjectDetailsScreen →         │
│   MeasurementScreen → Summary)                                   │
└────────────────┬────────────────────────┬─────────────────────┘
                 │                        │
                 ▼                        ▼
         ┌───────────────┐        ┌──────────────┐
         │  Zustand Store │◄──────►│ Firebase Auth│
         │ (projects +    │        │ + Firestore  │
         │  inspections)  │        │              │
         └───────────────┘        └──────────────┘
                 │                        │
                 ▼                        ▼
         ┌───────────────┐        ┌──────────────┐
         │  IndexedDB    │        │    Cloud     │
         │  (Offline)    │        │  (Online)    │
         └───────────────┘        └──────────────┘
```

## 🧩 Komponenty - Szczegóły (Atomic Design)

### Zasady Atomic Design

**Atoms (Atomy):**

- Najmniejsze building blocks (Button, Input, Badge)
- Zero business logic, tylko UI
- Reużywalne w całej aplikacji

**Molecules (Molekuły):**

- Proste kombinacje atomów (FormField = Label + Input + Error)
- Minimalna logika wyświetlania
- Reużywalne w kontekście

**Organisms (Organizmy):**

- Złożone sekcje z business logic
- Używają atoms i molecules
- Specyficzne dla konkretnych ekranów

---

### ProjectsScreen.tsx (Główny Dashboard)

**Odpowiedzialność:** Lista projektów, tworzenie nowego projektu

**Stan lokalny:**

- `isLoading` - status ładowania
- `showNewModal` - widoczność modala tworzenia projektu
- `newProjectName` - nazwa nowego projektu

**Zustand actions:**

- `loadProjects()` - wczytanie listy projektów
- `createNewProject(name)` - utworzenie nowego projektu (offline ID: `proj_[timestamp]`)
- `deleteProject(id)` - usunięcie projektu

**Routing:**

- `/` → ProjectsScreen (Główny ekran po zalogowaniu)
- Kliknięcie "Otwórz projekt" → `/project/:id`

**Design:**

- Grid z kafelkami projektów (responsywne: 1-3 kolumny)
- Każdy kafelek: ikona folderu, nazwa projektu, data utworzenia
- Floating Action Button "+" do tworzenia nowego projektu
- Modal z formularzem (nazwa projektu)

---

### ProjectDetailsScreen.tsx (Dawny Dashboard)

**Odpowiedzialność:** Lista pomiarów dla konkretnego projektu

**Zmiana od wersji Dashboard.tsx:**

- Pobiera `projectId` z URL (`useParams`)
- Wywołuje `loadInspections(projectId)` zamiast `loadInspections()`
- Wyświetla tylko pomiary należące do danego projektu
- Przycisk "Powrót" (← ikona) prowadzący do `/` (ProjectsScreen)

**Stan lokalny:**

- `isLoading` - status ładowania
- `showNewModal` - widoczność modala

**Zustand actions:**

- `loadInspections(projectId)` - wczytanie listy pomiarów dla projektu
- `createNewInspection(projectId, ...)` - utworzenie nowego pomiaru
- `deleteInspection(id)` - usunięcie
- `retryPendingSync()` - ponowna synchronizacja offline

**Routing:**

- `/project/:id` → ProjectDetailsScreen
- Kliknięcie "+" → Modal → `/measurement`

**OPTYMALIZACJA:**

Pobieranie danych odbywa się z query Firestore:

```typescript
where('projectId', '==', projectId)
```

Dzięki temu pobieramy tylko **mały wycinek bazy danych**, nie wszystkie pomiary.

---

### LoginScreen.tsx (🔐)

**Odpowiedzialność:** Ekran logowania użytkownika

**Stan lokalny:**

- `email` - wprowadzony email
- `password` - wprowadzone hasło
- `error` - komunikat błędu
- `isLoading` - status ładowania

**Firebase Auth:**

```typescript
await signInWithEmailAndPassword(auth, email, password)
```

**Obsługa błędów:**

- `auth/invalid-credential` → "Nieprawidłowy email lub hasło"
- `auth/network-request-failed` → "Brak połączenia z internetem"
- `auth/user-disabled` → "To konto zostało zablokowane"

**Design:**

- Gradientowe tło (blue-50 → blue-100)
- Wycentrowany formularz z białą kartą
- Wykorzystanie atomów: `Input`, `Button`
- Ikony: `AlertCircle`, `Loader` (lucide-react)

**Routing:**

- Nie jest w routerze - renderowany przez `App.tsx` warunkowo


### MeasurementScreen.tsx

**Odpowiedzialność:** Wprowadzanie pomiarów, Smart Defaults

**Stan lokalny:**

- `inputValue` - wartość z keypada
- `showNoGroundingModal` - modal B.UZ
- `nextProtectionType`, `nextAmperage`, `nextKFactor` - ustawienia

**Zustand actions:**

- `addMeasurement()` - dodanie punktu
- `removeMeasurement()` - usunięcie punktu
- `setLastDefaults()` - zapisanie Smart Defaults
- `saveToFirestore()` - zapis do bazy

**Logika:**

```typescript
// Smart Defaults
useEffect(() => {
  setNextProtectionType(lastProtectionType)
  setNextAmperage(lastAmperage)
  setNextKFactor(lastKFactor)
}, [lastProtectionType, lastAmperage, lastKFactor])

// Auto-update k factor
useEffect(() => {
  const defaultK = DEFAULT_K_FACTORS[nextProtectionType]
  setNextKFactor(defaultK)
}, [nextProtectionType])
```

**Routing:**

- `/measurement` → Nowy pomiar
- Kliknięcie "Zapisz" → `/summary`

---

### 3. NumericKeypad.tsx

**Odpowiedzialność:** Wprowadzanie wartości numerycznych

**Props:**

- `value: string` - aktualna wartość
- `onValueChange: (value: string) => void` - callback zmiany
- `onEnter: () => void` - callback ENTER

**Logika:**

```typescript
// Zapobieganie wielokrotnej kropce
if (digit === '.' && value.includes('.')) return

// Zamiana "0" na cyfrę
if (value === '0' && digit !== '.') {
  onValueChange(digit)
}
```

---

### 4. SummaryScreen.tsx

**Odpowiedzialność:** Podsumowanie, podpis, PDF

**Stan lokalny:**

- `hasSignature` - czy podpis został dodany
- `signatureRef` - ref do canvas

**Zustand actions:**

- `setSignature()` - zapisanie podpisu

**Generowanie PDF:**

```typescript
const blob = await pdf(<PdfGenerator inspection={currentInspection} />).toBlob();
const url = URL.createObjectURL(blob);
// Download
```

**Routing:**

- `/summary` → Podsumowanie
- Kliknięcie "Powrót" → `/`

---

### 5. PdfGenerator.tsx

**Odpowiedzialność:** Renderowanie dokumentu PDF

**Używa:** `@react-pdf/renderer`

**Struktura:**

```
Document
└── Page
    ├── Header (tytuł, podtytuł)
    ├── InfoSection (adres, mieszkanie, data, technik)
    ├── Table
    │   ├── TableHeader
    │   └── TableRows (z color-coding)
    ├── SummaryBox (statystyki)
    └── Footer (norma, podpis)
```

## 🗄️ State Management (Zustand)

### Store Structure

```typescript
interface InspectionState {
  // ===== AUTH STATE =====
  user: User | null;                    // Zalogowany użytkownik (Firebase)
  setUser: (user: User | null) => void; // Akcja: ustaw użytkownika

  // ===== PROJECT STATE ===== (NEW!)
  projects: Project[];                  // Lista projektów
  currentProjectId: string | null;      // Aktualnie wybrany projekt
  createNewProject: (name: string) => Promise<void>;
  loadProjects: () => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProjectId: (projectId: string | null) => void;

  // ===== INSPECTION STATE =====
  currentInspection: Inspection | null; // Aktualnie edytowany pomiar
  inspections: Inspection[];            // Lista pomiarów (dla konkretnego projektu)

  // ===== OFFLINE STATE =====
  isOnline: boolean;                    // Status połączenia
  pendingSyncCount: number;             // Liczba niezsynchronizowanych pomiarów

  // ===== SMART DEFAULTS STATE =====
  lastProtectionType: ProtectionType;   // Ostatni typ zabezpieczenia
  lastAmperage: Amperage;               // Ostatni amperaż
  lastKFactor: number;                  // Ostatni współczynnik k

  // ===== INSPECTION ACTIONS =====
  createNewInspection: (projectId, ...) => void; // ZMIANA: wymaga projectId
  setCurrentInspection: (...) => void;
  setSignature: (signature: string) => void;

  // ===== MEASUREMENT ACTIONS =====
  addMeasurement: (zsValue: number | null, noGrounding?: boolean) => void;
  updateMeasurement: (id: string, zsValue: number | null) => void;
  removeMeasurement: (id: string) => void;

  // ===== PERSISTENCE ACTIONS =====
  saveToFirestore: () => Promise<void>;
  loadInspections: (projectId: string) => Promise<void>; // ZMIANA: wymaga projectId
  deleteInspection: (id: string) => Promise<void>;

  // ===== SYNC ACTIONS =====
  retryPendingSync: () => Promise<void>;
  setOnlineStatus: (status: boolean) => void;

  // ===== SETTINGS ACTIONS =====
  setLastDefaults: (protectionType, amperage, kFactor) => void;
}
```

### Kluczowe Akcje

#### addMeasurement()

```typescript
addMeasurement: (zsValue, noGrounding = false) => {
  const { lastProtectionType, lastAmperage, lastKFactor } = get()

  // Pobierz Zs_dop z tabeli
  const zsDop = ZS_DOP_TABLE[lastProtectionType][lastAmperage]

  // Oceń wynik
  let result: 'TAK' | 'NIE' | 'B.UZ' = 'NIE'
  if (noGrounding) {
    result = 'B.UZ'
  } else if (zsValue !== null && zsValue <= zsDop) {
    result = 'TAK'
  }

  // Dodaj do listy
  set({
    currentInspection: {
      ...currentInspection,
      measurements: [...measurements, newMeasurement],
    },
  })
}
```

#### saveToFirestore()

```typescript
saveToFirestore: async () => {
  const { currentInspection } = get()

  const dataToSave = {
    address: currentInspection.address,
    apartmentNumber: currentInspection.apartmentNumber,
    date: Timestamp.fromDate(currentInspection.date),
    technician: currentInspection.technician,
    measurements: currentInspection.measurements,
    signature: currentInspection.signature || '',
    synced: true,
  }

  if (currentInspection.id) {
    // Update existing
    await updateDoc(doc(db, 'inspections', currentInspection.id), dataToSave)
  } else {
    // Create new
    await addDoc(collection(db, 'inspections'), dataToSave)
  }

  await get().loadInspections()
}
```

## 🔥 Firebase Architecture

### Firestore Schema (UPDATED!)

```
projects (collection)
├── {projectId} (document)
│   ├── name: string              // np. "Spółdzielnia Knurów"
│   ├── status: 'active' | 'archived'
│   └── createdAt: Timestamp

inspections (collection)
├── {inspectionId} (document)
│   ├── projectId: string         // NOWE POLE - WYMAGANE
│   ├── address: string
│   ├── apartmentNumber: string
│   ├── date: Timestamp
│   ├── technician: string
│   ├── synced: boolean
│   ├── signature: string (base64)
│   └── measurements: array
│       └── [
│           {
│             id: string,
│             pointNumber: number,
│             protectionType: 'WNP' | 'BI',
│             amperage: 16 | 20 | 25,
│             kFactor: number,
│             zsValue: number | null,
│             zsDop: number,
│             result: 'TAK' | 'NIE' | 'B.UZ',
│             noGrounding: boolean
│           }
│         ]
```

**KLUCZOWA ZMIANA:**

Każdy `Inspection` **MUSI** mieć `projectId`. Typ TypeScript wymusza to pole:

```typescript
export interface Inspection {
  id?: string
  projectId: string // WYMAGANE - bez tego TypeScript rzuci błąd
  address: string
  // ... reszta pól
}
```

**OPTYMALIZACJA ZAPYTAŃ:**

Zapytanie do Firestore używa `where()`:

```typescript
query(
  collection(db, 'inspections'),
  where('projectId', '==', projectId),
  orderBy('createdAt', 'desc')
)
```

Dzięki temu pobieramy **tylko pomiary dla konkretnego projektu**, nie wszystkie dane z bazy.

**WYMÓG INDEKSU:**

Firebase może wymagać utworzenia złożonego indeksu dla `projectId` + `createdAt`. Link do tworzenia pojawi się w konsoli przy pierwszym użyciu.
```

### Offline Persistence

```typescript
// firebase.ts
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open')
  } else if (err.code === 'unimplemented') {
    console.warn('Browser not supported')
  }
})
```

**Jak działa:**

1. Zapis → Firestore zapisuje lokalnie do IndexedDB
2. Offline → Dane dostępne z IndexedDB
3. Online → Automatyczna synchronizacja do Cloud Firestore

## 🎨 Styling Architecture

### Tailwind CSS 4.x

```css
/* index.css */
@import 'tailwindcss';

/* Custom styles */
* {
  -webkit-tap-highlight-color: transparent;
}
```

### Color System

```typescript
// Semantic colors
TAK (pozytywny)  → green-500/600  → #22c55e
NIE (negatywny)  → red-500/600    → #ef4444
B.UZ (ostrzeżenie) → orange-500/600 → #f97316
Primary          → blue-600/700   → #2563eb
```

### Responsive Breakpoints

```typescript
// Tailwind defaults
sm: '640px' // Telefon landscape
md: '768px' // Tablet
lg: '1024px' // Desktop
xl: '1280px' // Large desktop
```

## 🔐 Security Considerations

### Firebase Authentication

```typescript
// Tylko zalogowani użytkownicy mają dostęp do aplikacji
// App.tsx automatycznie przekierowuje do LoginScreen jeśli user === null

// Firestore Rules - WYMAGANE w Firebase Console
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /inspections/{inspection} {
      // ✅ Tylko zalogowani użytkownicy (email/password)
      allow read, write: if request.auth != null && request.auth.token.email != null;
    }
  }
}
```

### Input Validation

```typescript
// utils/validators.ts - Pure functions dla walidacji
export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// MeasurementScreen.tsx
const handleEnterMeasurement = () => {
  const zsValue = parseFloat(inputValue)

  if (isNaN(zsValue) || zsValue <= 0) {
    alert('Wprowadź poprawną wartość pomiaru!')
    return
  }

  // Continue...
}
```

### Bezpieczeństwo hasła

- Firebase wymaga minimum 6 znaków
- Hasła przechowywane z bcrypt
- Tokeny sesji automatycznie odświeżane

## 📱 PWA Architecture

### Service Worker Strategy

```javascript
// sw.js - Cache-First Strategy
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => response || fetch(event.request))
  )
})
```

### Manifest

```json
{
  "name": "Pomiary Elektryczne",
  "short_name": "Pomiary",
  "display": "standalone",
  "start_url": "/",
  "theme_color": "#2563eb"
}
```

## 🧪 Testing Strategy

### Unit Tests (przykład - nie zaimplementowane)

```typescript
// useAppStore.test.ts (InspectionSlice)
describe('addMeasurement', () => {
  it('should add measurement with correct result', () => {
    const store = useAppStore.getState()
    store.addMeasurement(0.45)

    const measurements = store.currentInspection?.measurements
    expect(measurements[0].result).toBe('TAK')
  })
})
```

### E2E Tests (przykład - nie zaimplementowane)

```typescript
// cypress/e2e/measurement.cy.ts
describe('Measurement Flow', () => {
  it('should create new measurement', () => {
    cy.visit('/')
    cy.get('[data-testid="new-measurement-btn"]').click()
    cy.get('[data-testid="address-input"]').type('ul. Testowa 1')
    // ...
  })
})
```

## 🚀 Performance Optimizations

### Możliwe Optymalizacje (nie zaimplementowane)

```typescript
// 1. Code Splitting
const Dashboard = lazy(() => import('./components/Dashboard'));
const MeasurementScreen = lazy(() => import('./components/MeasurementScreen'));

// 2. Memoization
const MeasurementList = memo(({ measurements }) => {
  return measurements.map(m => <MeasurementItem key={m.id} {...m} />);
});

// 3. Virtual Scrolling (dla dużych list)
import { FixedSizeList } from 'react-window';
```

## 📊 Monitoring & Analytics (opcjonalne)

### Firebase Analytics

```typescript
// firebase.ts
import { getAnalytics, logEvent } from 'firebase/analytics'

const analytics = getAnalytics(app)

// W komponentach
logEvent(analytics, 'measurement_created', {
  address: currentInspection.address,
  points_count: currentInspection.measurements.length,
})
```

## 🔄 Deployment Pipeline

```
1. Development
   npm run dev

2. Build
   npm run build

3. Preview
   npm run preview

4. Deploy
   firebase deploy
   # lub
   vercel deploy
   # lub
   netlify deploy
```

## 📦 Separacja Odpowiedzialności (Separation of Concerns)

### Components Layer

```
components/
├── atoms/           → UI building blocks (ZERO business logic)
├── molecules/       → Simple combinations (MINIMAL logic)
├── organisms/       → Complex sections (BUSINESS aware)
└── [Screens].tsx    → Page-level components
```

### Services Layer

```
services/
└── firebaseService.ts  → TYLKO Firebase operations (CRUD)
                         → Izolacja od UI
```

### Utils Layer

```
utils/
├── idGenerator.ts              → Pure functions
├── measurementCalculations.ts  → Pure functions (Zs_dop, wyniki)
└── validators.ts               → Pure functions (walidacja)
```

### Store Layer (Slices Pattern)

```
store/
├── slices/
│   ├── authSlice.ts         → Stan autoryzacji (user)
│   ├── projectSlice.ts      → Stan projektów (projects, currentProjectId)
│   ├── inspectionSlice.ts   → Stan przeglądów (inspections, currentInspection, measurements)
│   ├── offlineSlice.ts      → Stan offline i ustawienia (isOnline, lastDefaults)
│   └── index.ts             → Re-export
│
└── useAppStore.ts           → Główny store łączący wszystkie slice'y
                             → Wykorzystuje Zustand do zarządzania stanem
                             → Orchestruje services + utils
```

**Wzorzec Slices:**
- Każdy slice odpowiada za konkretną domenę biznesową (Single Responsibility)
- Slice'y mogą komunikować się między sobą przez `get()` i `set()`
- `useAppStore` łączy wszystkie slice'y w jeden spójny store

---

## 🚀 Quick Start Guide

### 1. Instalacja

```bash
npm install
```

### 2. Konfiguracja Firebase (jeśli jeszcze nie skonfigurowane)

- Utwórz projekt w Firebase Console
- Włącz Authentication (Email/Password)
- Włącz Firestore Database
- Skopiuj config do `src/firebase.ts`

### 3. Dodanie użytkownika testowego

```bash
Firebase Console → Authentication → Users → Add user
Email: test@example.com
Password: test123
```

### 4. Uruchomienie dev servera

```bash
npm run dev
```

### 5. Logowanie

- Otwórz `http://localhost:3000`
- Zaloguj się danymi z punktu 3

---

## 📚 Dodatkowa Dokumentacja

- `ARCHITECTURE_REFACTORING.md` - Historia refactoringu do Atomic Design
- `CHANGELOG.md` - Historia zmian w projekcie
- `OFFLINE_STRATEGY_IMPLEMENTATION.md` - Strategia offline-first
- `FAQ.md` - Najczęściej zadawane pytania

---

**Autor:** Senior React Developer  
**Architektura:** React + TypeScript + Firebase Auth + Firestore + PWA  
**Wzorce:** Atomic Design, State Management (Zustand), Offline-First, Auth Guard  
**Ostatnia aktualizacja:** 2026-01-30 (Faza 1: Wdrożenie struktury Projektów - Clean Slate)

---

## 🆕 CHANGELOG: Faza 1 - Struktura Projektów (2026-01-30)

### Główne Zmiany

#### 1. **Nowy Model Danych**

- Dodano interfejs `Project` (`id`, `name`, `createdAt`, `status`)
- `Inspection` ma teraz **wymagane pole** `projectId: string`
- **Strict Mode**: Każdy pomiar MUSI należeć do projektu (TypeScript wymusza to pole)

#### 2. **Nowe Ekrany**

- `ProjectsScreen.tsx` - Główny ekran (lista projektów, tworzenie nowego)
- `ProjectDetailsScreen.tsx` - Szczegóły projektu (dawny Dashboard.tsx)

#### 3. **Refaktoryzacja Routingu**

- `/` → `ProjectsScreen` (główny ekran po zalogowaniu)
- `/project/:id` → `ProjectDetailsScreen` (lista pomiarów dla projektu)

#### 4. **Refaktoryzacja Store (Zustand)**

- Dodano stan: `projects`, `currentProjectId`
- Dodano akcje: `createNewProject()`, `loadProjects()`, `deleteProject()`
- `loadInspections(projectId)` - teraz wymaga `projectId` jako argument
- `createNewInspection(projectId, ...)` - teraz wymaga `projectId`

#### 5. **Optymalizacja Firebase**

- Query do Firestore: `where('projectId', '==', projectId)`
- Pobieramy tylko pomiary dla konkretnego projektu (nie wszystkie dane)
- Nowa kolekcja: `projects` (osobna od `inspections`)

#### 6. **Clean Slate**

- **Usunięto wsparcie dla starych danych bez `projectId`**
- Aplikacja wymaga czystej bazy danych (stare dane nie będą działać)
- Każdy pomiar od teraz ma `projectId`

### Decyzje Architektoniczne

**DLACZEGO Clean Slate?**

1. Prostota - brak logiki migracji starych danych
2. Bezpieczeństwo - strict typing wymusza poprawność danych
3. Wydajność - optymalizacja zapytań od początku
4. MVP - aplikacja była testowa, brak produkcyjnych danych do zachowania

**DLACZEGO Projekty?**

- Organizacja pomiarów według obiektów (spółdzielnie, budynki, itp.)
- Skalowalność - łatwiejsze zarządzanie setkami pomiarów
- UX - intuicyjny podział danych
