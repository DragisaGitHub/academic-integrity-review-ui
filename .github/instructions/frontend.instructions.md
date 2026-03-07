# Frontend Instructions

These instructions apply to frontend code generation in this repository.

The project is a **local-first Academic Integrity Review application** built with:

- Vite
- React
- TypeScript
- TailwindCSS
- Yarn

The UI is already scaffolded and should be extended incrementally without unnecessary rewrites.

---

# Frontend Goals

When generating frontend code, prioritize:

- maintainability
- readability
- small reusable components
- consistent TypeScript usage
- minimal dependencies
- preservation of the current UI and navigation flow

This is a desktop-first professional application, not a playful consumer product.

---

# Project Structure Rules

Use the existing structure consistently:

```text
src/
 ├─ app/
 │   ├─ components/
 │   │   ├─ dashboard/
 │   │   ├─ layout/
 │   │   └─ ui/
 │   ├─ pages/
 │   ├─ data/
 │   ├─ routes.ts
 │   └─ types.ts
 ├─ styles/
 └─ main.tsx
```

Rules:

- Put reusable components in `src/app/components`
- Put page-level components in `src/app/pages`
- Put layout-related components in `src/app/components/layout`
- Reuse primitives from `src/app/components/ui`
- Keep shared types in `src/app/types.ts` or a nearby feature-specific type file if justified
- Do not create a new folder structure unless there is a strong reason

---

# Component Guidelines

When creating components:

- Prefer functional React components
- Use TypeScript interfaces or types for props
- Keep components focused on one responsibility
- Avoid oversized files when logic can be extracted safely
- Prefer composition over duplication
- Reuse existing UI components before creating new ones

Preferred style:

- small presentational components
- clear prop names
- predictable rendering
- minimal inline complexity

Avoid:

- deeply nested JSX without extraction
- duplicated markup across pages
- mixing unrelated concerns in one component

---

# Styling Guidelines

Use the existing styling approach.

Preferred order of styling decisions:

1. Reuse existing UI primitives from `src/app/components/ui`
2. Use existing Tailwind utility patterns
3. Keep styling consistent with the current dashboard aesthetic

Rules:

- Do not introduce a new styling framework
- Do not mix multiple styling paradigms unnecessarily
- Avoid inconsistent spacing, typography, or color usage
- Keep the enterprise/professional visual tone

---

# Data and State Guidelines

The application currently uses mock data from:

```text
src/app/data/mockData.ts
```

Rules:

- Do not hardcode business data directly into page components unless explicitly requested
- Prefer separating data shaping from rendering
- Prepare components for future API-backed data
- Avoid coupling mock data structures too tightly to visual components

When possible, keep UI components ready for future replacement of mock data with backend responses.

---

# Routing Guidelines

Routing is defined in:

```text
src/app/routes.ts
```

Rules:

- Keep route definitions centralized
- Do not introduce ad hoc routing patterns
- Preserve existing page navigation unless explicitly asked to change it
- Keep route-related components aligned with current page names and flow

---

# TypeScript Guidelines

Always prefer TypeScript-safe code.

Rules:

- Type props explicitly
- Avoid `any`
- Reuse shared types where possible
- Add new types only when they improve clarity
- Keep types readable and pragmatic
- Prefer narrow, meaningful types over broad weak typing

---

# Backend Readiness

This frontend will later integrate with a local backend, likely using:

- Spring Boot
- REST API
- MySQL
- Docker

When generating frontend code, keep future backend integration in mind.

Preferred direction for future data access:

- API layer
- services
- hooks

But do not introduce these layers prematurely unless they are needed for the requested task.

---

# Modification Guidelines

When modifying code:

- preserve existing behavior unless change is explicitly requested
- avoid unnecessary rewrites
- prefer incremental changes
- explain architectural impact when a change affects multiple files
- keep changes localized and easy to review

---

# UX Guidelines

This application is used by a university professor to review academic documents.

The tone and UX should remain:

- professional
- trustworthy
- structured
- desktop-first
- information-dense but readable

Avoid:

- playful UI patterns
- flashy visual effects
- unnecessary animations
- mobile-first simplifications that reduce desktop usability

---

# Preferred Output Style

When suggesting code changes:

- explain where the code belongs
- keep naming consistent with the project
- prefer practical and incremental implementation
- avoid introducing unnecessary abstractions
- respect the existing architecture