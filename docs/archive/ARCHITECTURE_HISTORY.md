# Architecture History

This document explains **how the architecture of Pomiary Elektryczne evolved and why** — it is the merged, chronological changelog previously scattered across `docs/ARCHITEKTURA.md`'s dated sections and the standalone refactoring write-ups in `docs/archive/` (`REFACTORING_COMPLETED.md`, `REFACTORING_SLICES.md`, `ARCHITECTURE_REFACTORING.md`, `REFACTORING_SUMMARY.md`, `CHANGELOG.md`, `CHANGELOG_OFFLINE.md`, `OFFLINE_STRATEGY_IMPLEMENTATION.md`, `OFFLINE_VISUAL_GUIDE.md`, `NAPRAWA_BLEDU_IPHONE.md`).

**This is a historical record, not a source of truth for current behavior.** For how the system works *today*, see `docs/ARCHITECTURE.md`. Dates and commit hashes below are from `git log` and are accurate; narrative details are drawn from the archived docs' own explanations, which were written contemporaneously by whoever made the change.

## Superseded decisions — quick reference

If you're about to reintroduce one of these, read the relevant era below first — most were tried, shipped, and then deliberately reverted after causing real bugs.

| Old approach | Replaced by | When |
| --- | --- | --- |
| Single monolithic `useInspectionStore.ts` (Zustand) | Split into 4 Zustand slices (`authSlice`/`projectSlice`/`inspectionSlice`/`offlineSlice`) | 2026-01-30 |
| Zustand (in any form — monolith or slices) as the state layer | Firestore `onSnapshot` + custom hooks (`useCollection`/`useDocument`/`useAuth`/etc.), no global store at all | 2026-02-14 |
| Manual `navigator.onLine` checks + manual `enableNetwork()`/`disableNetwork()` calls | Trusting Firebase SDK's own network detection; `online` event used only as a retry trigger | 2026-01-31 (added 01-31, then removed again 02-14 when the whole slice it lived in was deleted) |
| `addDoc()` (waits for a server-assigned ID) | `setDoc()` with a client-generated ID (`generateInspectionId()`), so writes never block on the network | 2026-01-26/27 |
| Three-state result `TAK` / `NIE` / `B.UZ` | Binary `TAK` / `NIE`; "no grounding" became a separate `noGrounding` reason code instead of a result value | 2026-02-20 |
| Anonymous Firebase Auth (planned/documented in early setup docs) | Email/password auth only, users created manually in the Firebase Console | some time before the current codebase's `LoginScreen`/`useAuth` were written — no anonymous-auth code has existed in any commit inspected |
| Protocol number format `PROT/RRRR/MM/DD/ULICA/NR` (date-first) | `ULICA/MIESZKANIE/RRRR/MM/DD/PROT` (address-first) | 2026-06-15 |
| Per-screen copy-pasted `pdf(...).toBlob()` + download logic | Centralized `generateInspectionPdf()` in `utils/generatePdf.tsx` | 2026-06-14 (after being duplicated on 2026-06-11 — see Era 12) |

## Era 0 — Initial build (2026-01-23 – 2026-01-27)

First commit `4f688e0` ("init"). Single-tenant field-service PWA: flat `src/components/` (`Dashboard.tsx`, `MeasurementScreen.tsx`, `SummaryScreen.tsx`, `NumericKeypad.tsx`, `PdfGenerator.tsx`), one `useInspectionStore.ts` (Zustand), no `atoms`/`molecules`/`organisms`/`services`/`utils` split yet. Offline persistence (`persistentLocalCache`) and PWA support were wired in almost immediately (`30dea56`, 2026-01-26). The original three-state result (`TAK`/`NIE`/`B.UZ`) and the WNP/BI protection-type model were present from the start.

Early setup docs (`FAQ.md`, `CHECKLIST.md`) describe **Anonymous Firebase Auth** as the intended auth strategy for this phase — no anonymous-auth code was found in the inspected git history, so either it was replaced before being committed or the docs were aspirational. Current auth has always been email/password in every commit reviewed.

## Era 1 — First offline-first fix: client-side IDs + optimistic updates (2026-01-26 – 2026-01-27)

**Problem** (documented in `OFFLINE_STRATEGY_IMPLEMENTATION.md`): saving a measurement while offline hung forever. Root cause: `addDoc()` waits for a **server-assigned document ID** before its promise resolves — with no server reachable, the promise never settled, and the UI showed an infinite "Zapisywanie…" spinner.

**Fix** (`36a3690` "offline functionality", `0564635` store refactor): switched to `setDoc()` with a **client-generated ID** (`generateInspectionId()` → `insp_{timestamp}_{random}`), so the write resolves against the local Firestore cache immediately regardless of network state. Added optimistic local-state updates before the Firestore call, a `synced: false` flag, `window.online`/`window.offline` listeners for an auto-retry trigger, and visual sync-status badges in `Dashboard.tsx` (documented visually in `OFFLINE_VISUAL_GUIDE.md`).

This is the origin of the **fire-and-forget write** pattern that still governs every Firestore write in the app today — the specific implementation (Zustand store, `Dashboard.tsx`) has been completely replaced twice since, but the underlying principle from this fix was never reverted.

A separate, unrelated iOS issue from the same period (`NAPRAWA_BLEDU_IPHONE.md`): saves failing on iPhone turned out to be a **missing/misconfigured Firestore security rules** problem (`permission-denied`), not an offline/sync bug. Worth keeping distinct from the *later*, different iOS Safari issue in Era 7 (WebChannel death from heavy `fetch()` activity) — two unrelated "it's broken on iPhone" incidents, two unrelated root causes.

## Era 2 — Atomic Design refactor + Projects hierarchy (2026-01-29 – 2026-01-30)

`a44405c` ("refactor to atomic design"): the flat component list was split into `atoms/` → `molecules/` → `organisms/` → page-level screens, with `services/firebaseService.ts` and `utils/` (`idGenerator.ts`, `measurementCalculations.ts`, `validators.ts`) extracted out of the store and components. Documented in `ARCHITECTURE_REFACTORING.md` and `REFACTORING_SUMMARY.md`, which report `Dashboard.tsx` shrinking from 296 to 64 lines and the store from 419 to 245 lines across the refactor.

In parallel (`88fcec0` "Projects Screen Refactor", `ab7a17f` "New Project UI"), a `Project` → `Building` → `Inspection` hierarchy replaced the original flat `Inspection` list. This was a **clean-slate, non-backward-compatible** change: every inspection was required to carry a `projectId` going forward, with no migration path for pre-existing data — an explicit, accepted tradeoff because the app had no production data to preserve yet.

## Era 3 — Store slices + Ghost Data Protection audit (2026-01-30 – 2026-01-31)

`77635b7` ("store slices refactor") split the single `useInspectionStore.ts` into four Zustand slices — `authSlice`, `projectSlice`, `inspectionSlice`, `offlineSlice` — for single-responsibility (`REFACTORING_SLICES.md`).

This immediately surfaced a class of bug the flat store didn't have as visibly: **"ghost data"**, where User B would briefly see User A's projects/inspections right after logging in, because slices held onto previous state across auth changes. `94a1172` ("obsługę stanu online/offline oraz wymuszenie połączenia z siecią...") also added manual `enableNetwork()` calls and `navigator.onLine`-driven state, which fought with the Firebase SDK's own connectivity handling and caused race conditions.

A dedicated audit-and-fix pass on 2026-01-31 (`REFACTORING_COMPLETED.md`) addressed both:

- **Ghost Data Protection**: `loadedUserId`/`loadedProjectId` tracking per slice, clearing stale data the instant a user or project changed, plus a 3-step logout sequence (unsubscribe listeners → reset all store state → `signOut()`), in that order, because getting the order wrong reintroduces the leak.
- **Removed the manual `navigator.onLine`/`enableNetwork()` logic** added the day before — the stated lesson was "don't fight the Firebase SDK's own network detection," keeping only a plain `addEventListener('online', retryPendingSync)` as a trigger.
- Deduplicated date-conversion logic into `ensureDate()` (`utils/dateUtils.ts`) — the one piece of this era's cleanup that is still present essentially unchanged in the current codebase.
- Cascading delete for projects → buildings → inspections via `writeBatch` (`72084a0`) — also still present today.

**The irony, in hindsight**: this entire era's central fix (Ghost Data Protection bolted onto a global store) was itself superseded two weeks later by removing the global store altogether (Era 6) — which eliminated the ghost-data bug class structurally instead of patching around it. The `loadedUserId`/3-step-logout mechanism from this era is *not* present in the current codebase; it isn't needed because there's no longer a store to leak.

## Era 4 — Buildings, protocol numbers, and dual signatures (2026-02-04 – 2026-02-12)

`c60d0bb`/`9a9561c` introduced the `buildings` collection as a distinct level between `Project` and `Inspection`. `067228a` ("numer protokołu") introduced the first structured protocol-number format. `19140cd` ("owner and technician signature; rest of pdf content") split what had been a single signature into **owner signature** (collected per-inspection in `SummaryScreen`) and **technician signature** (set once in settings, snapshotted onto each inspection at creation). `46a94a8` ("zapis niedostępnych mieszkań") added the `INACCESSIBLE` inspection status for "nobody home" visits. `6f0f391` added duplicate-apartment-number validation.

## Era 5 — Optimistic UI formalized + offline PDF fix (2026-02-12 – 2026-02-13)

`ef1c89c` ("offline optimistic updates") generalized the fire-and-forget pattern from Era 1 across every write path in the app (signature save, notes, settings, delete) — documented at the time as: generate ID locally → update local state synchronously → fire Firestore write without `await` → never block or show a blocking spinner for a background sync. This is the version of the pattern that persisted through the Era 6 architecture change and is still the governing rule today.

`c126fef` ("pdf offline") fixed PDF generation failing offline: `@react-pdf/renderer` was loading Roboto fonts from `/fonts/*.ttf` over the network, which isn't available offline. Fix: ship the font files in `public/fonts/`, add them to the service worker's precache glob (`vite.config.ts`), and wrap `Font.register()` in a try/catch with a system-font fallback.

## Era 6 — Zustand removed entirely, Firestore becomes the store (2026-02-14)

**The pivotal rewrite.** `84ffd38` ("Migrate application state management from Zustand store slices to custom React hooks"): deleted all of `src/store/` (10 files, ~750 lines in `inspectionSlice` alone) and the `zustand` dependency, replacing it with the custom hooks that exist today — `useCollection`, `useDocument`, `useAuth`, `useUserSettings`, `useOnlineStatus`, `usePendingSync`.

**Stated motivation**: Firestore's own `persistentLocalCache` already *is* an offline-capable store. A Zustand store sitting in front of it as a synchronization/cache layer was redundant complexity that had already caused two rounds of ghost-data bugs (Era 3) and stale-cache-on-reload issues. Removing the intermediary layer removed the bug class structurally rather than requiring ongoing defensive code (`loadedUserId` tracking, 3-step logout, cross-slice `as any` casts) to keep it safe.

Net effect reported at the time: -1242 lines. `26be211`, same day, added the explicit `key` parameter to `useCollection` so subscriptions only restart when the logical query changes, not on every render.

This is the architecture described in full in `docs/ARCHITECTURE.md` today. **Do not propose reintroducing a global client-side store without reading this era first** — it was tried, in two different shapes, and reverted both times.

## Era 7 — iOS Safari stability fixes (2026-02-16 – 2026-02-17)

`1e9e928`/`2ffb69a` ("fix infinite loading") — the safety-timeout pattern in `useCollection`/`useDocument`/`useAuth` (force `isLoading = false` after a few seconds if `onSnapshot`/`onAuthStateChanged` never fires) dates from here, addressing a known iOS Safari IndexedDB/WebChannel stuck-state bug.

`1e20c57` ("Reinitialize Firestore after PDF generation to prevent SDK hangs on iOS Safari") — the origin of `recoverFirestore()` in `src/firebase.ts`. Root cause: sustained `fetch()` activity during PDF generation (font/asset loading) saturates iOS Safari's connection pool and kills Firestore's internal WebChannel, leaving all subsequent `onSnapshot`/`getDoc` calls hung indefinitely. The fix — terminate and recreate the Firestore instance after every PDF generation, success or failure — is unrelated to the Era 1 "permission-denied" iPhone bug; they are two different iOS issues that happen to both manifest as "broken on iPhone."

## Era 8 — Binary results, cold-start fix, extended measurement fields (2026-02-20 – 2026-02-21)

`b05f2cc` ("only YES NO rating, remove b.uz") — the three-state `TAK`/`NIE`/`B.UZ` result became strictly binary `TAK`/`NIE`; "no grounding" became a `noGrounding` reason code (`NO_PIN`/`NO_CONN`/`HIGH_Z`) attached to a `NIE` result rather than a distinct third outcome. `8ee3731` added free-text custom rooms. `2556692` added `socketType` (`Gniazdo 230V` / `Gniazdo IP44`).

`b628fd1` ("Cache authentication state to improve cold start loading") — the `cachedAuthUid` localStorage fix for the offline cold-start problem: `onAuthStateChanged` needs network to verify a token, so on an offline page reload it briefly reports `user: null` even for a validly-logged-in session, flashing `LoginScreen`. Caching just the UID (not any credential) lets the app guess "probably still logged in" and render the main UI while waiting for Firebase to confirm.

## Era 9 — Unit types, protocol format v2, testing infrastructure (2026-03-02 – 2026-03-03)

`4cd89fe` ("typ lokalu") introduced `UnitType` (`mieszkanie`/`lokal`), predating the later `klatka` addition in Era 11. `90d38b9` adjusted protocol-number wrapping/filename length. `d9e1614` ("rodo, disable edit when signed") — once an inspection has an owner signature, its measurements become read-only (a data-integrity/consent guarantee, not just a UI nicety). Test infrastructure landed here: Vitest unit tests for `utils/`, Stryker mutation testing, and Firebase-emulator-backed integration tests for `services/` (`458ea63`, `744f035`, `c31ef65`).

## Era 10 — Auto-sync on mount (2026-03-06)

`b7b9810`/`d53e904` — `usePendingSync` gained a trigger to retry any `synced: false` inspection automatically whenever the app or a screen mounts while online, on top of the existing `online`-event retry from Era 1/6.

## Era 11 — Klatka (staircase) inspections (2026-03-24 – 2026-03-31)

`416ee4a` / `ba06ca5` — a third `UnitType`, `klatka` (building staircase/common-area inspection), added alongside `mieszkanie`/`lokal`. Unlike a regular apartment inspection, `klatka` has no per-point `Measurement[]` and no owner signature — instead it captures a fixed, ~14-section checklist (`KlatkaData`: main supply, PWP, GLZ/WLZ wiring, distribution board condition, lightning protection, etc.) reflecting a different, less frequent inspection type technicians also perform. `cb352af` and `af108a4` refined which fields apply to which unit type; `df6841b` pulled signature-panel visibility/state fully inside `SignaturePanel` itself (removing duplicated open/close state from its callers).

## Era 12 — UX polish, DRY PDF generation, cache indicators, search (2026-05-12 – 2026-06-15)

A cluster of UX-quality changes after a multi-month gap:

- `9db68c0` — introduced the shared `ActionMenu` kebab dropdown, replacing one-off delete icon buttons across Projects/Buildings/Inspections.
- `7ba8aa4` ("copied generatePDF function - has to DRY") → `19b3cd9` (centralized into `utils/generatePdf.tsx`) — a real, self-acknowledged duplication-then-fix cycle: PDF-trigger logic got copy-pasted into a second screen, was flagged as needing deduplication in the same commit message, and was centralized two days later. `682a416` removed the now-dead per-screen copy.
- `6e6ba11`/`a052617` — `fromCache` tracking added to `useCollection`/`useDocument`, surfaced as the amber "Dane lokalne" / green "Aktualne" freshness badges.
- `cd89908` — diacritic-insensitive address search added to `ProjectDetailsScreen`; "Inspections" label renamed to "Protokoły" in the UI.
- `078b1c5` — imperative, DOM-based toast notifications (`utils/toast.ts`), first used for PDF-generation progress.
- `b7e10b9` — protocol number format changed again, from date-first (`PROT/RRRR/MM/DD/ULICA/NR`, Era 4's format) to address-first (`ULICA/MIESZKANIE/RRRR/MM/DD/PROT`).

## Era 13 — Reviewer signatures + draft persistence hardening (2026-07-01 – 2026-07-02)

`e7b8324` — added a second, independent signer role: `reviewerName`/`reviewerLicenseNumber`/`reviewerSignature`, sourced from `UserSettings` (`SettingsScreen` now has two signature panels) and snapshotted onto each `Inspection` alongside the existing technician snapshot, same pattern as Era 4's technician/owner split.

`3e76404` / `c6fb5ff` — fixed a stale-data bug in `MeasurementScreen`'s `sessionStorage` draft mechanism: on browser back/forward navigation (`POP`), the screen was preferring `location.state` (the navigation payload) over the more recently-edited `sessionStorage` draft, so in-progress edits could appear to revert. Fixed by branching on `useNavigationType()` — `POP` prefers the session draft, `PUSH`/`REPLACE` (a fresh "new measurement" action) prefers `location.state`. This is recent and easy to regress if touched carelessly — see `docs/ARCHITECTURE.md`'s Data Flow section for the current, correct behavior.

## Sources

- `docs/ARCHITEKTURA.md` (now `docs/ARCHITECTURE.md`) — dated changelog-style sections through 2026-03-23, extracted into the eras above.
- `docs/archive/REFACTORING_COMPLETED.md`, `REFACTORING_SLICES.md`, `ARCHITECTURE_REFACTORING.md`, `REFACTORING_SUMMARY.md` — Atomic Design + slices + Ghost Data Protection detail (Eras 2–3).
- `docs/archive/CHANGELOG.md`, `CHANGELOG_OFFLINE.md`, `OFFLINE_STRATEGY_IMPLEMENTATION.md`, `OFFLINE_VISUAL_GUIDE.md`, `NAPRAWA_BLEDU_IPHONE.md` — original offline-first fix detail (Era 1).
- `git log --reverse` — dates and commit messages for every era boundary above.
- Remaining archive docs (`FAQ.md`, `CHECKLIST.md`, `DANE_TESTOWE.md`, `INDEX_DOKUMENTACJI.md`, `INSTRUKCJA_TESTOWANIA_OFFLINE.md`, `INSTRUKCJA_URUCHOMIENIA.md`, `KOMENDY.txt`, `PODSUMOWANIE.md`, `READY_TO_TEST.md`, `START_HERE.md`, `SZYBKI_START.md`) were reviewed and found to be setup/onboarding/testing-checklist material without additional architectural decisions beyond what's captured above.
