# ✅ Checklist Weryfikacji Aplikacji

## Przed Uruchomieniem

- [ ] Zainstalowano Node.js (wersja 18+)
- [ ] Sklonowano/pobrano repozytorium
- [ ] Uruchomiono `npm install`
- [ ] Skonfigurowano Firebase w `src/firebase.ts`
- [ ] Wygenerowano ikony PWA (192x192 i 512x512)

## Konfiguracja Firebase

- [ ] Utworzono projekt w Firebase Console
- [ ] Włączono Firestore Database
- [ ] Włączono Authentication → Anonymous
- [ ] Skopiowano konfigurację do `src/firebase.ts`
- [ ] Ustawiono reguły Firestore (np. test mode na start)

## Testowanie Funkcjonalności

### Dashboard
- [ ] Dashboard się ładuje
- [ ] Pokazuje listę pomiarów (pustą na start)
- [ ] Przycisk "+" otwiera modal nowego pomiaru
- [ ] Modal przyjmuje: adres, mieszkanie, technika
- [ ] Po wypełnieniu przechodzi do ekranu pomiarów

### Ekran Pomiarów
- [ ] Wyświetla się header z adresem
- [ ] Panel ustawień działa (WNP/BI, 16A/20A/25A, k)
- [ ] Custom keypad działa (cyfry, kropka, cofnij, clear)
- [ ] ENTER dodaje pomiar do listy
- [ ] Lista pomiarów wyświetla się poprawnie
- [ ] Color-coding działa (zielony/czerwony/pomarańczowy)
- [ ] Przycisk "Brak Uziemienia" otwiera modal
- [ ] B.UZ dodaje się jako osobny typ wyniku
- [ ] Smart Defaults kopiują ustawienia z poprzedniego pomiaru
- [ ] Usuwanie pomiarów działa (ikona kosza)
- [ ] "Zapisz i Przejdź Dalej" zapisuje do Firestore

### Logika Elektryczna
- [ ] WNP ma domyślnie k=5
- [ ] BI ma domyślnie k=5.4
- [ ] Zmiana typu automatycznie aktualizuje k
- [ ] Zs_dop wylicza się poprawnie dla WNP 16A = 2.88Ω
- [ ] Zs_dop wylicza się poprawnie dla BI 16A = 2.66Ω
- [ ] Ocena TAK gdy Zs <= Zs_dop
- [ ] Ocena NIE gdy Zs > Zs_dop
- [ ] Ocena B.UZ dla braku uziemienia

### Ekran Podsumowania
- [ ] Statystyki wyświetlają się poprawnie
- [ ] Lista wszystkich punktów jest widoczna
- [ ] Canvas podpisu działa
- [ ] "Zapisz podpis" zapisuje podpis
- [ ] "Generuj PDF" generuje i pobiera PDF
- [ ] PDF zawiera wszystkie dane
- [ ] PDF zawiera tabelę pomiarów
- [ ] PDF zawiera podpis (jeśli dodano)
- [ ] "Powrót do Listy" wraca do Dashboard

### Firebase & Offline
- [ ] Dane zapisują się do Firestore
- [ ] Dashboard pokazuje status "Synced"
- [ ] DevTools → Application → IndexedDB pokazuje dane
- [ ] Tryb offline działa (Network → Offline)
- [ ] Dane są dostępne offline
- [ ] Po powrocie online synchronizacja działa

### PWA
- [ ] Service Worker rejestruje się (DevTools → Application → SW)
- [ ] Manifest jest poprawny (DevTools → Application → Manifest)
- [ ] Ikony się ładują
- [ ] Na iOS pokazuje się opcja "Dodaj do ekranu głównego"
- [ ] Na Android pokazuje się "Zainstaluj aplikację"
- [ ] Aplikacja instaluje się jako PWA
- [ ] Theme color jest widoczny w pasku statusu
- [ ] Aplikacja działa w trybie standalone

## Performance

- [ ] Aplikacja ładuje się szybko
- [ ] Brak lagów przy wpisywaniu
- [ ] Płynne przewijanie listy
- [ ] Keypad reaguje natychmiast
- [ ] Przejścia między ekranami są płynne

## Responsywność

- [ ] Działa na telefonie (320px+)
- [ ] Działa na tablecie (768px+)
- [ ] Działa na desktopie (1024px+)
- [ ] Elementy są touch-friendly (min 44px)
- [ ] Nie ma poziomego scrolla

## Błędy i Edge Cases

- [ ] Próba zapisu pustej listy pomiarów jest blokowana
- [ ] Próba wpisania niepoprawnej wartości (np. tekstu) jest obsługiwana
- [ ] Brak połączenia z Firestore jest obsługiwany
- [ ] Brak ikony PWA nie blokuje działania
- [ ] Stare przeglądarki wyświetlają ostrzeżenie (opcjonalne)

## Browser Compatibility

- [ ] Chrome/Edge (desktop & mobile)
- [ ] Safari (desktop & iOS)
- [ ] Firefox (desktop & mobile)
- [ ] Samsung Internet (mobile)

## Deployment

- [ ] Build production kończy się sukcesem (`npm run build`)
- [ ] Preview działa (`npm run preview`)
- [ ] Wielkość bundle'a jest akceptowalna (<3MB)
- [ ] Aplikacja wdrożona na hosting
- [ ] HTTPS jest włączony (wymagane dla PWA)
- [ ] Service Worker działa na produkcji

---

## 🎉 Gotowe!

Jeśli wszystkie punkty są zaznaczone, aplikacja jest w pełni funkcjonalna i gotowa do użycia!

## 📞 W Razie Problemów

1. Sprawdź Console (F12) - czy są błędy?
2. Sprawdź Network - czy requesty wychodzą?
3. Sprawdź Application → IndexedDB - czy dane się zapisują?
4. Sprawdź firebase.ts - czy konfiguracja jest poprawna?
5. Uruchom `npm run build` - czy build się kończy sukcesem?

## 🔧 Debug Mode

Dodaj do `src/firebase.ts` na dole:
```typescript
// Debug: pokaż wszystkie zapisy
db.onSnapshot(() => {
  console.log('Firestore data changed!');
});
```

Dodaj do `src/store/useInspectionStore.ts` w każdej akcji:
```typescript
console.log('Action called:', actionName, params);
```
