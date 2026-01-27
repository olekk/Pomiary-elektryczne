# 🏗️ Architektura Aplikacji - Pomiary Elektryczne

## 📁 Struktura Projektu

```
pomiary-elektryczne/
├── public/                      # Zasoby statyczne
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                   # Service Worker
│   └── vite.svg                # Favicon
│
├── src/
│   ├── components/             # Komponenty React
│   │   ├── Dashboard.tsx       # Lista pomiarów
│   │   ├── MeasurementScreen.tsx  # Ekran wprowadzania
│   │   ├── NumericKeypad.tsx   # Klawiatura numeryczna
│   │   ├── PdfGenerator.tsx    # Generator PDF
│   │   └── SummaryScreen.tsx   # Podsumowanie
│   │
│   ├── store/                  # State management
│   │   └── useInspectionStore.ts  # Zustand store
│   │
│   ├── types/                  # TypeScript types
│   │   └── index.ts            # Typy i stałe
│   │
│   ├── App.tsx                 # Routing
│   ├── main.tsx                # Entry point
│   ├── firebase.ts             # Konfiguracja Firebase
│   └── index.css               # Style globalne
│
├── dist/                       # Build output (generowany)
├── node_modules/               # Zależności
│
├── index.html                  # HTML template
├── vite.config.ts              # Konfiguracja Vite
├── tailwind.config.js          # Konfiguracja Tailwind
├── postcss.config.js           # Konfiguracja PostCSS
├── tsconfig.json               # Konfiguracja TypeScript
├── package.json                # Zależności i skrypty
│
└── README.md                   # Dokumentacja
```

## 🔄 Przepływ Danych (Data Flow)

```
┌─────────────────────────────────────────────────────────┐
│                     USER INTERFACE                       │
│  (Dashboard → MeasurementScreen → SummaryScreen)        │
└────────────────┬────────────────────────┬───────────────┘
                 │                        │
                 ▼                        ▼
         ┌───────────────┐        ┌──────────────┐
         │  Zustand Store │◄──────►│   Firebase   │
         │ (Local State)  │        │  (Firestore) │
         └───────────────┘        └──────────────┘
                 │                        │
                 ▼                        ▼
         ┌───────────────┐        ┌──────────────┐
         │  IndexedDB    │        │    Cloud     │
         │  (Offline)    │        │  (Online)    │
         └───────────────┘        └──────────────┘
```

## 🧩 Komponenty - Szczegóły

### 1. Dashboard.tsx
**Odpowiedzialność:** Lista wszystkich pomiarów, tworzenie nowego

**Stan lokalny:**
- `isLoading` - status ładowania
- `showNewModal` - widoczność modala
- `address`, `apartmentNumber`, `technician` - dane formularza

**Zustand actions:**
- `loadInspections()` - wczytanie listy
- `createNewInspection()` - utworzenie nowego
- `deleteInspection()` - usunięcie

**Routing:**
- `/` → Dashboard
- Kliknięcie "+" → Modal → `/measurement`

---

### 2. MeasurementScreen.tsx
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
  setNextProtectionType(lastProtectionType);
  setNextAmperage(lastAmperage);
  setNextKFactor(lastKFactor);
}, [lastProtectionType, lastAmperage, lastKFactor]);

// Auto-update k factor
useEffect(() => {
  const defaultK = DEFAULT_K_FACTORS[nextProtectionType];
  setNextKFactor(defaultK);
}, [nextProtectionType]);
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
if (digit === '.' && value.includes('.')) return;

// Zamiana "0" na cyfrę
if (value === '0' && digit !== '.') {
  onValueChange(digit);
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
  // Stan
  currentInspection: Inspection | null;
  inspections: Inspection[];
  lastProtectionType: ProtectionType;
  lastAmperage: Amperage;
  lastKFactor: number;
  
  // Actions
  createNewInspection: (...) => void;
  addMeasurement: (...) => void;
  updateMeasurement: (...) => void;
  removeMeasurement: (...) => void;
  saveToFirestore: () => Promise<void>;
  loadInspections: () => Promise<void>;
  setCurrentInspection: (...) => void;
  setSignature: (...) => void;
  deleteInspection: (...) => Promise<void>;
  setLastDefaults: (...) => void;
}
```

### Kluczowe Akcje

#### addMeasurement()
```typescript
addMeasurement: (zsValue, noGrounding = false) => {
  const { lastProtectionType, lastAmperage, lastKFactor } = get();
  
  // Pobierz Zs_dop z tabeli
  const zsDop = ZS_DOP_TABLE[lastProtectionType][lastAmperage];
  
  // Oceń wynik
  let result: 'TAK' | 'NIE' | 'B.UZ' = 'NIE';
  if (noGrounding) {
    result = 'B.UZ';
  } else if (zsValue !== null && zsValue <= zsDop) {
    result = 'TAK';
  }
  
  // Dodaj do listy
  set({
    currentInspection: {
      ...currentInspection,
      measurements: [...measurements, newMeasurement]
    }
  });
}
```

#### saveToFirestore()
```typescript
saveToFirestore: async () => {
  const { currentInspection } = get();
  
  const dataToSave = {
    address: currentInspection.address,
    apartmentNumber: currentInspection.apartmentNumber,
    date: Timestamp.fromDate(currentInspection.date),
    technician: currentInspection.technician,
    measurements: currentInspection.measurements,
    signature: currentInspection.signature || '',
    synced: true,
  };
  
  if (currentInspection.id) {
    // Update existing
    await updateDoc(doc(db, 'inspections', currentInspection.id), dataToSave);
  } else {
    // Create new
    await addDoc(collection(db, 'inspections'), dataToSave);
  }
  
  await get().loadInspections();
}
```

## 🔥 Firebase Architecture

### Firestore Schema
```
inspections (collection)
├── {inspectionId} (document)
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

### Offline Persistence
```typescript
// firebase.ts
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Browser not supported');
  }
});
```

**Jak działa:**
1. Zapis → Firestore zapisuje lokalnie do IndexedDB
2. Offline → Dane dostępne z IndexedDB
3. Online → Automatyczna synchronizacja do Cloud Firestore

## 🎨 Styling Architecture

### Tailwind CSS 4.x
```css
/* index.css */
@import "tailwindcss";

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
sm: '640px'   // Telefon landscape
md: '768px'   // Tablet
lg: '1024px'  // Desktop
xl: '1280px'  // Large desktop
```

## 🔐 Security Considerations

### Firebase Rules (przykład)
```javascript
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /inspections/{inspection} {
      // Allow read/write for authenticated users (anonymous OK)
      allow read, write: if request.auth != null;
    }
  }
}
```

### Input Validation
```typescript
// MeasurementScreen.tsx
const handleEnterMeasurement = () => {
  const zsValue = parseFloat(inputValue);
  
  if (isNaN(zsValue) || zsValue <= 0) {
    alert('Wprowadź poprawną wartość pomiaru!');
    return;
  }
  
  // Continue...
}
```

## 📱 PWA Architecture

### Service Worker Strategy
```javascript
// sw.js - Cache-First Strategy
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
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
// useInspectionStore.test.ts
describe('addMeasurement', () => {
  it('should add measurement with correct result', () => {
    const store = useInspectionStore.getState();
    store.addMeasurement(0.45);
    
    const measurements = store.currentInspection?.measurements;
    expect(measurements[0].result).toBe('TAK');
  });
});
```

### E2E Tests (przykład - nie zaimplementowane)
```typescript
// cypress/e2e/measurement.cy.ts
describe('Measurement Flow', () => {
  it('should create new measurement', () => {
    cy.visit('/');
    cy.get('[data-testid="new-measurement-btn"]').click();
    cy.get('[data-testid="address-input"]').type('ul. Testowa 1');
    // ...
  });
});
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
import { getAnalytics, logEvent } from 'firebase/analytics';

const analytics = getAnalytics(app);

// W komponentach
logEvent(analytics, 'measurement_created', {
  address: currentInspection.address,
  points_count: currentInspection.measurements.length
});
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

---

**Autor:** Senior Frontend Developer  
**Architektura:** React + TypeScript + Firebase + PWA  
**Wzorce:** Component-based, State Management (Zustand), Offline-First
