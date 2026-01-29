# 🧪 Dane Testowe - Pomiary Elektryczne

## Przykładowe Dane do Testowania

### Mieszkanie 1 - Wszystkie Pomiary Pozytywne

```
Adres: ul. Kwiatowa 15
Mieszkanie: 42
Technik: Jan Kowalski

Pomiary:
1. WNP 16A, Zs = 0.45Ω → TAK (dop: 2.88Ω)
2. WNP 16A, Zs = 1.20Ω → TAK (dop: 2.88Ω)
3. WNP 16A, Zs = 0.85Ω → TAK (dop: 2.88Ω)
4. WNP 20A, Zs = 1.50Ω → TAK (dop: 2.30Ω)
5. WNP 20A, Zs = 2.10Ω → TAK (dop: 2.30Ω)
```

### Mieszkanie 2 - Mix Wyników

```
Adres: ul. Słoneczna 8
Mieszkanie: 15
Technik: Anna Nowak

Pomiary:
1. WNP 16A, Zs = 0.65Ω → TAK
2. WNP 16A, Zs = 3.50Ω → NIE (przekroczenie!)
3. BI 16A, Zs = 2.50Ω → TAK
4. BI 16A, Zs = 2.80Ω → NIE (dop: 2.66Ω)
5. WNP 16A, B.UZ → B.UZ (brak uziemienia)
```

### Mieszkanie 3 - Różne Amperaże

```
Adres: al. Niepodległości 100
Mieszkanie: 7
Technik: Piotr Wiśniewski

Pomiary:
1. WNP 16A, Zs = 1.20Ω → TAK (dop: 2.88Ω)
2. WNP 20A, Zs = 1.80Ω → TAK (dop: 2.30Ω)
3. WNP 25A, Zs = 1.70Ω → TAK (dop: 1.84Ω)
4. BI 16A, Zs = 2.00Ω → TAK (dop: 2.66Ω)
5. BI 20A, Zs = 1.90Ω → TAK (dop: 2.13Ω)
6. BI 25A, Zs = 1.60Ω → TAK (dop: 1.70Ω)
```

### Mieszkanie 4 - Przypadki Brzegowe

```
Adres: ul. Polna 3
Mieszkanie: 101
Technik: Maria Kowalczyk

Pomiary:
1. WNP 16A, Zs = 2.88Ω → TAK (dokładnie na granicy!)
2. WNP 16A, Zs = 2.89Ω → NIE (o 0.01Ω za dużo)
3. BI 16A, Zs = 2.66Ω → TAK (dokładnie na granicy!)
4. BI 16A, Zs = 2.67Ω → NIE (o 0.01Ω za dużo)
5. WNP 16A, B.UZ → B.UZ
```

### Mieszkanie 5 - Wszystkie Negatywne

```
Adres: ul. Cicha 22
Mieszkanie: 5
Technik: Tomasz Lewandowski

Pomiary:
1. WNP 16A, Zs = 5.50Ω → NIE
2. WNP 16A, Zs = 4.20Ω → NIE
3. WNP 20A, Zs = 3.80Ω → NIE
4. BI 16A, Zs = 3.50Ω → NIE
5. BI 20A, Zs = 2.90Ω → NIE
```

## Scenariusze Testowe

### Scenariusz 1: Szybkie Wprowadzanie (Smart Defaults)

1. Utwórz nowy pomiar
2. Ustaw: WNP, 16A
3. Wprowadź 5 pomiarów z wartościami: 0.45, 0.85, 1.20, 1.50, 2.10
4. **Oczekiwany rezultat:** Wszystkie ustawienia kopiują się automatycznie, wpisujesz tylko wartości

### Scenariusz 2: Zmiana Typu w Trakcie

1. Utwórz nowy pomiar
2. Dodaj 2 pomiary WNP 16A
3. Zmień na BI 16A
4. Dodaj kolejne 2 pomiary
5. **Oczekiwany rezultat:** Współczynnik k zmienia się z 5 na 5.4, Zs_dop się aktualizuje

### Scenariusz 3: Brak Uziemienia

1. Utwórz nowy pomiar
2. Dodaj 2 normalne pomiary
3. Kliknij "Brak Uziemienia (B.UZ)"
4. Potwierdź modal
5. **Oczekiwany rezultat:** Punkt z oceną B.UZ, kolor pomarańczowy

### Scenariusz 4: Offline Mode

1. Utwórz pomiar z 3 punktami
2. Zapisz
3. Wyłącz internet (DevTools → Network → Offline)
4. Utwórz kolejny pomiar
5. Zapisz
6. **Oczekiwany rezultat:** Dane zapisują się lokalnie, status "Pending"
7. Włącz internet
8. Odśwież
9. **Oczekiwany rezultat:** Status zmienia się na "Synced"

### Scenariusz 5: Generowanie PDF

1. Utwórz pomiar z 5 punktami
2. Zapisz
3. Dodaj podpis
4. Kliknij "Generuj PDF"
5. **Oczekiwany rezultat:** PDF pobiera się z pełnymi danymi i podpisem

## Wartości Graniczne do Testowania

### WNP (k=5, U₀=230V)

- 16A: Zs_dop = 230/(5×16) = 2.875Ω ≈ 2.88Ω
- 20A: Zs_dop = 230/(5×20) = 2.30Ω
- 25A: Zs_dop = 230/(5×25) = 1.84Ω

### BI (k=5.4, U₀=230V)

- 16A: Zs_dop = 230/(5.4×16) = 2.662Ω ≈ 2.66Ω
- 20A: Zs_dop = 230/(5.4×20) = 2.13Ω
- 25A: Zs_dop = 230/(5.4×25) = 1.70Ω

## Testy Edge Cases

### Test 1: Bardzo małe wartości

```
Zs = 0.01Ω → TAK (wszystkie typy)
```

### Test 2: Bardzo duże wartości

```
Zs = 999.99Ω → NIE (wszystkie typy)
```

### Test 3: Wartości dziesiętne

```
Zs = 1.234567Ω → Powinno zaokrąglić do 1.23Ω w wyświetlaniu
```

### Test 4: Zero

```
Zs = 0Ω → Powinno być odrzucone (niepoprawny pomiar)
```

### Test 5: Wartości ujemne

```
Zs = -1.5Ω → Powinno być odrzucone (niemożliwe fizycznie)
```

## Checklist Testowania

- [ ] Wprowadzenie 5 pomiarów z różnymi typami
- [ ] Test Smart Defaults (kopiowanie ustawień)
- [ ] Test zmiany typu WNP → BI
- [ ] Test zmiany amperażu 16A → 20A → 25A
- [ ] Test B.UZ (brak uziemienia)
- [ ] Test usuwania punktu
- [ ] Test zapisywania do Firestore
- [ ] Test wczytywania z Firestore
- [ ] Test offline mode
- [ ] Test generowania PDF
- [ ] Test podpisu cyfrowego
- [ ] Test wartości granicznych
- [ ] Test edge cases

## Przykładowe Adresy (Polska)

```
ul. Kwiatowa 15, Warszawa
al. Niepodległości 100, Kraków
ul. Słoneczna 8, Gdańsk
ul. Polna 3, Wrocław
ul. Cicha 22, Poznań
ul. Długa 45, Łódź
ul. Krótka 7, Szczecin
ul. Nowa 12, Lublin
ul. Stara 88, Katowice
ul. Zielona 33, Bydgoszcz
```

## Przykładowi Technicy

```
Jan Kowalski
Anna Nowak
Piotr Wiśniewski
Maria Kowalczyk
Tomasz Lewandowski
Katarzyna Zielińska
Andrzej Szymański
Magdalena Woźniak
Krzysztof Dąbrowski
Joanna Kamińska
```

---

**Tip:** Użyj tych danych do szybkiego wypełnienia formularzy podczas testowania!
