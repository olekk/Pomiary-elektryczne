# CLAUDE.md

Guidance for Claude Code sessions working on **Pomiary Elektryczne**. This file is intentionally concise — it states project-specific rules, invariants, and pitfalls that aren't derivable from reading the code. For implementation detail, data model, hook APIs, and the full component inventory, see **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)** — this file points there rather than duplicating it. For *why* things are the way they are, see [`docs/archive/ARCHITECTURE_HISTORY.md`](docs/archive/ARCHITECTURE_HISTORY.md).

## Project Overview

An offline-first PWA for Polish electricians to record electrical safety measurements (Zs loop impedance) in the field, sign, and generate PDF inspection protocols — with no reliable internet connectivity assumed. Every architectural decision here (Firestore-as-store, fire-and-forget writes, sessionStorage drafts, iOS Safari workarounds) exists to protect that one offline workflow. When evaluating a change, ask whether it strengthens or risks that path first.

UI copy, PDF output, and domain vocabulary (WNP, BI, Zs, Zs_dop, klatka, protocol number format) are Polish and should stay Polish — this is a Polish-market field tool, not an i18n product.

## Core Invariants

These are non-negotiable unless the user explicitly asks to change them — each exists because of a real, previously-shipped bug (full stories in `docs/archive/ARCHITECTURE_HISTORY.md`):

- **No global client-side store.** Firestore's own cache *is* the state layer, via `onSnapshot` hooks (`useCollection`/`useDocument`) + React Context (`useAuth`) + local `useState`. A Zustand store was tried twice and removed both times after causing ghost-data and stale-cache bugs. Don't reintroduce one — if something seems to need "global state," ask first whether it should be a Firestore document instead.
- **Never `await` a Firestore write inside a UI event handler.** Every write is `saveXToFirestore(...).then(...).catch(logger.error)`, followed immediately by a local state update / navigation / modal close. This is the single most load-bearing convention in the codebase.
- **IDs are generated client-side** (`generateInspectionId()` etc.) so writes resolve against the local cache instantly, with no server round-trip required.
- **Don't gate sync logic on `navigator.onLine`** or call `enableNetwork()`/`disableNetwork()` manually — the Firebase SDK manages its own connectivity. `useOnlineStatus()` is a UI hint and retry trigger only.
- **`recoverFirestore()`** (`src/firebase.ts`) must be called after any feature that does heavy/sustained `fetch()` or blob work (PDF generation already does this) — it works around a real iOS Safari bug where such activity kills Firestore's WebChannel and hangs all reads.
- **Any new Firestore-subscribing hook needs a safety timeout**, matching `useCollection`/`useDocument`/`useAuth` (force loading-false after 3–5s) — mitigates a known iOS Safari stuck-state bug.
- **Firestore rejects `undefined` field values.** Any optional field written to a document needs an explicit guard (see `noGrounding` handling in `saveInspectionToFirestore`) or a `|| ''`/`|| false` default — never spread a domain object straight into `setDoc`/`addDoc`.

## State Management (summary)

| Layer | Used for |
| --- | --- |
| Firestore `onSnapshot` | Everything persisted (projects, buildings, inspections, user settings) |
| React Context | Auth session (`useAuth`) |
| `useState` | In-progress, not-yet-saved forms |
| `sessionStorage` + `location.state` | Survive navigation without a Firestore round-trip |

Full hook signatures and behavior: `docs/ARCHITECTURE.md` §6.

## Coding Standards

- **No semicolons, single quotes** — enforced by Prettier (`.prettierrc`). Run `npm run format` before committing non-trivial changes.
- Use `cn()` (`utils/cn.ts`, `clsx` + `tailwind-merge`) for conditional/merged Tailwind classes on new code. (Existing code is inconsistent here — raw template literals are common; don't drive-by "fix" untouched files.)
- `any` is not used anywhere in `src/` — keep it that way. Use explicit types, `unknown` + narrowing, or generics.
- Firebase calls belong only in `services/firebaseService.ts` (writes/deletes) or `hooks/` (reads, via `onSnapshot`). Don't call `setDoc`/`getDocs`/etc. directly from a component. (Two simple `addDoc()` calls for building creation are the accepted exception — see `docs/ARCHITECTURE.md` §3.)
- Domain types live only in `src/types/index.ts` — add fields there first, then thread through mappers/services/UI.
- Dark mode only: `bg-slate-950`/`900`/`800` backgrounds, no `bg-white`/`bg-gray-100` anywhere. Use the `Button` atom's `variant` prop instead of hand-rolled button colors. Full palette: `docs/ARCHITECTURE.md` §11.

## Reuse Before Building

Check these before writing something new — most of what you need already exists:

- `atoms/Button`, `Input`, `Select`, `Card`, `Badge`, `ActionMenu` (kebab menu with keyboard nav), `Fab` (floating "+" button)
- `molecules/DataSourceChip` — the cache-freshness indicator ("Dane lokalne" / "Aktualne"); feed it `fromCache` from `useCollection`/`useDocument`.
- `utils/firestoreMappers.ts` — the only Firestore document→domain mappers (`inspectionFromDoc`, `buildingFromSnapshot`, etc.). Never define a per-screen mapper.
- `organisms/SignaturePanel` — already generic, used identically for technician, reviewer, and owner signatures. Don't fork it.
- `utils/generateInspectionPdf()` — the only PDF trigger. It was duplicated once and centralized after; don't reintroduce a second copy of the `pdf(...).toBlob()` + download logic.
- `utils/showToast()` — imperative, DOM-based, for background/async status shown outside a component tree (e.g. from a plain utility function). Use `alert()` (existing pattern) for blocking validation/error messages instead of a new toast/snackbar system.

Full component inventory: `docs/ARCHITECTURE.md` §12.

## Testing Expectations

- `src/utils/**` has a **90% statement coverage threshold enforced** by `vitest.config.ts` — new pure utility functions need tests.
- Integration tests (`src/services/__tests__/*.integration.test.ts`) run against a real Firebase Emulator, not mocks — keep it that way; emulator-vs-mock divergence is exactly what this suite exists to catch.
- There is currently **no established pattern for component/hook/screen tests** — don't invent a heavy new testing setup for a screen change unless asked; this is a known, accepted gap (see `docs/ARCHITECTURE.md` §16), not something to silently fix mid-task.
- Before considering a change done: `npm run lint`, `npm test` (if you touched `utils/`/`services/`), and `npm run build` (`tsc -b && vite build` — this is the only type-check step, there's no separate CI gate for it).

## Documentation Rules

- `docs/ARCHITECTURE.md` is the canonical technical reference — keep it **current-state only, no changelog**. When you make a significant change (data model field, offline/sync strategy, auth flow, a new hook pattern), update the relevant section there as part of the same change, not as a follow-up.
- Historical rationale (why something changed, what it replaced) goes in `docs/archive/ARCHITECTURE_HISTORY.md`, not in `ARCHITECTURE.md`. If you make an architecturally significant change (especially one that reverses or replaces an existing pattern), add a dated entry there too.
- `docs/archive/` is historical record only — never treat anything in it as describing current behavior. Don't resurrect patterns documented there (a global store, three-state results, `enableNetwork()` calls) without an explicit decision to do so.
- `FIRESTORE_RULES.txt` and `README.md` (repo root) are known stale (see `docs/ARCHITECTURE.md` §16) — don't treat them as authoritative, and don't "fix" them as a drive-by inside an unrelated task.

## Workflow

- `npm run dev` — Vite dev server, port 3000.
- `npm run build` — `tsc -b && vite build`.
- `npm run lint` / `npm run format` — ESLint / Prettier.
- `npm test` / `npm run test:watch` / `npm run test:coverage` — Vitest unit tests.
- `npm run test:integration` — requires `firebase emulators:start --only firestore` running first (or `npm run test:emulator` to run both in one step).
- `npm run test:mutation` — Stryker; slow, run deliberately, not as part of a normal edit loop.
- Firebase Hosting deploy is automated via `.github/workflows/firebase-hosting-*.yml` on merge/PR — these do **not** run tests/lint as a gate, so don't rely on CI to catch a regression.

## Refactoring Principles

- This codebase already went through one major architectural reversal (global store → Firestore-as-store) after the first approach caused production bugs. Take that as a strong signal to prefer the grain of the current architecture over a parallel one, even where it has rough edges (duplicated Firestore mappers, inconsistent `cn()` usage, light-mode `Badge` colors — see `docs/ARCHITECTURE.md` §16).
- Leave code you touch cleaner than you found it, but keep the diff scoped to the task. An unrelated task is not cover for a drive-by rewrite of a duplicated mapper or the `Badge` component — propose that separately instead.
- If a change would alter the Firestore schema, the offline-sync contract, or the auth flow, explain the tradeoff before implementing — these are exactly the areas with a documented history of causing real bugs.

## Things To Avoid

- A global client-side store (Zustand, Redux, Jotai, Context-as-store) in front of Firestore.
- `await`ing a Firestore write before updating local state or navigating.
- Manual `enableNetwork()`/`disableNetwork()` calls or `navigator.onLine`-gated sync logic.
- Spreading a full domain object into `setDoc`/`addDoc` instead of building the payload explicitly.
- Re-implementing PDF generation or toast notifications inline instead of using the existing utilities.
- "Fixing" `FIRESTORE_RULES.txt` without first checking what's actually deployed in the Firebase Console — the tracked file may not match production.
- Trusting any `docs/*.md` claim without a quick cross-check against source — even the current docs have drifted before (that's why this restructuring happened).

## Common Pitfalls

- **Stale drafts on browser back**: `MeasurementScreen` branches on `useNavigationType()` — `POP` prefers the `sessionStorage` draft, `PUSH`/`REPLACE` prefers `location.state`. Preserve this exactly if you touch that screen; it's the fix for a real regression.
- **Firestore document mappers live only in `utils/firestoreMappers.ts`** (they used to be duplicated per screen with diverging field coverage — that's fixed). Adding a field to `Inspection`/`Building`/`Project`? Update the shared mapper + its unit tests + the write payload in `firebaseService.ts`; don't define a local mapper in a screen or hook.
- **iOS Safari + heavy fetch**: anything doing sustained `fetch()`/blob work can kill Firestore's WebChannel on iOS Safari. Call `recoverFirestore()` afterward, same as `generateInspectionPdf()` does.
- **`onSnapshot` never firing**: always pair a new subscription hook with a safety timeout (see Core Invariants) — otherwise a stuck iOS Safari session hangs the UI forever.

## Agent Instructions

- **Inspect before editing.** Read the actual current implementation of anything you're about to change — source is ground truth over any doc, including this one and `docs/ARCHITECTURE.md`.
- **Prefer existing components and hooks.** Check `atoms/`, `molecules/`, and `hooks/` before writing new UI or a new Firestore subscription pattern.
- **Avoid duplicate abstractions.** Don't add a second toast system, modal primitive, PDF trigger, or state-management mechanism alongside the existing ones.
- **Minimize technical debt** — but distinguish "clean up what I'm touching" from "clean up everything I notice." The latter is a proposal to the user, not a silent scope expansion.
- **Explain tradeoffs before architecture changes.** Anything touching the Firestore schema, offline/sync contract, auth, or state-management approach gets a short explanation of what changes and why before you implement it.
- **Produce an implementation plan before major work** — anything spanning multiple screens/hooks/services (a new field flowing through create→edit→PDF→summary, a new inspection type, a new sync behavior).
- **Update documentation when architecture changes** — `docs/ARCHITECTURE.md` for current-state changes, `docs/archive/ARCHITECTURE_HISTORY.md` for a dated rationale entry, as part of the same change.
- **Keep changes offline-safe by construction.** Any new feature that writes data must work with no network: client-generated IDs, fire-and-forget writes, never block a user-visible action on a Firestore round-trip.
