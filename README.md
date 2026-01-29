# Pomiary Elektryczne - Field Service PWA

Aplikacja React PWA do wykonywania pomiarów elektrycznych w terenie z możliwością pracy offline.

## 🚀 Funkcje

- ✅ Wprowadzanie pomiarów impedancji pętli zwarciowej (Zs)
- ✅ Obliczanie dopuszczalnych wartości Zs
- ✅ Automatyczna ocena wyników (TAK/NIE/B.UZ)
- ✅ Smart Defaults - kopiowanie ustawień z poprzedniego pomiaru
- ✅ Custom Numeric Keypad - duże przyciski dla łatwego wprowadzania
- ✅ Offline persistence (Firebase Firestore + IndexedDB)
- ✅ Generowanie PDF z raportem
- ✅ Podpis cyfrowy
- ✅ PWA - instalowalna na urządzeniach mobilnych

## 📦 Technologie

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS** - styling
- **Zustand** - state management
- **Firebase** - Firestore (offline persistence) + Auth
- **React Router** - routing
- **@react-pdf/renderer** - generowanie PDF
- **Lucide React** - ikony
- **React Signature Canvas** - podpisy

## 🛠️ Instalacja

1. Sklonuj repozytorium
2. Zainstaluj zależności:

```bash
npm install
```

3. Skonfiguruj Firebase:
   - Stwórz projekt w [Firebase Console](https://console.firebase.google.com/)
   - Włącz Firestore Database
   - Włącz Authentication (Anonymous)
   - Skopiuj konfigurację do `src/firebase.ts`

4. Uruchom aplikację:

```bash
npm run dev
```

## 📱 Instalacja jako PWA

1. Otwórz aplikację w przeglądarce mobilnej
2. Na iOS: Kliknij "Udostępnij" → "Dodaj do ekranu głównego"
3. Na Android: Kliknij menu → "Dodaj do ekranu głównego"

## 🏗️ Build Production

```bash
npm run build
npm run preview
```

## 📋 Logika Elektryczna

### Typy zabezpieczeń:

- **WNP** (Wyłącznik Nadprądowy) - współczynnik k = 5
- **BI** (Bezpiecznik Topikowy) - współczynnik k = 5.4

### Wzory:

- Zs_dop = U₀ / (k × In)
- Ocena: Zs <= Zs_dop → TAK, Zs > Zs_dop → NIE

### Tabela dopuszczalnych wartości:

| Typ | 16A   | 20A   | 25A   |
| --- | ----- | ----- | ----- |
| WNP | 2.88Ω | 2.30Ω | 1.84Ω |
| BI  | 2.66Ω | 2.13Ω | 1.70Ω |

## 🎨 Struktura projektu

```
src/
├── components/
│   ├── Dashboard.tsx          # Lista pomiarów
│   ├── MeasurementScreen.tsx  # Ekran wprowadzania pomiarów
│   ├── NumericKeypad.tsx      # Klawiatura numeryczna
│   ├── SummaryScreen.tsx      # Podsumowanie i podpis
│   └── PdfGenerator.tsx       # Generator PDF
├── store/
│   └── useInspectionStore.ts  # Zustand store
├── types/
│   └── index.ts               # TypeScript typy
├── firebase.ts                # Konfiguracja Firebase
├── App.tsx                    # Routing
└── main.tsx                   # Entry point
```

## 📄 Licencja

MIT

## 👨‍💻 Autor

Senior Frontend Developer - Field Service Specialist
