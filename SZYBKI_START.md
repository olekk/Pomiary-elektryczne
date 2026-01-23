# 🚀 Szybki Start

## 1. Konfiguracja Firebase (WYMAGANE!)

Otwórz plik `src/firebase.ts` i zastąp placeholdery:

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

### Jak zdobyć konfigurację Firebase?
1. Idź do https://console.firebase.google.com/
2. Utwórz nowy projekt
3. Włącz **Firestore Database** (Test mode jest OK na start)
4. Włącz **Authentication** → Anonymous
5. W ustawieniach projektu (⚙️) skopiuj konfigurację z sekcji "SDK setup"

## 2. Wygeneruj ikony PWA

### Opcja A - Szybkie ikony (użyj przeglądarki):
1. Otwórz plik `IKONY_PLACEHOLDER.html` w przeglądarce
2. Kliknij przycisk "Generuj Ikony"
3. Przenieś pobrane pliki `icon-192.png` i `icon-512.png` do folderu `public/`

### Opcja B - Własne ikony:
Umieść swoje pliki PNG (192x192 i 512x512) w folderze `public/` jako:
- `public/icon-192.png`
- `public/icon-512.png`

## 3. Uruchom aplikację

```bash
npm run dev
```

Aplikacja będzie dostępna pod: http://localhost:3000

## 4. Build production

```bash
npm run build
npm run preview
```

## ✅ Gotowe!

Aplikacja jest w pełni funkcjonalna i gotowa do użycia!

### Testowanie offline:
1. Otwórz DevTools (F12)
2. Zakładka "Network"
3. Ustaw "Offline" w dropdown
4. Odśwież stronę - powinna działać!

### Wdrożenie:
Możesz wdrożyć na:
- **Firebase Hosting**: `firebase deploy`
- **Vercel**: `vercel deploy`
- **Netlify**: przeciągnij folder `dist`

---

**Więcej informacji:** Zobacz `INSTRUKCJA_URUCHOMIENIA.md`
