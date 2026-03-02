# 🏗️ Architektura Aplikacji - Pomiary Elektryczne

## ⚡ Kluczowa Architektura: Offline-First z Custom Hooks + Firestore

### Fundamentalna architektura (2026)

Aplikacja używa **custom React hooks** z **`onSnapshot` (Realtime Listeners)** jako jedyne źródło prawdy. Zarządzanie stanem odbywa się bezpośrednio przez Firestore — bez pośredniczących store'ów.

**Architektura (Firestore-Only):**
```typescript
✅ useCollection(query) → onSnapshot() → Natychmiast zwraca cache
✅ useDocument(docRef) → onSnapshot() → Auto-sync w tle
✅ useAuth() → React Context → onAuthStateChanged
✅ useUserSettings(uid) → Firestore + localStorage fallback
✅ useOnlineStatus() → navigator.onLine events
✅ usePendingSync(uid) → Query unsynced inspections
```

### Zalety architektury:

1. **Brak nieskończonego spinnera offline** - `onSnapshot` natychmiast zwraca dane z cache
2. **Automatyczna synchronizacja** - dane aktualizują się w czasie rzeczywistym
3. **Prostszy kod** - brak warunkowej logiki `if (navigator.onLine)`
4. **Lepsza UX** - użytkownik widzi dane natychmiast (cache), a potem aktualizacje (serwer)
5. **Memory-safe** - automatyczny cleanup przez `useEffect` return function
6. **Brak "ghost data"** - każdy hook zarządza własnym lifecycle

### Struktura Read Operations:

```
Komponenty UI
    │
    ├─► useCollection / useDocument (mount)
    │       │
    │       └─► onSnapshot(query/docRef)
    │               │
    │               ├─► 1st emit: Cache ⚡ (offline OK)
    │               └─► 2nd emit: Server 🌐 (auto-sync)
    │
    └─► useEffect cleanup (unmount)
            │
            └─► unsubscribe() — automatyczny
```

---

## 🆕 Ustawienia użytkownika i podpisy (2026-02-10)

### Model danych podpisów

Aplikacja rozdziela podpisy na dwa niezależne źródła:

1. `technicianSignature` - podpis technika, ustawiany raz w `SettingsScreen`
2. `ownerSignature` - podpis właściciela/najemcy, zbierany każdorazowo w `SummaryScreen`

### Snapshotting do inspekcji (offline-safe PDF)

Przy tworzeniu nowej inspekcji hook `useUserSettings` dostarcza dane technika, które są snapshotowane do inspekcji:

- `technicianName`
- `technicianLicenseNumber`
- `technicianSignature`
- `ownerName` (wprowadzane w modalu "Nowy Pomiar")

Dzięki temu `PdfGenerator` nie zależy od dynamicznego odczytu `users/{uid}` podczas generowania dokumentu (działa poprawnie offline).

### Cloud storage ustawień + localStorage fallback

Ustawienia technika są trzymane w Firestore z lokalnym backupem w `localStorage`:

```
Firestore:
users (collection)
└── {uid} (document, uid = auth.currentUser.uid)
    ├── displayName: string
    ├── licenseNumber: string
    ├── signatureBase64: string
    └── updatedAt: Timestamp

localStorage:
userSettings:{uid} → JSON { displayName, licenseNumber, signatureBase64 }
```

**Zapis:** `useUserSettings.save()` zapisuje równolegle do Firestore + `localStorage` (per-user key).

**Odczyt (hydration):** `useUserSettings` subskrybuje się przez `onSnapshot`. Jeśli dokument nie istnieje lub sieć niedostępna, używa danych z `localStorage` jako fallback.

**Wywołania:**
1. `SettingsScreen` → `useUserSettings(user.uid)` — automatyczna subskrypcja
2. `BuildingDetailsScreen` → `useUserSettings(user.uid)` — do snapshotowania danych technika przy tworzeniu inspekcji

---

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
│   │   ├── layout/             # Layout components
│   │   │   └── MainLayout.tsx  # Header + footer + navigation
│   │   │
│   │   ├── ProjectsScreen.tsx  # 📄 Ekran główny (lista projektów)
│   │   ├── ProjectDetailsScreen.tsx  # 📄 Szczegóły projektu
│   │   ├── BuildingDetailsScreen.tsx # 📄 Szczegóły budynku
│   │   ├── LoginScreen.tsx     # 🔐 Ekran logowania
│   │   ├── MeasurementScreen.tsx  # 📄 Ekran wprowadzania pomiarów
│   │   ├── NumericKeypad.tsx   # ⌨️ Klawiatura numeryczna
│   │   ├── PdfGenerator.tsx    # 📄 Generator PDF
│   │   ├── SettingsScreen.tsx  # ⚙️ Ustawienia technika
│   │   └── SummaryScreen.tsx   # 📄 Podsumowanie
│   │
│   ├── hooks/                  # 🪝 Custom React Hooks (State Management)
│   │   ├── useAuth.tsx         # AuthContext + Provider (onAuthStateChanged)
│   │   ├── useCollection.ts   # Generic hook: onSnapshot on Firestore queries
│   │   ├── useDocument.ts     # Generic hook: onSnapshot on single documents
│   │   ├── useOnlineStatus.ts # Browser online/offline events
│   │   ├── useUserSettings.ts # Firestore + localStorage fallback
│   │   ├── usePendingSync.ts  # Track unsynced inspections + retry
│   │   └── index.ts           # Barrel export
│   │
│   ├── services/               # 🔥 Integracje zewnętrzne
│   │   ├── firebaseService.ts  # Write operations (Firestore)
│   │   └── index.ts            # Re-export
│   │
│   ├── utils/                  # 🛠️ Pure functions
│   │   ├── idGenerator.ts      # Generowanie ID
│   │   ├── measurementCalculations.ts  # Zs_dop, wyniki
│   │   ├── validators.ts       # Walidacja danych
│   │   └── index.ts            # Re-export
│   │
│   ├── types/                  # 📝 TypeScript types
│   │   └── index.ts            # Typy i stałe
│   │
│   ├── App.tsx                 # 🔐 Routing + AuthProvider
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
│  AuthProvider → onAuthStateChanged() → React Context     │
└──────────────┬──────────────────────┬───────────────────┘
               │                      │
      user === null           user !== null
               │                      │
               ▼                      ▼
    ┌──────────────────┐   ┌──────────────────────────┐
    │  LoginScreen     │   │  BrowserRouter           │
    │  - Email/Hasło   │   │  - ProjectsScreen        │
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

#### 2. **useAuth.tsx - AuthContext + Provider**

```typescript
// AuthProvider opakowuje całą aplikację (w App.tsx)
const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider: React.FC = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setIsLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const signOutUser = async () => {
    if (confirm('Czy na pewno chcesz się wylogować?')) {
      await signOut(auth)
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signOutUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// Użycie w komponentach:
const { user, signOutUser } = useAuth()
```

#### 3. **App.tsx - Auth Guard**

```typescript
// App.tsx opakowuje aplikację w AuthProvider
<AuthProvider>
  <AppContent />      // Wewnętrzny komponent z logiką routingu
</AuthProvider>

// AppContent:
const { user, isLoading } = useAuth()
if (isLoading) return <LoadingScreen />
if (!user) return <LoginScreen />
return <BrowserRouter>{/* Routes */}</BrowserRouter>
```

#### 4. **LoginScreen.tsx**

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

#### 5. **MainLayout.tsx - Wylogowanie**

```typescript
const { signOutUser } = useAuth()
const isOnline = useOnlineStatus()
const { pendingCount, retrySync } = usePendingSync(user?.uid)

// Wylogowanie jest obsługiwane przez AuthContext
// Cleanup subskrypcji Firestore jest automatyczny (hooki z useEffect cleanup)
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

## 🔄 Przepływ Danych (Data Flow) - Offline-First Architecture

### Architektura Custom Hooks + Firestore

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER INTERFACE                               │
│  (LoginScreen → ProjectsScreen → ProjectDetailsScreen →         │
│   BuildingDetailsScreen → MeasurementScreen → Summary)           │
└────────────────┬────────────────────────┬─────────────────────┘
                 │                        │
                 ▼                        ▼
         ┌───────────────┐        ┌──────────────┐
         │ Custom Hooks  │◄──────►│ Firebase Auth│
         │               │        │ (AuthContext) │
         │ useCollection │        └──────────────┘
         │   └─► onSnapshot        ┌──────────────┐
         │       (queries)  ◄─────┤  Firestore   │
         │                          │  (Cloud)     │
         │ useDocument             └──────┬───────┘
         │   └─► onSnapshot                │
         │       (single docs) ◄──────────┘
         └───────────────┘                 │
                 │                         │
                 ▼                         ▼
         ┌───────────────┐        ┌──────────────┐
         │  IndexedDB    │◄───────┤ Persistence  │
         │  (Cache)      │        │   Layer      │
         └───────────────┘        └──────────────┘
              ⚡ 1st emit               🌐 2nd emit
           (fromCache: true)       (fromCache: false)
```

### Kluczowe zasady:

1. **Write Operations** → `firebaseService.ts`
   - Zapisywanie, usuwanie, aktualizacja danych
   
2. **Read Operations** → `onSnapshot` w custom hooks
   - Natychmiastowe dane z cache (offline)
   - Automatyczna synchronizacja z serwerem (online)
   
3. **Realtime Updates** → Automatyczne
   - Zmiany w Firestore natychmiast aktualizują UI
   - Brak ręcznego odświeżania

4. **Cleanup** → Automatyczny
   - Hook `useEffect` return function wywołuje `unsubscribe()`
   - Cleanup automatyczny przy odmontowaniu komponentu

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

- `showNewModal` - widoczność modala tworzenia projektu
- `newProjectName` - nazwa nowego projektu

**Hooks:**

- `useCollection(projectsQuery, mapper)` - subskrypcja do projektów (Realtime Listener)
- Cleanup automatyczny przy odmontowaniu

**Operacje zapisu:**

- `saveProjectToFirestore(project)` - fire-and-forget
- `deleteProjectFromFirestore(id)` - fire-and-forget

**Routing:**

- `/` → ProjectsScreen (Główny ekran po zalogowaniu)
- Kliknięcie "Otwórz projekt" → `/project/:id`

**Design:**

- Grid z kafelkami projektów (responsywne: 1-3 kolumny)
- Każdy kafelek: ikona folderu, nazwa projektu, data utworzenia
- Floating Action Button "+" do tworzenia nowego projektu
- Modal z formularzem (nazwa projektu)

---

### ProjectDetailsScreen.tsx (Szczegóły Projektu)

**Odpowiedzialność:** Lista budynków i inspekcji dla konkretnego projektu

**Hooks:**

- `useCollection(buildingsQuery, mapper)` - subskrypcja do budynków projektu
- `useCollection(inspectionsQuery, mapper)` - subskrypcja do inspekcji projektu
- Nazwa projektu pobierana z osobnego query

**Operacje zapisu:**

- `saveBuildingToFirestore(building)` - fire-and-forget
- `deleteBuildingFromFirestore(id)` - fire-and-forget

**Routing:**

- `/project/:id` → ProjectDetailsScreen
- Kliknięcie budynku → `/building/:id`

**OPTYMALIZACJA:**

Pobieranie danych odbywa się z query Firestore:

```typescript
where('projectId', '==', projectId)
```

Dzięki temu pobieramy tylko **mały wycinek bazy danych**, nie wszystkie pomiary.

---

### BuildingDetailsScreen.tsx (Szczegóły Budynku)

**Odpowiedzialność:** Lista inspekcji dla konkretnego budynku

**Hooks:**

- `useCollection(inspectionsQuery, mapper)` - subskrypcja do inspekcji budynku
- `useDocument(buildingDocRef, mapper)` - dane budynku (reload-safe)
- `useUserSettings(user.uid)` - dane technika do snapshotowania

**Nawigacja:**

- Nowe inspekcje przekazywane przez `location.state` do `MeasurementScreen`
- Wznowienie inspekcji INACCESSIBLE → modal → MeasurementScreen

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

**Routing:**

- Nie jest w routerze - renderowany przez `App.tsx` warunkowo


### MeasurementScreen.tsx

**Odpowiedzialność:** Wprowadzanie pomiarów, Smart Defaults

**Stan lokalny:**

- `currentInspection` - zarządzany przez `useState` (nie store)
- `inputValue` - wartość z keypada
- `showNoGroundingModal` - modal B.UZ
- `nextProtectionType`, `nextAmperage`, `nextKFactor` - ustawienia

**Dane wejściowe:**

- Inspekcja przekazywana przez `location.state` z `BuildingDetailsScreen`
- Na reload: dane pobierane z Firestore przez `useDocument`

**Operacje zapisu:**

- `saveInspectionToFirestore(inspection, id)` - fire-and-forget przy zapisie
- `markInspectionAsSynced(id)` - po udanym zapisie

**Logika pomiarów:**

```typescript
// Dodawanie pomiaru — lokalna operacja na useState
const addMeasurement = (zsValue, protectionType, amperage, kFactor) => {
  const zsDop = ZS_DOP_TABLE[protectionType][amperage]
  const result = zsValue <= zsDop ? 'TAK' : 'NIE'
  setCurrentInspection(prev => ({
    ...prev,
    measurements: [...prev.measurements, newMeasurement]
  }))
}
```

**Routing:**

- `/measurement` → Nowy pomiar
- Kliknięcie "Zapisz" → `/summary/:inspectionId`

---

### SummaryScreen.tsx

**Odpowiedzialność:** Podsumowanie, ogólne uwagi do protokołu, podpis, PDF

**Stan lokalny:**

- `localInspection` - inspekcja z `location.state` lub Firestore
- `notes` - uwagi do protokołu
- `isSignatureVisible` - widoczność panelu podpisu

**Hooks:**

- `useDocument(inspectionDocRef, mapper)` - fallback na reload

**Operacje zapisu:**

- `saveInspectionToFirestore(inspection, id)` - przy podpisie i "Zapisz i Dodaj Kolejny"

**Generowanie PDF:**

```typescript
const blob = await pdf(<PdfGenerator inspection={inspection} />).toBlob();
const url = URL.createObjectURL(blob);
// Download
```

**Routing:**

- `/summary/:inspectionId` → Podsumowanie
- "Zapisz i Dodaj Kolejny" → `/building/:buildingId`
- "Powrót" → `/building/:buildingId`

---

### PdfGenerator.tsx

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

## 🪝 State Management (Custom Hooks + Firestore)

### Architektura — Firestore jako Single Source of Truth

Od lutego 2026 aplikacja **nie używa Zustand** ani żadnego globalnego store'a. Zarządzanie stanem opiera się na:

1. **Custom React Hooks** — `useCollection`, `useDocument` subskrybują się do Firestore
2. **React Context** — `useAuth` dostarcza stan autentykacji
3. **Local `useState`** — dla danych tymczasowych (formularz, currentInspection)
4. **`location.state`** — do przekazywania danych między ekranami

### Hooks Reference

| Hook | Odpowiedzialnik | Dane |
|------|----------------|------|
| `useAuth()` | Autentykacja | `user`, `isLoading`, `signOutUser()` |
| `useCollection(query, mapper)` | Listy danych | `data[]`, `isLoading`, `error` |
| `useDocument(docRef, mapper)` | Pojedyncze dokumenty | `data`, `isLoading`, `error` |
| `useOnlineStatus()` | Status sieci | `boolean` |
| `useUserSettings(uid)` | Profil technika | `technicianName`, `technicianLicenseNumber`, `technicianSignature`, `save()` |
| `usePendingSync(uid)` | Niesynchronizowane | `pendingCount`, `retrySync()` |

### useCollection — Generic Realtime Listener

```typescript
function useCollection<T>(
  query: Query | null,
  mapper: (doc: QueryDocumentSnapshot) => T,
  label?: string
): { data: T[]; isLoading: boolean; error: FirestoreError | null }
```

Używany przez: `ProjectsScreen`, `ProjectDetailsScreen`, `BuildingDetailsScreen`

### useDocument — Single Document Listener

```typescript
function useDocument<T>(
  docRef: DocumentReference | null,
  mapper: (snap: DocumentSnapshot) => T | null,
  label?: string
): { data: T | null; isLoading: boolean; error: FirestoreError | null }
```

Używany przez: `BuildingDetailsScreen` (dane budynku), `SummaryScreen` (inspekcja na reload)

### useUserSettings — Firestore + localStorage Fallback

```typescript
function useUserSettings(uid?: string): {
  technicianName: string;
  technicianLicenseNumber: string;
  technicianSignature: string;
  isLoading: boolean;
  save: (settings: UserSettingsPayload) => Promise<void>;
}
```

Hook subskrybuje się do `users/{uid}` w Firestore. Przy zamontowaniu pokonuje "cold start" loading z localStorage:

1. **Mount** → odczyt z `localStorage` (natychmiast)
2. **onSnapshot** → Firestore dane nadchodzą → aktualizacja stanu
3. **save()** → zapis do Firestore + `localStorage` równocześnie

### Lifecycle hooków — automatyczny cleanup

```
Mount komponentu
    │
    └─► useCollection / useDocument
            │
            └─► onSnapshot(query)     // tworzy subskrypcję
                    │
                    ├─► callback: set state z danymi
                    └─► cleanup: return () => unsubscribe()
                            │
Unmount komponentu ──────────┘  // automatyczny unsubscribe
```

**Brak potrzeby manualnego cleanup** — React sam wywołuje cleanup function.

## 🔥 Firebase Architecture

### Firestore Schema

```
projects (collection)
├── {projectId} (document)
│   ├── name: string              // np. "Spółdzielnia Knurów"
│   ├── status: 'active' | 'archived'
│   └── createdAt: Timestamp

buildings (collection)
├── {buildingId} (document)
│   ├── projectId: string         // WYMAGANE
│   ├── name: string
│   ├── address: string
│   └── createdAt: Timestamp

inspections (collection)
├── {inspectionId} (document)
│   ├── projectId: string         // WYMAGANE
│   ├── buildingId: string        // WYMAGANE
│   ├── address: string
│   ├── apartmentNumber: string
│   ├── ownerName: string        // Imię i nazwisko właściciela/najemcy
│   ├── date: Timestamp
│   ├── technicianName: string
│   ├── technicianLicenseNumber: string (snapshot z ustawień)
│   ├── technicianSignature: string (base64 snapshot z ustawień)
│   ├── notes: string             // opcjonalne uwagi ogólne do protokołu
│   ├── synced: boolean
│   ├── ownerSignature: string (base64 podpisu klienta)
│   ├── status: 'COMPLETED' | 'INACCESSIBLE'  // domyślnie 'COMPLETED'
│   ├── protocolNumber: string
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

users (collection)
├── {uid} (document)
│   ├── displayName: string
│   ├── licenseNumber: string
│   ├── signatureBase64: string
│   └── updatedAt: Timestamp
```

**KLUCZOWE:**

Każdy `Inspection` **MUSI** mieć `projectId` i `buildingId`. Typ TypeScript wymusza te pola:

```typescript
export interface Inspection {
  id?: string
  projectId: string  // WYMAGANE
  buildingId: string // WYMAGANE
  notes?: string
  address: string
  // ... reszta pól
}
```

**OPTYMALIZACJA ZAPYTAŃ:**

Zapytanie do Firestore używa `where()`:

```typescript
query(
  collection(db, 'inspections'),
  where('buildingId', '==', buildingId),
  orderBy('date', 'desc')
)
```

Dzięki temu pobieramy **tylko pomiary dla konkretnego budynku**, nie wszystkie dane z bazy.

### Offline-First Architecture (Realtime Listeners)

**Architektura pobierania danych:**

Aplikacja używa **`onSnapshot` (Realtime Listeners)** przez custom hooks:

```typescript
// useCollection.ts
export function useCollection<T>(query, mapper, label) {
  const [data, setData] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!query) return
    
    const unsubscribe = onSnapshot(query, (snapshot) => {
      // ✅ Wykonuje się 2 razy:
      // 1. Natychmiast z cache (fromCache: true) - OFFLINE SUPPORT
      // 2. Po synchronizacji z serwerem (fromCache: false) - ONLINE SYNC
      
      const items = snapshot.docs.map(mapper)
      setData(items)
      setIsLoading(false)
    })
    
    return () => unsubscribe()  // Automatyczny cleanup!
  }, [query])
}
```

**Zalety onSnapshot:**

1. ✅ **Natychmiastowe dane z cache** - brak nieskończonego spinnera offline
2. ✅ **Automatyczna synchronizacja** - dane aktualizują się w czasie rzeczywistym
3. ✅ **Brak ręcznego sprawdzania `navigator.onLine`** - Firebase obsługuje to sam
4. ✅ **Automatyczny cleanup** - `useEffect` return function wywołuje `unsubscribe()`

**Offline Persistence:**

```typescript
// firebase.ts
initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
})
```

**Jak działa:**

1. **Zapis** → Firestore zapisuje lokalnie do IndexedDB
2. **Offline** → `onSnapshot` natychmiast zwraca dane z cache
3. **Online** → `onSnapshot` automatycznie synchronizuje z serwerem i emituje nowy snapshot
4. **Realtime** → Zmiany w Firestore natychmiast aktualizują UI (bez odświeżania)

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

Aplikacja używa **Workbox InjectManifest** (vite-plugin-pwa) z precache'owaniem:

```javascript
// sw.js — Workbox precacheAndRoute
import { precacheAndRoute } from 'workbox-precaching'
precacheAndRoute(self.__WB_MANIFEST)
```

Wszystkie zasoby aplikacji (JS, CSS, HTML, fonty, ikony) są precache'owane podczas instalacji Service Workera.

### Manifest

```json
{
  "name": "Pomiary Elektryczne",
  "short_name": "Pomiary",
  "display": "standalone",
  "start_url": "/",
  "theme_color": "#1e293b"
}
```

## 🧪 Testing Strategy

### Unit Tests (przykład - nie zaimplementowane)

```typescript
// hooks/useCollection.test.ts
describe('useCollection', () => {
  it('should return data from Firestore snapshot', () => {
    // ...
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

### Hooks Layer (State Management)

```
hooks/
├── useAuth.tsx           → AuthContext + Provider (React Context)
├── useCollection.ts      → Generic onSnapshot na kolekcjach Firestore
├── useDocument.ts        → Generic onSnapshot na dokumentach Firestore
├── useOnlineStatus.ts    → Browser online/offline events
├── useUserSettings.ts    → Ustawienia technika (Firestore + localStorage)
├── usePendingSync.ts     → Tracking niesynchronizowanych inspekcji
└── index.ts              → Barrel export
```

**Read operations** (`onSnapshot`) są w **hookach**:
- `useCollection` → listy (projekty, budynki, inspekcje)
- `useDocument` → pojedyncze dokumenty (budynek, inspekcja)
- `useUserSettings` → profil technika

### Services Layer

```
services/
└── firebaseService.ts  → TYLKO Write Operations (Create, Update, Delete)
                         → Izolacja od UI
```

**firebaseService.ts** zawiera tylko:
- ✅ `saveProjectToFirestore()` - zapisywanie projektów
- ✅ `saveBuildingToFirestore()` - zapisywanie budynków
- ✅ `saveInspectionToFirestore()` - zapisywanie inspekcji
- ✅ `deleteProjectFromFirestore()` - usuwanie projektów (kaskadowe)
- ✅ `deleteBuildingFromFirestore()` - usuwanie budynków (kaskadowe)
- ✅ `deleteInspectionFromFirestore()` - usuwanie inspekcji
- ✅ `markInspectionAsSynced()` - oznaczanie jako zsynchronizowane
- ✅ `retrySyncInspection()` - retry synchronizacji
- ✅ `saveUserSettingsToFirestore()` - zapis ustawień technika

### Utils Layer

```
utils/
├── idGenerator.ts              → Pure functions
├── measurementCalculations.ts  → Pure functions (Zs_dop, wyniki)
└── validators.ts               → Pure functions (walidacja)
```

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
**Wzorce:** Atomic Design, Custom Hooks (Firestore Listeners), Offline-First, Auth Guard  
**Ostatnia aktualizacja:** 2026-02-14 (Usunięcie Zustand — architektura Firestore-Only z custom hooks)

---

## 🆕 Status Inspekcji: INACCESSIBLE (2026-02-10)

### Cel

Umożliwienie szybkiego oznaczenia mieszkań, w których nikogo nie zastano, bez konieczności wykonywania pomiarów. Dane adresowe są zapisywane, a technik może wrócić do mieszkania później.

### Model danych

Dodano pole `status` do `Inspection`:
- `'COMPLETED'` (domyślnie) - pomiar wykonany
- `'INACCESSIBLE'` - nie zastano / niedostępne

### Flow

1. **Oznaczenie jako niedostępne:** Modal "Nowy Pomiar" → przycisk "Nie zastano" → `saveInspectionToFirestore()` ze statusem `INACCESSIBLE`, brak pomiarów, zamknięcie modala.

2. **Wizualna identyfikacja:** `InspectionCard` wyświetla element z pomarańczowym akcentem (border-l-4, ikona AlertTriangle, badge "Nie zastano").

3. **Wznowienie pomiaru:** Klik w kartę INACCESSIBLE → modal z wypełnionymi danymi → "Rozpocznij pomiar" → aktualizacja istniejącego dokumentu (status → COMPLETED), przekierowanie do ekranu pomiarów.

---

## 🆕 CHANGELOG: Faza 1 - Struktura Projektów (2026-01-30)

### Główne Zmiany

#### 1. **Nowy Model Danych**

- Dodano interfejs `Project` (`id`, `name`, `createdAt`, `status`)
- `Inspection` ma teraz **wymagane pole** `projectId: string`
- **Strict Mode**: Każdy pomiar MUSI należeć do projektu (TypeScript wymusza to pole)

#### 2. **Nowe Ekrany**

- `ProjectsScreen.tsx` - Główny ekran (lista projektów, tworzenie nowego)
- `ProjectDetailsScreen.tsx` - Szczegóły projektu

#### 3. **Refaktoryzacja Routingu**

- `/` → `ProjectsScreen` (główny ekran po zalogowaniu)
- `/project/:id` → `ProjectDetailsScreen` (lista budynków dla projektu)

#### 4. **Architektura Offline-First (Realtime Listeners)**

- ✅ `useCollection` hook z `onSnapshot` — automatyczny subscribe/unsubscribe
- ✅ `useDocument` hook — reload-safe fetch dokumentów
- ✅ Brak ręcznego zarządzania subskrypcjami

#### 5. **Optymalizacja Firebase**

- Query do Firestore: `where('projectId', '==', projectId)`
- Pobieramy tylko pomiary dla konkretnego projektu (nie wszystkie dane)
- Nowe kolekcje: `projects`, `buildings` (osobne od `inspections`)

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

---

## 🚀 Optimistic UI - Wzorzec Fire-and-Forget (2026-02-12)

### Problem: Blokowanie UI przez Firebase

**Poprzednia implementacja (BLOKUJĄCA):**

```typescript
❌ const handleSave = async () => {
     setIsSaving(true)                  // Spinner pojawia się
     await saveToFirestore()            // CZEKA na Firebase (blokuje UI!)
     setIsSaving(false)                 // Spinner znika
     closeModal()                       // Modal zamyka się DOPIERO TERAZ
   }

Problem: W trybie samolotowym await wisi w nieskończoność → UI zamrożone
```

**Nowa implementacja (OPTIMISTIC UI):**

```typescript
✅ const handleSave = () => {
     // KROK 1: Generuj ID lokalnie (jeśli nowy obiekt)
     const newId = generateInspectionId()
     
     // KROK 2: Aktualizuj stan lokalny NATYCHMIAST (UI reaguje w 0ms)
     setLocalInspection({ ...data, id: newId })
     closeModal()  // Modal zamyka się OD RAZU!
     
     // KROK 3: Firebase w tle (fire-and-forget, NIE blokuje UI)
     saveInspectionToFirestore(data, newId)
       .catch(err => console.error('Sync failed, retrying later...', err))
   }

Zalety: UI NIGDY nie czeka na sieć. Offline queue Firebase automatycznie retry.
```

### Architektura Optimistic UI

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER ACTION                                 │
│   (Klik "Zapisz", "Dodaj Pomiar", "Zmień Podpis")              │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
         ┌───────────────┐
         │ KROK 1:       │
         │ Generuj ID    │  ← generateInspectionId() (lokalnie!)
         │ Prepare Data  │
         └───────┬───────┘
                 │
                 ▼
         ┌───────────────┐
         │ KROK 2:       │
         │ Local State   │  ← useState / setLocalInspection
         │ Update (0ms)  │  ← Modal zamyka się NATYCHMIAST!
         └───────┬───────┘
                 │
                 ▼
         ┌───────────────┐
         │ KROK 3:       │
         │ Firebase Sync │  ← saveInspectionToFirestore().catch(...)
         │ (Background)  │  ← FIRE-AND-FORGET (NIE blokuje UI)
         └───────┬───────┘
                 │
      ┌──────────┴──────────┐
      ▼                     ▼
┌──────────┐         ┌──────────────┐
│ SUCCESS  │         │ OFFLINE      │
│ ✅ Synced│         │ 📴 Queued    │
└──────────┘         │ (Auto-retry) │
                     └──────────────┘
```

### Zmodyfikowane Funkcje (Pełna Lista)

#### Komponenty z Optimistic UI:

```typescript
✅ SummaryScreen.tsx
   - handleSaveSignature() — NIE czeka na Firebase
   - handleSaveAndAddNext() — nawigacja natychmiast

✅ SettingsScreen.tsx
   - handleSave() — alert natychmiast, sync w tle

✅ MeasurementScreen.tsx
   - handleSave() — nawigacja do /summary natychmiast

✅ BuildingDetailsScreen.tsx
   - handleMarkInaccessible() — modal zamyka się natychmiast
   - handleDelete() — usuwanie natychmiast

✅ ProjectDetailsScreen.tsx
   - handleAddBuilding() — modal zamyka się natychmiast
   - handleDeleteBuilding() — usuwanie natychmiast

✅ ProjectsScreen.tsx
   - handleAddProject() — modal zamyka się natychmiast
   - handleDeleteProject() — usuwanie natychmiast
```

### Kluczowe Zasady Implementacji

#### 1. **Generuj ID lokalnie (jeśli nowy obiekt)**

```typescript
// ✅ DOBRZE: ID po stronie klienta
const savedId = inspection.id || generateInspectionId()

// ❌ ŹLE: Czekanie na serwer dla ID
const docRef = await addDoc(collection(db, 'inspections'), data)
const id = docRef.id  // BLOKUJE UI!
```

#### 2. **Aktualizuj stan lokalny NATYCHMIAST**

```typescript
// ✅ DOBRZE: Najpierw local state
setLocalInspection({ ...inspection, ownerSignature })
setSignatureVisible(false)  // Modal zamyka się OD RAZU

// ❌ ŹLE: Najpierw Firebase
await saveInspectionToFirestore(...)  // BLOKUJE!
```

#### 3. **Firebase w tle (Fire-and-Forget)**

```typescript
// ✅ DOBRZE: NIE używaj await w UI
saveInspectionToFirestore(data, id)
  .catch(err => console.error('Sync failed', err))

// ❌ ŹLE: await blokuje UI
await saveInspectionToFirestore(data, id)
```

### Obsługa Błędów

**NIE wyświetlamy alertów błędów synchronizacji** - użytkownik już widzi zaktualizowane dane w UI. Firebase automatycznie retry'uje gdy pojawi się internet.

```typescript
// ✅ DOBRZE: Loguj błędy, NIE blokuj użytkownika
saveInspectionToFirestore(data, id)
  .then(() => logger.log('✅ Synced'))
  .catch(err => logger.error('❌ Sync failed, will retry later', err))

// ❌ ŹLE: Alert blokuje workflow
try {
  await saveInspectionToFirestore(data, id)
} catch (err) {
  alert('Błąd zapisu!') // Użytkownik nie może kontynuować!
}
```

### Tryb Samolotowy - Test Scenariusz

**DZIAŁA:**

1. ✈️ Tryb samolotowy włączony
2. Zmieniam podpis → Klik "Zapisz"
3. ✅ Modal zamyka się NATYCHMIAST (0ms)
4. ✅ Widzę NOWY podpis na ekranie (local state)
5. ✅ Generuję PDF → Jest NOWY podpis (z local state)
6. 🌐 Włączam internet → Firebase synchronizuje się w tle
7. ✅ Aplikacja w pełni funkcjonalna offline!

### Zalety Wzorca Optimistic UI

1. **Zero opóźnienia UI** - wszystko działa natychmiastowo (0ms)
2. **Offline First** - aplikacja w pełni funkcjonalna bez internetu
3. **Lepsza UX** - brak spinnerów, brak zawieszania
4. **PDF offline** - generowanie PDF z local state, nie z Firebase
5. **Automatyczny retry** - Firebase ma wbudowaną offline queue
6. **Prostszy kod** - brak spinnerów, brak try-catch w UI

---

## 📄 Generowanie PDF w Trybie Offline (2026-02-12)

### Problem: PDF nie działał offline

**Przyczyna:**
- PdfGenerator używał fontów Roboto z zewnętrznych plików (`/fonts/Roboto-Regular.ttf`)
- Fonty nie były cache'owane przez Service Worker
- W trybie offline fonty nie mogły się załadować → PDF nie generował się

### Rozwiązanie

**1. Dodano fonty do projektu:**
```
public/fonts/
├── Roboto-Regular.ttf (503KB)
└── Roboto-Bold.ttf (502KB)
```

**2. Zaktualizowano Service Worker (Workbox precache):**

Fonty `.ttf` są automatycznie precache'owane przez Workbox InjectManifest:
```typescript
// vite.config.ts
globPatterns: ['**/*.{js,css,html,png,webmanifest,ttf}']
```

**3. Dodano obsługę błędów w PdfGenerator:**
```typescript
try {
  Font.register({
    family: 'Roboto',
    fonts: [
      { src: '/fonts/Roboto-Regular.ttf', fontWeight: 'normal' },
      { src: '/fonts/Roboto-Bold.ttf', fontWeight: 'bold' },
    ],
  })
} catch (error) {
  console.warn('Failed to register fonts, using default')
  // Fallback: @react-pdf/renderer użyje domyślnego fontu systemowego
}
```

**4. Poprawiono komunikaty błędów:**
```typescript
// SummaryScreen.tsx - handleGeneratePDF()
if (errorMessage.includes('font')) {
  alert('Błąd ładowania fontów PDF. Upewnij się, że aplikacja była uruchomiona przynajmniej raz online.')
}
```

### Wymagania dla trybu offline

**Pierwsza wizyta (ONLINE):**
1. Użytkownik otwiera aplikację z internetem
2. Service Worker cache'uje zasoby (w tym fonty)
3. Wszystko gotowe do pracy offline

**Kolejne użycie (OFFLINE):**
1. ✅ Aplikacja działa bez internetu
2. ✅ Dane z local state (natychmiast)
3. ✅ PDF generuje się z fontami z cache
4. ✅ Firebase synchronizuje się gdy pojawi się internet

### Architektura PDF Offline-First

```
┌─────────────────────────────────────────────────────────────────┐
│                  GENEROWANIE PDF OFFLINE                         │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
         ┌───────────────┐
         │ Dane lokalne  │  ← inspection object (local state / Firestore cache)
         │               │
         └───────┬───────┘
                 │
                 ▼
         ┌───────────────┐
         │ PdfGenerator  │
         │ + Fonty       │  ← /fonts/*.ttf (cache przez SW)
         └───────┬───────┘
                 │
                 ▼
         ┌───────────────┐
         │ @react-pdf    │
         │ .toBlob()     │  ← Generowanie PDF w przeglądarce
         └───────┬───────┘
                 │
                 ▼
         ┌───────────────┐
         │ Download      │  ← Prot-XXX.pdf
         │ (lokalny plik)│
         └───────────────┘
```

**Kluczowe punkty:**
- ✅ **Dane z local state** — nie wymaga sieci
- ✅ **Fonty z Cache** — Service Worker zapewnia offline access
- ✅ **PDF w przeglądarce** — @react-pdf działa całkowicie po stronie klienta
- ✅ **Brak blokowania** - lazy loading z Vite chunks (cache'owane)

---

## 🆕 Zustand Removal (2026-02-14)

### Motywacja

Zustand store powodował problemy z "ghost data" i stale cache na page reload. Architektura z globalnym store'em pośredniczącym między Firestore a UI była nadmiernie złożona — Firestore z `persistentLocalCache` sam w sobie jest offline store'em.

### Co zrobiono

1. **Usunięto cały `src/store/` directory** — 10 plików (750+ linii `inspectionSlice`, 6 slice'ów, store, index, README)
2. **Usunięto zależność `zustand`** z `package.json`
3. **Stworzono 6 custom hooks** w `src/hooks/` — łącznie ~400 linii
4. **Zrefaktoryzowano 8 komponentów** — z Zustand na hooki + direct Firestore calls

### Nowa architektura vs stara

| Aspekt | Stara (Zustand) | Nowa (Hooks + Firestore) |
|--------|-----------------|--------------------------|
| Source of truth | Zustand store | Firestore (IndexedDB cache) |
| Subskrypcje | Manualne subscribe/unsubscribe w slicach | Automatyczne w `useCollection` / `useDocument` |
| Cleanup | Ręczny (MainLayout logout) | Automatyczny (useEffect cleanup) |
| Ghost data | Problem — stale data po logout/login | Brak — hooki mają własny lifecycle |
| Reload | Wymagał `fetchBuildingById` / `fetchInspectionById` | `useDocument` z `location.state` fallback |
| Rozmiar kodu | ~960 insertions, ~2202 deletions | Netto: **-1242 linii** |

### Wpływ na bundle

- Usunięto `zustand` z `vendor-ui` chunk w `vite.config.ts`
- Bundle zmniejszony o ~5KB (zustand minified)

---
