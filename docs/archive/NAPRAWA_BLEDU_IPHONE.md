# 🔧 Naprawa Błędu Zapisu na iPhone

## Problem
Po kliknięciu "Zapisz i Przejdź Dalej" na iPhone pojawia się błąd:
```
Błąd podczas zapisywania. Spróbuj ponownie.
```

---

## ✅ ROZWIĄZANIE - Krok po Kroku

### 1️⃣ Skonfiguruj Firestore Rules (NAJWAŻNIEJSZE!)

**To jest najprawdopodobniej główna przyczyna problemu!**

1. Otwórz Firebase Console: https://console.firebase.google.com/
2. Wybierz projekt: **pomiary-elektryczne-57ad6**
3. Menu → **Firestore Database**
4. Zakładka **"Rules"** (Reguły)
5. Skopiuj i wklej kod z pliku **FIRESTORE_RULES.txt**
6. Kliknij **"Publish"** (Opublikuj)

**Czemu to naprawia problem?**
Domyślnie Firestore blokuje wszystkie zapisy. Bez właściwych reguł, każda próba zapisu kończy się błędem `permission-denied`.

---

### 2️⃣ Sprawdź Anonymous Authentication

1. W Firebase Console → **Authentication**
2. Zakładka **"Sign-in method"**
3. Sprawdź czy **Anonymous** jest **włączony** (zielony)
4. Jeśli nie - włącz!

---

### 3️⃣ Testowanie

Po ustawieniu reguł:

1. **Zamknij aplikację** na iPhone całkowicie (przesunięcie w górę i zamknięcie)
2. **Otwórz ponownie** aplikację
3. Stwórz nowy pomiar
4. Dodaj kilka punktów
5. Kliknij **"Zapisz i Przejdź Dalej"**

**Oczekiwany rezultat:** ✅ "Zapisano pomiar!" i przekierowanie do ekranu podsumowania

---

## 🔍 Jeśli Nadal Nie Działa - Debugowanie

### Sprawdź Console w Safari (iOS)

**Na komputerze Mac:**
1. Podłącz iPhone kablem
2. Otwórz Safari na Mac
3. Menu → Develop → [Twój iPhone] → [Karta z aplikacją]
4. Otwiera się Console
5. Spróbuj zapisać pomiar
6. Zobacz błędy w Console

**Szukaj:**
- `permission-denied` → Reguły Firestore źle skonfigurowane
- `unavailable` → Brak internetu
- `unauthenticated` → Anonymous Auth nie działa

---

### Sprawdź Połączenie z Internetem

Na iPhone:
1. Otwórz Safari
2. Spróbuj wejść na google.com
3. Jeśli nie działa - sprawdź WiFi

W aplikacji:
1. Sprawdź czy iPhone ma dostęp do WiFi
2. Spróbuj wyłączyć i włączyć WiFi
3. Spróbuj z danymi mobilnymi

---

### Wyczyść Cache

1. Na iPhone → Settings → Safari
2. "Clear History and Website Data"
3. Otwórz aplikację ponownie

---

## 📱 Test Połączenia Firebase

Aby sprawdzić czy Firebase działa:

1. Otwórz **Firebase Console**
2. Firestore Database → Data
3. Spróbuj zapisać pomiar w aplikacji
4. Odśwież Console
5. Czy nowy dokument się pojawił w kolekcji `inspections`?

**Jeśli TAK** → Aplikacja działa, problem był z wyświetlaniem
**Jeśli NIE** → Problem z zapisem, zobacz poniżej

---

## 🐛 Najczęstsze Przyczyny i Rozwiązania

### 1. Permission Denied
**Przyczyna:** Brak właściwych reguł Firestore
**Rozwiązanie:** Ustaw reguły z pliku `FIRESTORE_RULES.txt`

### 2. Unauthenticated
**Przyczyna:** Anonymous Auth nie jest włączony
**Rozwiązanie:** Włącz Anonymous Auth w Firebase Console

### 3. Network Error
**Przyczyna:** Brak internetu lub firewall
**Rozwiązanie:** Sprawdź połączenie, spróbuj z innej sieci

### 4. Invalid Data
**Przyczyna:** Nieprawidłowe dane w pomiarze
**Rozwiązanie:** Sprawdź czy wszystkie pola są wypełnione (adres, mieszkanie, technik)

---

## ✅ Checklist Weryfikacji

Po naprawie, sprawdź:

- [ ] Firestore Rules opublikowane
- [ ] Anonymous Auth włączony
- [ ] Internet działa na iPhone
- [ ] Aplikacja odświeżona (zamknięta i otwarta ponownie)
- [ ] Wszystkie pola wypełnione (adres, mieszkanie, technik)
- [ ] Przynajmniej 1 pomiar dodany
- [ ] Brak błędów w Console (jeśli masz dostęp)

---

## 🎯 Szybki Test

```
1. Otwórz aplikację na iPhone
2. Kliknij "+" (nowy pomiar)
3. Wypełnij:
   - Adres: Test
   - Mieszkanie: 1
   - Technik: Test
4. Rozpocznij
5. WNP, k=5, 16A
6. Wpisz: 0.45
7. Kliknij ENTER
8. Kliknij "Zapisz i Przejdź Dalej"

Oczekiwany rezultat: ✅ Sukces!
```

---

## 📞 Jeśli Nic Nie Pomaga

1. Sprawdź plik: **FAQ.md** sekcja "Firebase"
2. Sprawdź czy `src/firebase.ts` ma poprawną konfigurację
3. Sprawdź czy projekt Firebase istnieje i jest aktywny
4. Spróbuj na innym urządzeniu (Android, desktop)

---

## 💡 Dodatkowe Informacje

### Logi Debug

Aplikacja wyświetla teraz szczegółowe logi w Console:
- "Rozpoczynam zapis..." - przed zapisem
- "Saving to Firestore:" - dane wysyłane
- "Created document:" lub "Updated document:" - sukces
- "Error code:" i "Error message:" - w przypadku błędu

**Jak zobaczyć logi na iPhone?**
- Potrzebujesz Mac + Safari Inspector (patrz wyżej)
- Lub użyj emulatora/symulatora iOS

---

## 🎉 Po Naprawie

Gdy wszystko działa:
1. Aplikacja zapisuje dane do Firestore
2. Dane są dostępne offline
3. Synchronizacja działa automatycznie
4. Można generować PDF

**Test offline:**
1. Zapisz pomiar z internetem
2. Włącz tryb samolotowy
3. Utwórz nowy pomiar
4. Zapisz (zapisze lokalnie)
5. Wyłącz tryb samolotowy
6. Dane zsynchronizują się automatycznie

---

**Powodzenia! 🚀**

Jeśli problem nadal występuje, sprawdź szczegóły błędu w Console i porównaj z **FAQ.md**.
