# Architecture Refactoring Guide

## Overview

The codebase has been refactored following **Atomic Design** principles and clean code practices. This document explains the new structure and how to work with it.

## Directory Structure

```
src/
├── components/
│   ├── atoms/              # Basic building blocks
│   ├── molecules/          # Simple combinations of atoms
│   ├── organisms/          # Complex, page-specific components
│   ├── Dashboard.tsx       # Page component
│   ├── MeasurementScreen.tsx
│   ├── SummaryScreen.tsx
│   ├── NumericKeypad.tsx
│   └── PdfGenerator.tsx
├── services/               # External integrations (Firebase, API)
├── store/                  # State management (Zustand)
├── types/                  # TypeScript type definitions
└── utils/                  # Helper functions and business logic
```

## Atomic Design Structure

### 1. Atoms (`src/components/atoms/`)

**Purpose**: Smallest, reusable UI components that cannot be broken down further.

**Components**:

- `Button` - Reusable button with variants (primary, secondary, danger, success, warning)
- `Badge` - Status badges with color variants
- `Input` - Text input with label and error handling
- `Card` - Container component for content sections
- `Select` - Dropdown selector with label

**Example Usage**:

```tsx
import { Button, Input, Card } from './components/atoms';

<Button variant="primary" size="lg" fullWidth icon={<SaveIcon />}>
  Save
</Button>

<Input label="Address" value={address} onChange={handleChange} />

<Card>
  <h2>Content here</h2>
</Card>
```

### 2. Molecules (`src/components/molecules/`)

**Purpose**: Simple combinations of atoms that form functional units.

**Components**:

- `StatsCard` - Statistics display with icon, label, and value
- `StatusBadge` - Online/offline/pending status indicator
- `MeasurementListItem` - Single measurement display with actions
- `CompactMeasurementListItem` - Compact version for summaries
- `FormField` - Form input wrapper with validation
- `InspectionCard` - Inspection summary card with actions

**Example Usage**:

```tsx
import { StatsCard, StatusBadge } from './components/molecules';

<StatsCard
  icon={<FileText size={18} />}
  label="Total"
  value={count}
  iconColor="text-blue-600"
/>

<StatusBadge
  isOnline={true}
  pendingCount={3}
  onRetrySync={handleRetry}
/>
```

### 3. Organisms (`src/components/organisms/`)

**Purpose**: Complex components combining atoms and molecules for specific functionality.

**Components**:

- `DashboardHeader` - Main navigation header with status
- `DashboardStats` - Statistics overview panel
- `InspectionsList` - List of inspections with actions
- `CreateInspectionModal` - Modal for creating new inspections
- `MeasurementSettings` - Measurement configuration panel
- `SignaturePanel` - Signature capture interface

**Example Usage**:

```tsx
import { DashboardHeader, CreateInspectionModal } from './components/organisms';

<DashboardHeader
  isOnline={isOnline}
  pendingSyncCount={pendingCount}
  isLoading={loading}
  onRefresh={handleRefresh}
  onRetrySync={handleRetry}
/>

<CreateInspectionModal
  isOpen={showModal}
  onClose={handleClose}
  onCreate={handleCreate}
/>
```

## Services Layer (`src/services/`)

**Purpose**: Handle external integrations and API calls.

### `firebaseService.ts`

Manages all Firebase Firestore operations:

- `saveInspectionToFirestore()` - Save inspection data
- `loadInspectionsFromFirestore()` - Load all inspections
- `deleteInspectionFromFirestore()` - Delete inspection
- `retrySyncInspection()` - Retry failed sync

**Example**:

```tsx
import { saveInspectionToFirestore } from '../services'

await saveInspectionToFirestore(inspection, inspectionId)
```

## Utilities (`src/utils/`)

**Purpose**: Business logic, calculations, and helper functions.

### `idGenerator.ts`

- `generateInspectionId()` - Create unique inspection ID
- `generateMeasurementId()` - Create unique measurement ID

### `measurementCalculations.ts`

- `calculateZsDop()` - Calculate allowable Zs value
- `determineMeasurementResult()` - Determine TAK/NIE/B.UZ result
- `createMeasurement()` - Factory function for measurements
- `renumberMeasurements()` - Renumber after deletion
- `countMeasurementsByResult()` - Statistics calculation

### `validators.ts`

- `isNotEmpty()` - String validation
- `validateInspectionForm()` - Form validation
- `validateMeasurementValue()` - Measurement input validation

**Example**:

```tsx
import { validateMeasurementValue, createMeasurement } from '../utils'

const validation = validateMeasurementValue(inputValue)
if (!validation.isValid) {
  alert(validation.error)
  return
}

const measurement = createMeasurement(
  id,
  pointNumber,
  type,
  amperage,
  k,
  zsValue
)
```

## State Management (`src/store/`)

The store has been refactored to use services and utilities, making it cleaner and more maintainable.

**Key improvements**:

- Separated Firebase operations into services
- Extracted business logic into utilities
- Clear separation of concerns
- Better error handling
- Improved testability

## Benefits of This Architecture

### 1. **Reusability**

- Atoms and molecules can be used across different pages
- Consistent UI/UX throughout the application

### 2. **Maintainability**

- Each component has a single responsibility
- Easy to locate and fix bugs
- Clear file organization

### 3. **Testability**

- Small, focused units are easier to test
- Business logic separated from UI
- Services can be mocked easily

### 4. **Scalability**

- New features can reuse existing components
- Easy to add new atoms/molecules/organisms
- Clear patterns to follow

### 5. **Code Quality**

- Reduced duplication
- Better type safety
- Consistent naming conventions
- Clear dependencies

## Code Metrics Improvement

| Component         | Before    | After     | Reduction |
| ----------------- | --------- | --------- | --------- |
| Dashboard         | 296 lines | 64 lines  | **78%**   |
| MeasurementScreen | 254 lines | 134 lines | **47%**   |
| SummaryScreen     | 206 lines | 116 lines | **44%**   |
| Store             | 419 lines | 245 lines | **42%**   |

## Best Practices

### When to Create a New Component

**Create an Atom when**:

- You have a basic UI element used in multiple places
- The component has no business logic
- It's a wrapper around HTML elements with styling

**Create a Molecule when**:

- You combine 2-3 atoms repeatedly
- The component has simple, focused functionality
- It can be reused in different contexts

**Create an Organism when**:

- The component is complex and page-specific
- It combines multiple molecules and atoms
- It contains business logic or state management

### Naming Conventions

- **Components**: PascalCase (e.g., `Button`, `StatsCard`)
- **Files**: Match component name (e.g., `Button.tsx`)
- **Utils/Services**: camelCase functions (e.g., `validateForm`)
- **Props interfaces**: `ComponentNameProps`

### Import Organization

```tsx
// 1. External libraries
import React from 'react'
import { useNavigate } from 'react-router-dom'

// 2. Components (atoms → molecules → organisms)
import { Button, Card } from './atoms'
import { StatsCard } from './molecules'
import { DashboardHeader } from './organisms'

// 3. Services and utilities
import { saveInspection } from '../services'
import { validateForm } from '../utils'

// 4. Types
import type { Inspection } from '../types'

// 5. Styles (if any)
import './styles.css'
```

## Migration Guide

If you need to add new features:

1. **Check existing atoms/molecules** - Can you reuse them?
2. **Create new atoms** if you need new basic UI elements
3. **Combine into molecules** if the pattern repeats
4. **Build organisms** for page-specific functionality
5. **Extract business logic** into utils
6. **Handle external calls** in services
7. **Update store** if state management is needed

## Future Improvements

- [ ] Add Storybook for component documentation
- [ ] Implement unit tests for atoms and molecules
- [ ] Add integration tests for organisms
- [ ] Create more utility functions for common operations
- [ ] Consider adding a hooks directory for custom hooks
- [ ] Add error boundary components
- [ ] Implement loading states consistently

## Questions?

If you have questions about this architecture or need help implementing new features, refer to this document or review the existing code examples.
