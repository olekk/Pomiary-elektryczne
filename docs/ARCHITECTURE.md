# Architecture — Pomiary Elektryczne

Canonical technical reference for the current system. This document describes **how the app works today**, verified against source as of 2026-07-03. It intentionally contains no changelog — for how the architecture got here and why past decisions were made (including ones since reversed), see [`docs/archive/ARCHITECTURE_HISTORY.md`](archive/ARCHITECTURE_HISTORY.md).

## 1. Overview & Tech Stack

Pomiary Elektryczne is an offline-first Progressive Web App used by electricians in the field to record electrical safety measurements (short-circuit loop impedance, "Zs"), assess pass/fail per point against regulatory limits, collect signatures, and generate signed PDF inspection protocols — while working with unreliable or no internet connectivity.

| Layer | Choice |
| --- | --- |
| UI framework | React 19 + TypeScript, Vite 7 |
| Styling | Tailwind CSS 4 (dark-mode-only design system) |
| Routing | react-router-dom v7 (`BrowserRouter`) |
| Backend | Firebase (Firestore + Auth), no custom server |
| State management | None global — Firestore `onSnapshot` + custom hooks + React Context (see §6) |
| PDF | `@react-pdf/renderer`, dynamically imported |
| Signatures | `react-signature-canvas` |
| Icons | `lucide-react` |
| Mobile debugging | `vconsole`, lazy-loaded behind `?debug=1` |
| Testing | Vitest (unit + Firebase-emulator integration), Stryker (mutation) |
| PWA | `vite-plugin-pwa` (`injectManifest` strategy, custom `public/sw.js`) |

## 2. Architecture Principles

**Firestore is the state management layer.** There is no Redux/Zustand/Jotai/global-store equivalent anywhere in the app. Firestore's `persistentLocalCache` (with `persistentMultipleTabManager`) is the offline database; UI components subscribe to it directly via `onSnapshot`-backed hooks. This is a deliberate, load-bearing decision — a Zustand store was tried in two different shapes earlier in the project and removed after causing production "ghost data" and stale-cache bugs. See [Architecture History, Era 6](archive/ARCHITECTURE_HISTORY.md#era-6--zustand-removed-entirely-firestore-becomes-the-store-2026-02-14) before proposing a global store for any reason.

**Writes are fire-and-forget; reads are live subscriptions.** Every Firestore write goes through `src/services/firebaseService.ts`, is never `await`-ed inside a UI event handler, and is followed immediately by a local state update / navigation. Every read is an `onSnapshot` subscription owned by the component that needs it — there is no separate read-cache layer beyond what Firestore itself provides. See §8 for the full rationale and invariants.

**Offline is the default assumption, not an edge case.** IDs are generated client-side so writes never wait on a server round-trip; PDF generation reads only local/cached state; auth session survives offline cold starts via a cached UID hint. Every one of these exists because of a specific, previously-shipped bug — see the History doc for each.

**Atomic Design governs the component layer** (`atoms` → `molecules` → `organisms` → screens), with business logic pushed down into `services/` (Firestore writes) and `utils/` (pure functions, fully unit-tested).

## 3. Folder Structure

```
src/
├── components/
│   ├── atoms/              # Button, Input, Select, Card, Badge, ActionMenu, Fab — zero business logic
│   ├── molecules/          # FormField, InspectionCard, MeasurementListItem, StatsCard, DataSourceChip
│   ├── organisms/          # KlatkaInspectionForm, SignaturePanel,
│   │                        # DashboardStats, InspectionsList, MeasurementSettings, NotesSection
│   ├── layout/
│   │   └── MainLayout.tsx  # Header/footer chrome, logout, auto-sync-on-mount trigger
│   ├── ProjectsScreen.tsx          # route: /
│   ├── ProjectDetailsScreen.tsx    # route: /project/:id
│   ├── BuildingDetailsScreen.tsx   # route: /building/:id
│   ├── MeasurementScreen.tsx       # route: /building/:buildingId/measurement
│   ├── SummaryScreen.tsx           # route: /building/:buildingId/summary/:inspectionId
│   ├── SettingsScreen.tsx          # route: /settings
│   ├── LoginScreen.tsx             # rendered outside the router when unauthenticated
│   ├── PdfGenerator.tsx            # @react-pdf/renderer document definition
│   ├── NumericKeypad.tsx           # large-button numeric input for field use
│   └── DebugConsole.tsx            # lazy vConsole loader, active behind ?debug=1
├── hooks/                   # All state-management hooks — see §6
│   ├── useAuth.tsx
│   ├── useCollection.ts
│   ├── useDocument.ts
│   ├── useOnlineStatus.ts
│   ├── useUserSettings.ts
│   ├── usePendingSync.ts
│   └── index.ts
├── services/
│   ├── firebaseService.ts  # ALL Firestore writes/deletes (the one exception: two simple
│   │                        # addDoc() calls for building creation live in their screens)
│   └── __tests__/           # Firebase-emulator integration tests
├── utils/                   # Pure functions only — unit-tested, 90% statement coverage enforced
│   ├── addressHelper.ts, apartmentUtils.ts, cn.ts, dateUtils.ts, firestoreMappers.ts,
│   │   generatePdf.tsx, idGenerator.ts, logger.ts, measurementCalculations.ts,
│   │   protocolGenerator.ts, toast.ts, validators.ts
│   └── __tests__/
├── types/index.ts            # All domain types + ZS_DOP_TABLE + DEFAULT_K_FACTORS
├── firebase.ts                # App/Auth/Firestore init + recoverFirestore()
├── App.tsx                    # AuthProvider + route table + auth guard
└── main.tsx
```

There is **no `src/store/` directory**. If any documentation you encounter references one, it predates 2026-02-14 (see History).

## 4. Data Model

Authoritative source: `src/types/index.ts`. Reproduced here for reference — if this ever disagrees with the source file, trust the source file.

```typescript
type ProtectionType = 'WNP' | 'BI'
type Amperage = 10 | 16 | 20 | 25
type NoGroundingType = 'NO_PIN' | 'NO_CONN' | 'HIGH_Z' | null
type Room = 'Łazienka' | 'Kuchnia' | (string & {})   // constrained-but-extensible union
type SocketType = 'Gniazdo 230V' | 'Gniazdo IP44'
type UnitType = 'mieszkanie' | 'lokal' | 'klatka'
type InspectionStatus = 'COMPLETED' | 'INACCESSIBLE'

interface Measurement {
  id: string
  pointNumber: number
  room: Room
  protectionType: ProtectionType
  amperage: Amperage
  zsValue: number | null      // measured Zs
  zsDop: number                // allowable Zs (looked up from ZS_DOP_TABLE)
  result: 'TAK' | 'NIE'        // binary pass/fail — see History Era 8 for why not three-state
  noGrounding?: NoGroundingType
  socketType: SocketType
}

interface Project {
  id: string
  name: string
  createdAt: Date
  status: 'active' | 'archived'
}

interface Building {
  id: string
  projectId: string
  name?: string        // legacy field, back-compat only — see §5
  street: string
  zipCode: string
  city: string
  createdAt: Date
  updatedAt: Date
  userId: string
}

interface Inspection {
  id?: string
  projectId: string            // REQUIRED
  buildingId: string           // REQUIRED
  address: string
  apartmentNumber: string
  ownerName?: string
  date: Date
  technicianName: string
  technicianLicenseNumber?: string   // snapshotted from UserSettings at creation
  technicianSignature?: string       // base64, snapshotted from UserSettings at creation
  reviewerName?: string              // second signer — snapshotted from UserSettings
  reviewerLicenseNumber?: string
  reviewerSignature?: string
  notes?: string
  measurements: Measurement[]        // empty for unitType 'klatka'
  ownerSignature?: string            // base64, collected in SummaryScreen (not for 'klatka')
  protocolNumber: string
  synced?: boolean
  status?: InspectionStatus          // default 'COMPLETED'
  unitType?: UnitType                 // default 'mieszkanie'
  klatkaData?: KlatkaData              // present only when unitType === 'klatka'
}

interface UserSettings {
  displayName: string
  licenseNumber: string
  signatureBase64: string
  reviewerName: string
  reviewerLicenseNumber: string
  reviewerSignatureBase64: string
}
```

`KlatkaData` (staircase/common-area inspection — see §5) is a ~14-section fixed checklist: electrical supply type, PWP (fire-service power cut-off switch), main protection, GLZ/WLZ wiring condition, distribution board, meter cabinets, surge protection, anti-theft device, administrative panel, lighting (voltage/wiring/staircase-timer or motion-sensor, attic/basement mounting), WLZ resistance test + phase voltages, lightning protection, overall assessment, and defect-remediation deadline. Full field list is in `types/index.ts`; UI is `organisms/KlatkaInspectionForm.tsx`.

`ZS_DOP_TABLE` — the allowable-impedance lookup table — and `DEFAULT_K_FACTORS` (WNP: 5, BI: 5.4) are also defined in `types/index.ts` and are the single source of truth for the pass/fail calculation (`utils/measurementCalculations.ts`).

## 5. Firestore Schema & Collections

Project: `pomiary-elektryczne-57ad6`. Config is inline in `src/firebase.ts` (not env vars — single-tenant internal tool).

**Collections**: `projects`, `buildings`, `inspections`, `users` (document ID = Firebase Auth `uid`).

**Document → domain mapping is centralized in `utils/firestoreMappers.ts`** (`inspectionFromDoc`/`inspectionFromSnapshot`, `buildingFromDoc`/`buildingFromSnapshot`, `projectFromDoc`) — every `useCollection`/`useDocument` subscription in the app uses these shared mappers. Adding a field to `Inspection`/`Building`/`Project` means updating that one module (plus its unit tests) and the write payload in `firebaseService.ts`.

Field-level notes and quirks worth knowing:

- **`Building.name`** is a legacy field from before addresses were split into `street`/`zipCode`/`city`. `getFullAddress()` (`utils/addressHelper.ts`) prefers the structured fields and falls back to `name` for old documents.
- **The mappers read defensively** (`data.field || fallback`) because the schema evolved incrementally and old documents lack newer fields — `technician` → `technicianName`, `signature` → `ownerSignature`, `name` → `street`/`zipCode`/`city` are all renames that only the mapper's fallback bridges.
- **`Inspection` documents omit `undefined` fields on write.** Firestore's SDK throws on `undefined` values; `saveInspectionToFirestore()` explicitly guards `noGrounding` (`noGrounding === undefined ? measurement : { ...measurement, noGrounding }`) and defaults every optional string field to `''`. Any new optional field needs the same treatment.
- **Cascading deletes** (`deleteProjectFromFirestore`, `deleteBuildingFromFirestore` in `firebaseService.ts`) use `writeBatch` after a `getDocs()` query to find children — the one place in the app that intentionally does a blocking, non-cached read, because correctness matters more than offline-availability for a destructive, rare operation.
- **Security rules**: `FIRESTORE_RULES.txt` at the repo root is a **manual reference document, not a deployed/managed rules file** — there is no `firestore.rules` tracked by `firebase.json`, so what's actually enforced in the Firebase Console cannot be verified from this repository. The reference file is also known-stale (it validates a `technician` field that hasn't existed since the rename to `technicianName`). Do not treat it as authoritative; confirm against the Firebase Console before relying on it.

## 6. State Management

No global client store. State lives in four places by design:

| Layer | Used for | Mechanism |
| --- | --- | --- |
| Firestore (`onSnapshot`) | Everything persisted: projects, buildings, inspections, user settings | `useCollection` / `useDocument` / `useUserSettings` |
| React Context | Auth session | `useAuth()` — `AuthProvider` wraps the whole app |
| Component `useState` | In-progress, not-yet-saved forms | Local to the owning screen |
| `sessionStorage` + `location.state` | Survive navigation without a Firestore round-trip | `MeasurementScreen` draft cache; `navigate(path, { state })` handoffs |

### Hook reference

**`useCollection<T>(query, mapper, key, label?)`** — subscribes to a Firestore collection query.

- `key`: a stable string (e.g. `` `inspections-${buildingId}` ``) is the **sole** `useEffect` dependency, so the subscription only restarts when the logical query changes, not on every render. `query` and `mapper` are held in refs.
- Returns `{ data, isLoading, isInitialized, fromCache, error }`. `fromCache` (from `snapshot.metadata.fromCache`, via `includeMetadataChanges: true`) drives the UI's cache-freshness badges (§11).
- **Safety timeout**: if `onSnapshot` never fires within 5s (known iOS Safari stuck-state bug), forces `isLoading = false` so the UI doesn't hang forever.
- Always wrap the `query(...)` object passed in with `useMemo`, keyed on its real dependency.

**`useDocument<T>(docRef, mapper, label?)`** — same shape and safety-timeout behavior, for a single document.

**`useAuth()`** — React Context around `onAuthStateChanged`. Returns `{ user, isAuthChecking, signOutUser }`. Also has a 3s safety timeout for the same class of stuck-state bug. See §10 for the cold-start caching behavior.

**`useUserSettings(uid)`** — subscribes to `users/{uid}`, with an immediate synchronous read from `localStorage` on mount (before the Firestore snapshot arrives) as a cold-start fallback, and writes to both Firestore and `localStorage` on `save()`. Returns technician *and* reviewer name/license/signature plus `isLoading` and `save()`.

**`useOnlineStatus()`** — wraps `navigator.onLine` + `window.online`/`offline` events. **UI hint only** — never used to gate whether a write is attempted, only to decide when to show a status indicator or fire a sync retry.

**`usePendingSync()`** — `useCollection` over `where('synced', '==', false)` across all inspections, plus a `retryPendingSync()` that re-saves and re-marks each one. Invoked automatically on mount by `MainLayout` when online (§8).

## 7. Data Flow — Inspection Lifecycle

Creating and completing an inspection crosses four screens and two persistence layers:

1. **`BuildingDetailsScreen`** builds a skeleton in-memory `Inspection` object (no Firestore write yet) — technician/reviewer data snapshotted from `useUserSettings`, `address` defaulted to the building's full address, an empty/incremented `apartmentNumber`, `unitType: 'mieszkanie'` — then `navigate()`s straight to `MeasurementScreen`, passing the object via `location.state`. The FAB, the "next measurement" flow (`location.state.lastApartmentNumber` → incremented), and resuming an `INACCESSIBLE` unit all use this same navigate-to-screen path; there is no create dialog.

2. **`MeasurementScreen`** holds it in `useState` and mirrors every change to `sessionStorage` (key: `` draft-inspection:{buildingId} ``) via an `updateInspection()` wrapper. The identity fields (adres / typ lokalu / numer / właściciel) are edited **inline at the top of the screen** — they write into the same in-memory inspection through `updateInspection`. The screen also subscribes to sibling inspections (`useCollection`) to drive the duplicate-number warning and automatic `klatka` numbering. Its header carries **Anuluj** (clears the draft → back to building) and **Niedostępne** (fire-and-forget save of an `INACCESSIBLE` record → back; hidden when resuming an existing unit). It only writes to Firestore when the user taps "Zapisz," using a **client-generated ID** (`generateInspectionId()`) so the write never blocks navigation; the protocol number is (re)generated at save/inaccessible time from the possibly-edited apartment number.
   - **Rehydration source depends on `useNavigationType()`**: browser **`POP`** (back/forward) prefers the `sessionStorage` draft, because it holds the most recently edited state; **`PUSH`/`REPLACE`** (a fresh "new measurement" action) prefers `location.state`, because that's the newly-constructed object the user just asked to start editing. Getting this branch backwards reintroduces a real, previously-shipped stale-data bug (History, Era 13) — preserve it exactly if you touch this screen.
   - `klatkaData` follows the same local-state-then-save flow but has no per-point measurement list; `isKlatka` (derived from `unitType === 'klatka'`) switches the entire screen body between the numeric-keypad measurement UI and `KlatkaInspectionForm`.

3. **`SummaryScreen`** receives the saved inspection via `location.state` (fast path, freshly created) or falls back to a live `useDocument` Firestore subscription (reload / deep-link case, using `inspectionId` from the URL). Notes auto-save on a 1s debounce after the user stops typing; the owner signature saves immediately on capture. Both are fire-and-forget. Editing measurements is disabled once an owner signature is present (data-integrity guarantee, not just UI polish).

4. **PDF generation** (`utils/generatePdf.tsx` → `generateInspectionPdf()`) reads whichever inspection object is currently in scope — never re-fetches from the network — so it works fully offline. It shows a progress toast, lazy-imports `@react-pdf/renderer` and `PdfGenerator`, and unconditionally calls `recoverFirestore()` in a `finally` block afterward (see §8).

**Write path invariant, everywhere in the app**: `saveXToFirestore(...).then(...).catch(logger.error)`, then immediately proceed (navigate, close modal, update local state). Never `await` a Firestore write inside a click handler.

## 8. Offline & Sync Strategy

- **Firestore is initialized** with `persistentLocalCache({ tabManager: persistentMultipleTabManager() })` — this *is* the offline database. There is no separate IndexedDB/localStorage layer for inspection data; `localStorage` is used only as a cold-start fallback cache for `UserSettings`.
- **`onSnapshot` double-emit**: every subscription fires once immediately from cache (works offline, `fromCache: true`) and again when the server confirms (`fromCache: false`). UI never needs to branch on `navigator.onLine` to decide what to render — it renders whatever the latest snapshot says.
- **Auto-sync trigger**: `MainLayout` calls `retryPendingSync()` once on mount if online and there's a pending count — since every screen renders inside `MainLayout`, any navigation while online retries pending writes. The `window` `online`/`offline` events only feed the `useOnlineStatus()` UI hint; there is currently **no** retry fired directly on reconnect (a retry happens on the next screen mount instead). Nothing manually calls `enableNetwork()`/`disableNetwork()` — the Firebase SDK manages its own connection; the app only nudges it to retry.
- **Safety timeouts**: `useCollection`, `useDocument`, and `useAuth` each force their loading state to `false` after 3–5 seconds if the underlying Firebase callback never fires — mitigation for a known iOS Safari stuck-state bug (History, Era 7). Any new Firestore-subscribing hook should follow the same pattern.
- **`recoverFirestore()`** (`src/firebase.ts`): terminates and recreates the Firestore instance. Required because heavy `fetch()` activity (PDF font/asset loading) can kill Firestore's internal WebChannel on iOS Safari, hanging all subsequent reads. Called unconditionally after every PDF generation. **Any future feature doing sustained fetch/blob work should call it too.**
- **Client-generated IDs** (`generateInspectionId()`, format `insp_{timestamp}_{random}`) mean every write can resolve against the local cache instantly, with no server round-trip required before the app can navigate away or show success.

## 9. PDF Generation

`utils/generatePdf.tsx` (`generateInspectionPdf(inspection)`) is the single entry point — do not re-implement the blob/download dance elsewhere (it was duplicated once, in 2026-06, and centralized two days later; see History Era 12).

- Shows an indeterminate toast ("Generowanie PDF…") via `utils/toast.ts`.
- Dynamically imports `@react-pdf/renderer` and `components/PdfGenerator.tsx` (kept out of the main bundle — see §15).
- `PdfGenerator.tsx` registers the Roboto font family from `/fonts/Roboto-{Regular,Bold}.ttf`, which are precached by the service worker specifically for this purpose (`vite.config.ts`'s `globPatterns` includes `ttf`) — `@react-pdf/renderer` fetches fonts via plain `fetch()`, not as font requests, so runtime font-caching strategies wouldn't otherwise catch them.
- On error, the toast is updated with a specific message depending on whether the failure looks font-related, network-related, or other.
- `finally` block always calls `recoverFirestore()` (§8), regardless of success or failure.
- Output filename is the protocol number with `/` replaced by `-`.

## 10. Authentication

Firebase Auth, **email/password only** — no self-service registration; users are created manually in the Firebase Console. No anonymous auth (despite early setup docs describing it as a plan — see History, Era 0).

- Session persistence is Firebase Auth's own `localStorage` cache, which is what makes offline-authenticated cold starts possible at all.
- **Cold-start fix**: `onAuthStateChanged` needs network to verify a token, so on an offline page reload it briefly reports `user: null` even for a valid session. `useAuth` caches just the `uid` (key `cachedAuthUid`) on every successful login; `App.tsx`'s route guard treats "no user object yet, but a cached UID exists" as "render the app, not the login screen" while waiting for `onAuthStateChanged` to confirm.
- `LoginScreen` translates Firebase Auth error codes to specific Polish user-facing messages (`auth/invalid-credential`, `auth/network-request-failed`, `auth/user-disabled`, etc.) — extend that `switch` rather than surfacing raw Firebase error text for any new auth flow.
- No cleanup-on-logout beyond `signOut(auth)` and clearing `cachedAuthUid` is needed — because there's no global store to leak stale data, unmounting the authenticated screens (via the route guard swapping to `LoginScreen`) is sufficient; each hook's own `useEffect` cleanup unsubscribes its `onSnapshot` listener automatically. (An earlier architecture needed an explicit 3-step logout sequence for this — see History, Era 3 — which is no longer necessary or present.)

## 11. UI Architecture & Design System

**Dark mode only** — no theme toggle, no light-mode styles. Background: `bg-slate-950` (app) / `bg-slate-800`–`bg-slate-900` (cards/containers) with `border-slate-700`/`border-slate-800`. Text: `text-slate-100` (primary), `text-slate-400` (secondary/muted). Links: `text-blue-400 hover:text-blue-300`. Inputs: `bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500`.

Buttons go through the `Button` atom's `variant` prop rather than hand-rolled colors: `primary` (blue), `secondary` (slate), `danger` (red), `success` (green), `warning` (orange).

Semantic result colors: `TAK` (pass) → green, `NIE` (fail) → red. `KlatkaData` fields reuse the same convention for `dobry`/`zły`, `jest`/`brak`, etc. There is no third/warning color for measurement results — the earlier three-state `B.UZ` was removed (History, Era 8).

**Cache-freshness indicator**: list screens show `molecules/DataSourceChip` fed by `useCollection`/`useDocument`'s `fromCache` flag — amber "Dane lokalne" (serving from local cache) vs. green "Aktualne" (server-confirmed). Reuse that component for any new screen that needs to communicate data freshness, rather than inventing a new indicator.

**Row-level actions** go through the shared `atoms/ActionMenu.tsx` kebab (three-dot) dropdown — handles outside-click dismissal, `Escape`, and arrow-key navigation — not one-off icon buttons.

**Toasts** (`utils/toast.ts`) are imperative and DOM-based, not a React component/context, specifically so they can be called from plain utility functions (like `generateInspectionPdf()`) that run outside any component tree. Use them for background/async status; use `alert()` (the existing pattern) for blocking, must-acknowledge validation/error messages, and ordinary component state for anything already inside a render tree.

**Modals** are hand-rolled per use site: `fixed inset-0 bg-black bg-opacity-70` overlay + centered card, no portal/dialog library. The inline "new project"/"new building" modals are the reference implementations.

**Floating action buttons** (the bottom-right "+" on the Projects/Buildings/Inspections screens) go through the shared `atoms/Fab.tsx`.

## 12. Component Inventory

| Component | Layer | Purpose |
| --- | --- | --- |
| `Button`, `Input`, `Select`, `Card`, `Badge` | atoms | Presentational primitives, zero business logic |
| `ActionMenu` | atoms | Reusable kebab dropdown with keyboard nav |
| `Fab` | atoms | Floating action button (bottom-right "+") |
| `FormField` | molecules | Label + input + error wrapper |
| `InspectionCard` | molecules | Inspection summary row (list view), PDF/delete actions |
| `MeasurementListItem` / `CompactMeasurementListItem` | molecules | Measurement row, full and summary variants |
| `StatsCard` | molecules | Single stat tile used by `DashboardStats` |
| `DataSourceChip` | molecules | Cache-freshness chip ("Dane lokalne" / "Aktualne") |
| `KlatkaInspectionForm` | organisms | ~14-section staircase inspection checklist |
| `SignaturePanel` | organisms | Signature capture; reused identically for technician, reviewer, and owner signatures |
| `DashboardStats` | organisms | Total/synced/pending counts for a building |
| `InspectionsList` | organisms | List of `InspectionCard`s with loading/cache states |
| `MeasurementSettings` | organisms | Room/protection-type/amperage/socket-type controls |
| `NotesSection` | organisms | Collapsible protocol-notes editor |
| `MainLayout` | layout | Header/footer chrome, logout, settings link, auto-sync-on-mount |

## 13. Routing Table

| Path | Component | Notes |
| --- | --- | --- |
| `/` | `ProjectsScreen` | Project list, create/delete |
| `/project/:id` | `ProjectDetailsScreen` | Buildings in a project, address search, per-building stats |
| `/building/:id` | `BuildingDetailsScreen` | Inspections in a building, create/resume/mark-inaccessible |
| `/building/:buildingId/measurement` | `MeasurementScreen` | Data entry (measurements or klatka checklist) |
| `/building/:buildingId/summary/:inspectionId` | `SummaryScreen` | Review, notes, signature, PDF |
| `/settings` | `SettingsScreen` | Technician + reviewer profile and signatures |
| *(none — rendered outside the router)* | `LoginScreen` | Shown when unauthenticated and no cached UID |

## 14. Testing Strategy

| Type | Location | Runner | Scope / threshold |
| --- | --- | --- | --- |
| Unit | `src/utils/**/__tests__/*.test.ts` | Vitest | Pure functions in `utils/`; **90% statement coverage enforced** on `src/utils/**` (`vitest.config.ts`; the browser-only modules `toast.ts`/`generatePdf.tsx` and the barrel `index.ts` are excluded — they can't run in the node test environment) |
| Integration | `src/services/__tests__/*.integration.test.ts` | Vitest + real Firebase Emulator (no mocks) | `firebaseService.ts` — save/read round-trips, cascading deletes, required-field validation |
| Mutation | `src/utils/**` | Stryker | Thresholds: high 80 / low 60 / break 50 |

There is currently **no automated test coverage for components, hooks, or screens** — including the offline-sync UI paths, which is where most of the bugs in the project's history (see Architecture History) actually occurred. This is a known gap, not an oversight to silently "fix" — see §16.

Commands: `npm test` (unit), `npm run test:coverage`, `npm run test:integration` (requires `firebase emulators:start --only firestore` first, or use `npm run test:emulator` to run both), `npm run test:mutation`.

## 15. Build & Deployment

- **Vite** (`vite.config.ts`): manual chunk splitting — `vendor-react`, `vendor-firebase`, `vendor-ui`, `pdf-lib` (`@react-pdf/renderer`, only loaded when a PDF is actually requested, via dynamic `import()` in `utils/generatePdf.tsx`).
- **PWA**: `vite-plugin-pwa` with the `injectManifest` strategy against a custom `public/sw.js` (Workbox `precacheAndRoute`), `registerType: 'autoUpdate'`. Precache glob explicitly includes `.ttf` for offline PDF font access (see §9).
- **TypeScript**: `tsc -b && vite build` — type-checking happens as part of the build; there's no separate typecheck script or CI gate for it.
- **Firestore queries are always scoped** with `where(...)` (`projectId`, `buildingId`, `synced`) — the app never fetches a full collection and filters client-side.
- **Deployment**: Firebase Hosting (`firebase.json` → `dist/`, SPA rewrite to `index.html`). `.github/workflows/firebase-hosting-merge.yml` and `firebase-hosting-pull-request.yml` handle deploy automation; as of this writing neither workflow runs `npm test`/`npm run lint` as a gate — deploys are not blocked by test or lint failures.

## 16. Known Issues / Technical Debt

Living section — update in place as items are fixed or new ones are found, rather than leaving stale entries.

1. **Firestore rules drift.** `FIRESTORE_RULES.txt` (repo root) references a `technician` field that hasn't existed since the rename to `technicianName`, and there's no `firestore.rules` tracked in this repo to verify against what's actually deployed. Needs reconciling with the Firebase Console's live rules.
2. **No component/hook/screen test coverage** (§14) — all automated testing is on `utils/` and the Firestore service layer. The offline-sync UI paths are both the riskiest part of the app (by its own bug history) and the least tested.
3. **No documented Firestore data-ownership model.** Current rules (as far as the stale reference file indicates) allow any authenticated user to read/write everything — presumably fine for a small internal team, but that's inferred, not a recorded decision.
4. **No retry-on-reconnect sync trigger.** Pending writes are only retried when a screen (re)mounts while online (§8); regaining connectivity while sitting on one screen doesn't fire a retry until the next navigation. The Firestore SDK still syncs its own cached writes on reconnect — this only affects the app-level `synced` flag bookkeeping — but wiring `retryPendingSync()` to the `online` event (as existed in an earlier architecture) would make the pending counter recover without a navigation.

## See also

- [`docs/archive/ARCHITECTURE_HISTORY.md`](archive/ARCHITECTURE_HISTORY.md) — how this architecture evolved, era by era, and why past approaches (including a global store, three-state results, and two different protocol-number formats) were changed.
- [`docs/archive/`](archive/) — original refactoring write-ups, setup guides, and other historical documents. Treat everything there as a historical record, not current behavior.
- `CLAUDE.md` (repo root) — concise, agent-facing rules and invariants; points back here for any implementation detail.
