# Store Slices

Ten folder zawiera moduły zarządzające stanem aplikacji zgodnie z wzorcem **Slices Pattern**.

## 📦 Slice'y

### authSlice.ts
Zarządza stanem autoryzacji (user).

### projectSlice.ts
Zarządza projektami (projects, currentProjectId).

### inspectionSlice.ts
Zarządza przeglądami i pomiarami (inspections, currentInspection, measurements).

### offlineSlice.ts
Zarządza statusem połączenia i domyślnymi ustawieniami pomiarów.

## 🔧 Użycie

Nie importuj slice'ów bezpośrednio. Używaj głównego store'a:

```typescript
import { useAppStore } from '../store/useAppStore'

function MyComponent() {
  const { user, projects, inspections } = useAppStore()
  // ...
}
```

## 📚 Więcej informacji

Zobacz `docs/REFACTORING_SLICES.md` dla szczegółów refaktoryzacji.
