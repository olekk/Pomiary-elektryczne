# 🎨 Visual Guide - Offline Features

## 🎯 Nowe elementy UI (Before & After)

### 1. Header - Status Badge

#### ❌ Przed:
```
┌─────────────────────────────────────────┐
│ Pomiary Elektryczne          [refresh] │
│ Field Service App                       │
└─────────────────────────────────────────┘
```

#### ✅ Po:
```
┌─────────────────────────────────────────────────────────┐
│ Pomiary Elektryczne   [📴 Offline]   [refresh]        │  ← NOWE!
│ Field Service App                                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Pomiary Elektryczne   [⚠️ 3 oczekuje]   [refresh]     │  ← NOWE! (kliknij = retry)
│ Field Service App                                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Pomiary Elektryczne   [☁️ Online]   [refresh]          │  ← NOWE!
│ Field Service App                                       │
└─────────────────────────────────────────────────────────┘
```

**Kolory:**
- 📴 Offline: `bg-orange-500` (pomarańczowy)
- ⚠️ X oczekuje: `bg-yellow-500` (żółty, clickable)
- ☁️ Online: `bg-green-500` (zielony)

---

### 2. Stats Cards - Nowy kafelek "Pending"

#### ❌ Przed (2 kafelki):
```
┌─────────────────┬─────────────────┐
│ 📄 Wszystkie    │ ✅ Synced       │
│      15         │      15         │
└─────────────────┴─────────────────┘
```

#### ✅ Po (3 kafelki):
```
┌──────────────┬──────────────┬──────────────┐
│ 📄 Wszystkie │ ✅ Synced    │ ⏰ Pending   │  ← NOWE!
│     15       │     12       │     3        │
└──────────────┴──────────────┴──────────────┘
```

**Kolory:**
- Wszystkie: `text-gray-800`
- Synced: `text-green-600`
- Pending: `text-orange-600` ← NOWY

---

### 3. Lista pomiarów - Enhanced Status Badges

#### ❌ Przed:
```
┌────────────────────────────────────────┐
│ ul. Kwiatowa 15                 [🗑️]  │
│ Mieszkanie: 42                         │
│ Technik: Jan Kowalski                  │
│ 2026-01-26  |  Punkty: 5  |  ✅ Synced │  ← Mały, niewidoczny
└────────────────────────────────────────┘
```

#### ✅ Po:
```
┌────────────────────────────────────────┐
│ ul. Kwiatowa 15                 [🗑️]  │
│ Mieszkanie: 42                         │
│ Technik: Jan Kowalski                  │
│ 2026-01-26  |  Punkty: 5               │
│ ┌─────────────────────────┐            │
│ │ ✅ Synced               │  ← NOWY styl (z tłem)
│ └─────────────────────────┘            │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ ul. Testowa 123                 [🗑️]   │
│ Mieszkanie: 7                          │
│ Technik: Anna Nowak                    │
│ 2026-01-26  |  Punkty: 3               │
│ ┌─────────────────────────┐            │
│ │ ⏰ Oczekuje na sync     │  ← NOWY! (pulsująca ikona)
│ └─────────────────────────┘            │
└────────────────────────────────────────┘
```

**Style:**
- Synced: `bg-green-50 text-green-600` + CheckCircle
- Pending: `bg-orange-50 text-orange-600` + Clock (animacja pulse)

---

## 🎬 Scenariusze użycia (Flow Diagrams)

### Scenariusz 1: Zapis w trybie Offline

```
┌─────────────┐
│  UŻYTKOWNIK │
└──────┬──────┘
       │
       │ 1. Klik "+" → wypełnia formularz
       │ 2. Klik "Rozpocznij"
       │ 3. Dodaje pomiary
       │ 4. Klik "Zapisz"
       │
       ▼
┌──────────────────────────────────┐
│   APLIKACJA (OFFLINE MODE)       │
│                                  │
│  ⚡ Instant Actions:             │
│  ├─ Generuje ID: insp_xxx        │  ← < 1ms
│  ├─ Zapisuje do local state     │  ← < 10ms
│  ├─ Aktualizuje UI (optimistic) │  ← < 50ms
│  ├─ Dodaje do Firebase cache    │  ← < 100ms
│  └─ Pokazuje "Oczekuje na sync" │
│                                  │
│  🎯 Total: < 100ms               │
└──────────────────────────────────┘
       │
       │ UI przechodzi do Dashboard NATYCHMIAST
       ▼
┌──────────────────────────────────┐
│   DASHBOARD                      │
│                                  │
│  [📴 Offline]  [🔄]             │
│                                  │
│  📊 Stats:                       │
│  ├─ Wszystkie: 16                │
│  ├─ Synced: 15                   │
│  └─ Pending: 1  ← NOWY!          │
│                                  │
│  📋 Lista:                       │
│  └─ ul. Testowa 123              │
│     [⏰ Oczekuje na sync] ← NOWY!│
└──────────────────────────────────┘
```

### Scenariusz 2: Powrót Online + Auto-Sync

```
┌─────────────────────────────────┐
│  SYSTEM wykrywa online event    │  ← window.addEventListener('online')
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  AUTO-RETRY triggered           │
│                                 │
│  🔄 Retrying pending syncs...   │
│  ├─ insp_123... → Firebase      │
│  ├─ insp_124... → Firebase      │
│  └─ insp_125... → Firebase      │
└────────────┬────────────────────┘
             │
             │ 2-3 sekundy
             ▼
┌─────────────────────────────────┐
│  UI AUTO-UPDATE                 │
│                                 │
│  [☁️ Online]  [🔄]              │
│                                 │
│  📊 Stats:                      │
│  ├─ Wszystkie: 16               │
│  ├─ Synced: 16  ← Zwiększone!   │
│  └─ Pending: 0  ← Wyzerowane!   │
│                                 │
│  📋 Lista:                      │
│  └─ ul. Testowa 123             │
│     [✅ Synced]  ← Zmienione!    │
└─────────────────────────────────┘
```

---

## 📊 Timing Diagram (Performance)

### ❌ Przed implementacją:
```
User clicks "Zapisz"
│
├─ addDoc() waiting...  ───────────────────────────────────► ∞
│                         (waiting for server in offline)
│
└─ UI blocked ═════════════════════════════════════════════► ∞
                        USER FRUSTRATED 😡
```

### ✅ Po implementacji:
```
User clicks "Zapisz"
│
├─ generateId()         ─► [1ms]
├─ Optimistic update    ─► [10ms]
├─ setDoc() (fire&forget) [50ms]
└─ Navigate to Dashboard [100ms]
                        ▲
                        │
                    USER HAPPY 😊

Background sync (parallel):
├─ Firebase cache write ─────► [200ms]
└─ Sync to server (when online) ► [2-3s]
                                  │
                                  └─ Status update ✅
```

**Kluczowe metryki:**
- User-perceived latency: `100ms` (było: `∞`)
- Improvement: `∞x faster` 🚀

---

## 🎨 Color Scheme

### Status Colors:
```css
/* Offline */
.offline-badge {
  background: #f97316; /* orange-500 */
  color: white;
}

/* Pending */
.pending-badge {
  background: #fef3c7; /* yellow-50 */
  color: #d97706;      /* yellow-600 */
}

/* Online & Synced */
.synced-badge {
  background: #dcfce7; /* green-50 */
  color: #16a34a;      /* green-600 */
}

/* Warning (pending with action) */
.warning-badge {
  background: #eab308; /* yellow-500 */
  color: white;
}
```

---

## 🎭 Animacje

### 1. Pulsująca Clock (pending items):
```css
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

### 2. Spinning Refresh (loading):
```css
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

---

## 📱 Responsive Behavior

### Desktop (> 768px):
```
Header: [Title] ────────────── [Status Badge] [Retry] [Refresh]
Stats:  [Card1] [Card2] [Card3]
```

### Mobile (< 768px):
```
Header: [Title]
        [Status Badge] [Retry] [Refresh]

Stats:  [Card1]
        [Card2]
        [Card3]
```

**Kafelki statystyk:** `grid-cols-3` na wszystkich rozmiarach (zmniejszony font na mobile)

---

## 🔔 User Notifications (Console Logs)

W DevTools Console użytkownik (deweloper) widzi:

```javascript
// Online/Offline events
🌐 Network: ONLINE
📴 Network: OFFLINE

// Synchronizacja
✅ Inspection insp_1738021234_abc123 synced successfully
📴 Offline mode: Data queued for sync when online

// Auto-retry
🌐 Connection restored! Auto-retrying pending syncs...
🔄 Retrying sync for 3 pending inspections...
✅ Retry successful for inspection insp_xxx
```

**Emoji legend:**
- 🌐 Network online
- 📴 Offline mode
- ✅ Success
- ❌ Error
- 🔄 Retry
- ⚠️ Warning

---

## 📸 Screenshot Placeholders

### Dashboard - Offline Mode:
```
┌─────────────────────────────────────────────────────────┐
│  Pomiary Elektryczne  [📴 Offline] [⚠️ 2 oczekuje] [🔄]│
│  Field Service App                                      │
├─────────────────────────────────────────────────────────┤
│  ┌─────────┬─────────┬─────────┐                       │
│  │📄 Wszy  │✅ Synced│⏰Pending│                       │
│  │   15    │   13    │    2    │                       │
│  └─────────┴─────────┴─────────┘                       │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────┐     │
│  │ ul. Kwiatowa 15                        [🗑️]  │     │
│  │ Mieszkanie: 42                                │     │
│  │ 2026-01-26  |  Punkty: 5                      │     │
│  │ [✅ Synced]                                   │     │
│  └───────────────────────────────────────────────┘     │
│  ┌───────────────────────────────────────────────┐     │
│  │ ul. Testowa 123                        [🗑️]   │     │
│  │ Mieszkanie: 7                                 │     │
│  │ 2026-01-26  |  Punkty: 3                      │     │
│  │ [⏰ Oczekuje na sync] ← pulsuje                │     │
│  └───────────────────────────────────────────────┘     │
│                                                         │
│                                    [+]                  │
└─────────────────────────────────────────────────────────┘
```

---

**Status:** ✅ Visual Guide Complete  
**Dla:** Użytkowników i testerów  
**Next Step:** Testowanie według `INSTRUKCJA_TESTOWANIA_OFFLINE.md`
