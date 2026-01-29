# ❓ FAQ - Najczęściej Zadawane Pytania

## 🔧 Instalacja i Konfiguracja

### Q: Jak zdobyć konfigurację Firebase?

**A:**

1. Idź do https://console.firebase.google.com/
2. Kliknij "Add project" lub "Dodaj projekt"
3. Podaj nazwę projektu (np. "pomiary-elektryczne")
4. Wyłącz Google Analytics (opcjonalne)
5. Po utworzeniu, kliknij ikonę `</>` (Web)
6. Zarejestruj aplikację
7. Skopiuj obiekt `firebaseConfig`
8. Wklej do `src/firebase.ts`

### Q: Jak włączyć Firestore?

**A:**

1. W Firebase Console → Build → Firestore Database
2. Kliknij "Create database"
3. Wybierz lokalizację (np. europe-west3)
4. Start in **test mode** (dla developmentu)
5. Gotowe!

### Q: Jak włączyć Anonymous Auth?

**A:**

1. W Firebase Console → Build → Authentication
2. Kliknij "Get started"
3. Zakładka "Sign-in method"
4. Kliknij "Anonymous"
5. Włącz przełącznik "Enable"
6. Save

### Q: Aplikacja nie kompiluje się - błąd Tailwind

**A:** Upewnij się że masz zainstalowane:

```bash
npm install -D @tailwindcss/postcss
```

I że `postcss.config.js` zawiera:

```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```

---

## 🐛 Problemy z Firebase

### Q: Błąd "Firebase: Error (auth/operation-not-allowed)"

**A:** Nie włączyłeś Anonymous Authentication. Zobacz instrukcję powyżej.

### Q: Błąd "Missing or insufficient permissions"

**A:** Firestore Rules są zbyt restrykcyjne. Ustaw test mode:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // TYLKO DLA TESTÓW!
    }
  }
}
```

**UWAGA:** W produkcji użyj bezpieczniejszych reguł!

### Q: Dane nie synchronizują się

**A:** Sprawdź:

1. Console (F12) - czy są błędy?
2. DevTools → Application → IndexedDB → firestore - czy dane są lokalnie?
3. Firebase Console → Firestore → Data - czy dane są w chmurze?
4. Czy masz połączenie z internetem?

### Q: "Persistence failed: Multiple tabs open"

**A:** To tylko ostrzeżenie. Firebase Persistence działa tylko w jednej karcie. Zamknij inne karty z aplikacją.

---

## 📱 PWA i Offline

### Q: Service Worker się nie rejestruje

**A:** Sprawdź:

1. Czy plik `public/sw.js` istnieje?
2. Czy używasz HTTPS? (localhost jest OK)
3. DevTools → Application → Service Workers - czy są błędy?
4. Czy przeglądarka wspiera SW? (Chrome, Firefox, Safari 11.1+)

### Q: Aplikacja nie działa offline

**A:**

1. Sprawdź czy SW jest zarejestrowany (DevTools → Application → SW)
2. Sprawdź czy Firestore Persistence jest włączone (Console → "Persistence enabled")
3. Odśwież stronę kilka razy (SW musi się zainstalować)
4. Spróbuj: DevTools → Application → Clear storage → Reload

### Q: Jak zainstalować PWA na iOS?

**A:**

1. Otwórz w Safari (nie Chrome!)
2. Kliknij przycisk "Udostępnij" (kwadrat ze strzałką)
3. Przewiń w dół → "Dodaj do ekranu głównego"
4. Potwierdź

### Q: Jak zainstalować PWA na Android?

**A:**

1. Otwórz w Chrome
2. Menu (3 kropki) → "Zainstaluj aplikację" lub "Dodaj do ekranu głównego"
3. Potwierdź

### Q: Ikony PWA nie wyświetlają się

**A:**

1. Sprawdź czy pliki `public/icon-192.png` i `public/icon-512.png` istnieją
2. Użyj `IKONY_PLACEHOLDER.html` do wygenerowania
3. Wyczyść cache przeglądarki
4. Przebuduj aplikację: `npm run build`

---

## 💻 Problemy z Kodem

### Q: TypeScript pokazuje błędy importów

**A:** Użyj `type` imports dla typów:

```typescript
import type { Inspection, Measurement } from '../types'
import { ZS_DOP_TABLE } from '../types'
```

### Q: Błąd "React is not defined"

**A:** W React 19 nie musisz importować React w każdym pliku. Usuń:

```typescript
import React from 'react' // ❌ Nie potrzebne
```

Chyba że używasz JSX w sposób jawny.

### Q: Zustand store nie aktualizuje komponentów

**A:** Upewnij się że używasz `set()` lub `get()`:

```typescript
// ❌ Źle
state.currentInspection = newValue

// ✅ Dobrze
set({ currentInspection: newValue })
```

### Q: PDF nie generuje się

**A:** Sprawdź:

1. Czy `@react-pdf/renderer` jest zainstalowany?
2. Console - czy są błędy?
3. Czy `currentInspection` ma dane?
4. Spróbuj w innej przeglądarce

---

## 🎨 Problemy z UI

### Q: Tailwind style nie działają

**A:**

1. Sprawdź czy `@import "tailwindcss";` jest w `src/index.css`
2. Sprawdź `postcss.config.js` (powinien mieć `@tailwindcss/postcss`)
3. Przebuduj: `npm run dev` (restart serwera)

### Q: Keypad nie reaguje na kliknięcia

**A:**

1. Sprawdź Console - czy są błędy JS?
2. Sprawdź czy `onValueChange` i `onEnter` są przekazane jako props
3. Spróbuj dodać `console.log` w handlerach

### Q: Modal się nie zamyka

**A:** Sprawdź czy state jest aktualizowany:

```typescript
const [showModal, setShowModal] = useState(false);

// ✅ Dobrze
<button onClick={() => setShowModal(false)}>Zamknij</button>
```

### Q: Lista pomiarów nie przewija się

**A:** Dodaj `overflow-y-auto` i `max-h-*`:

```tsx
<div className="overflow-y-auto max-h-64">{/* lista */}</div>
```

---

## 🔢 Logika Elektryczna

### Q: Dlaczego WNP ma k=5 a BI k=5.4?

**A:** To standardowe współczynniki z norm elektrycznych:

- WNP (Wyłącznik Nadprądowy) - czas zadziałania krótszy
- BI (Bezpiecznik Topikowy) - czas zadziałania dłuższy

### Q: Skąd wzięły się wartości Zs_dop?

**A:** Wzór: `Zs_dop = U₀ / (k × In)` gdzie U₀ = 230V
Przykład: WNP 16A → 230 / (5 × 16) = 2.875Ω ≈ 2.88Ω

### Q: Czy mogę zmienić współczynnik k?

**A:** Tak! W ekranie pomiarów jest pole "Współczynnik k" które możesz edytować.

### Q: Co to jest B.UZ?

**A:** Brak Uziemienia - sytuacja gdy punkt nie ma prawidłowego uziemienia ochronnego.

### Q: Dlaczego wynik jest NIE mimo że wartość jest bliska?

**A:** Normy są bezwzględne. Jeśli Zs > Zs_dop choćby o 0.01Ω → NIE.

---

## 📊 Dane i Synchronizacja

### Q: Czy mogę edytować zapisany pomiar?

**A:** Obecnie nie ma funkcji edycji. Możesz:

1. Usunąć pomiar
2. Utworzyć nowy z poprawnymi danymi

### Q: Gdzie są przechowywane dane offline?

**A:** W IndexedDB przeglądarki. Sprawdź:
DevTools → Application → IndexedDB → firestore

### Q: Czy mogę eksportować dane do Excel?

**A:** Obecnie tylko PDF. Możesz dodać eksport do CSV/Excel jako rozszerzenie.

### Q: Jak usunąć wszystkie dane?

**A:**

1. DevTools → Application → Clear storage
2. Lub w Firebase Console → Firestore → Delete collection

### Q: Czy dane są bezpieczne?

**A:**

- Lokalnie: Tak, w IndexedDB przeglądarki
- W chmurze: Zależy od Firestore Rules
- Używaj bezpiecznych reguł w produkcji!

---

## 🚀 Deployment

### Q: Jak wdrożyć na Firebase Hosting?

**A:**

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```

### Q: Jak wdrożyć na Vercel?

**A:**

1. Push do GitHub
2. Połącz repo z Vercel
3. Vercel auto-deploy przy każdym push

### Q: Jak wdrożyć na Netlify?

**A:**

1. `npm run build`
2. Przeciągnij folder `dist` na netlify.com
3. Lub połącz z GitHub dla auto-deploy

### Q: Błąd "Failed to load module" po deploy

**A:** Sprawdź:

1. Czy `dist/` folder ma wszystkie pliki?
2. Czy ścieżki w `index.html` są względne?
3. Czy hosting wspiera SPA? (potrzebny redirect do index.html)

---

## 🔐 Bezpieczeństwo

### Q: Czy Anonymous Auth jest bezpieczne?

**A:** Dla prostych aplikacji - tak. Każdy użytkownik ma unikalny UID. Ale:

- Nie ma haseł
- Nie ma email
- Użyj Firestore Rules do ograniczenia dostępu

### Q: Jak zabezpieczyć Firestore w produkcji?

**A:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /inspections/{inspection} {
      // Tylko zalogowani mogą czytać/pisać
      allow read, write: if request.auth != null;

      // Lub tylko własne dane:
      allow read, write: if request.auth.uid == resource.data.userId;
    }
  }
}
```

### Q: Czy API key w kodzie jest bezpieczny?

**A:** Tak! Firebase API key nie jest tajny. Jest używany tylko do identyfikacji projektu. Bezpieczeństwo zapewniają Firestore Rules.

---

## 📱 Mobile & Performance

### Q: Aplikacja jest wolna na telefonie

**A:**

1. Sprawdź rozmiar bundle: `npm run build`
2. Użyj React.lazy() dla code splitting
3. Zoptymalizuj obrazy
4. Użyj virtual scrolling dla długich list

### Q: Klawiatura systemowa zasłania keypad

**A:** To jest zamierzone. Custom keypad zastępuje systemową klawiaturę. Użyj `inputMode="none"` na inputach.

### Q: Aplikacja nie działa na starych telefonach

**A:** Sprawdź kompatybilność:

- iOS 11.1+ (dla PWA)
- Android 5+ (Chrome 40+)
- Dodaj polyfills jeśli potrzeba

---

## 🎓 Nauka i Rozwój

### Q: Gdzie mogę nauczyć się więcej o React?

**A:**

- https://react.dev/
- https://react.dev/learn

### Q: Gdzie mogę nauczyć się więcej o Firebase?

**A:**

- https://firebase.google.com/docs
- https://firebase.google.com/docs/firestore

### Q: Gdzie mogę nauczyć się więcej o PWA?

**A:**

- https://web.dev/progressive-web-apps/
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps

### Q: Jak mogę rozszerzyć tę aplikację?

**A:** Zobacz `ARCHITEKTURA.md` sekcja "Performance Optimizations" i "Możliwe Rozszerzenia"

---

## 🆘 Dalsze Wsparcie

### Q: Gdzie zgłosić błąd?

**A:** Sprawdź:

1. Console (F12) - skopiuj błędy
2. Network - czy requesty wychodzą?
3. Opisz kroki do reprodukcji

### Q: Gdzie szukać pomocy?

**A:**

- Stack Overflow (tag: react, firebase, pwa)
- Firebase Community: https://firebase.google.com/support
- React Community: https://react.dev/community

---

**Nie znalazłeś odpowiedzi?** Sprawdź pliki:

- `INSTRUKCJA_URUCHOMIENIA.md` - szczegółowa instrukcja
- `ARCHITEKTURA.md` - architektura kodu
- `CHECKLIST.md` - checklist testowania
