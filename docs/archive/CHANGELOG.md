# 📝 Changelog - Historia Zmian

## [1.1.0] - 2026-01-21 - Poprawki UX i Debugowanie

### ✨ Nowe Funkcje

- **Współczynnik k jako wybór** - Teraz k jest selectem (5 lub 5.4) zamiast pola tekstowego
- **Przycisk B.UZ w keypadzie** - Brak Uziemienia jako trzeci przycisk obok "Cofnij" i "ENTER"

### 🔄 Zmiany UI

- **Nowy układ panelu ustawień:**
  - Zabezpieczenie (WNP/BI)
  - Współczynnik k (5 lub 5.4) ← **NOWE**
  - Amperaż (16A/20A/25A)
- **Nowy układ przycisków akcji w keypadzie:**
  - Cofnij (żółty)
  - ENTER ✓ (zielony)
  - B.UZ (pomarańczowy) ← **NOWE**

### 🐛 Poprawki Błędów

- **Lepsze komunikaty błędów** - Szczegółowe informacje o błędach zapisu
- **Lepsza obsługa błędów Firebase** - Rozróżnienie między permission-denied, unavailable, itp.
- **Logi debug** - Dodano console.log dla ułatwienia debugowania
- **Walidacja daty** - Lepsze sprawdzanie typu Date przed zapisem

### 📚 Dokumentacja

- **FIRESTORE_RULES.txt** - Gotowe reguły do skopiowania
- **NAPRAWA_BLEDU_IPHONE.md** - Instrukcja naprawy błędu zapisu na iOS
- **CHANGELOG.md** - Ten plik

### 🔧 Techniczne

- Usunięto modal B.UZ (niepotrzebny)
- Dodano pole `createdAt` do dokumentów Firestore
- Poprawiono obsługę błędów w `saveToFirestore()`
- Dodano console.log w kluczowych miejscach

---

## [1.0.0] - 2026-01-21 - Pierwsza Wersja

### ✨ Funkcje

- Dashboard z listą pomiarów
- Wprowadzanie pomiarów z custom keypad
- Smart Defaults (kopiowanie ustawień)
- Automatyczna ocena (TAK/NIE/B.UZ)
- Offline persistence (Firebase + IndexedDB)
- Generowanie PDF
- Podpis cyfrowy
- PWA (instalowalna na telefonie)

### 📦 Technologie

- React 19 + TypeScript
- Vite
- Tailwind CSS 4.x
- Zustand
- Firebase Firestore + Auth
- React Router
- @react-pdf/renderer
- Service Worker

### 📚 Dokumentacja

- 11 plików dokumentacji
- README.md
- FAQ.md
- ARCHITEKTURA.md
- I wiele innych...

---

## 🔜 Planowane Funkcje (TODO)

### v1.2.0

- [ ] Edycja zapisanych pomiarów
- [ ] Eksport do Excel/CSV
- [ ] Zdjęcia punktów pomiarowych
- [ ] Geolokalizacja

### v1.3.0

- [ ] Multi-user collaboration
- [ ] Dashboard analityczny z wykresami
- [ ] Push notifications
- [ ] Synchronizacja multi-device

### v2.0.0

- [ ] Autoryzacja email/password
- [ ] Role użytkowników (admin, technik, readonly)
- [ ] Zaawansowane raporty
- [ ] Integracje z zewnętrznymi systemami

---

## 📊 Statystyki Wersji

### v1.1.0

- Komponenty: 5
- Pliki TS: 11
- Dokumentacja: 13 plików
- Build size: 2.2 MB
- Gzipped: ~736 KB

### v1.0.0

- Komponenty: 5
- Pliki TS: 11
- Dokumentacja: 11 plików
- Build size: 2.2 MB
- Gzipped: ~736 KB

---

## 🎯 Breaking Changes

### v1.1.0

- **Brak** - Wszystkie zmiany są kompatybilne wstecz
- Istniejące dane w Firestore działają bez zmian

---

## 🔄 Migracja z v1.0.0 do v1.1.0

**Nie wymagana!** Wszystko działa automatycznie.

Jedynie:

1. Ustaw Firestore Rules (zobacz FIRESTORE_RULES.txt)
2. Odśwież aplikację

---

## 📞 Wsparcie

- **FAQ:** FAQ.md
- **Dokumentacja:** INDEX_DOKUMENTACJI.md
- **Problemy z zapisem:** NAPRAWA_BLEDU_IPHONE.md
