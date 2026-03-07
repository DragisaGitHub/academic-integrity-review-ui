# Copilot Instructions

This repository contains a **local-first Academic Integrity Review application**.

The application allows users to upload academic documents, analyze them, and review findings through a structured workflow.

The frontend is currently built as a standalone UI using mock data.  
In the future it will integrate with a backend API.

---

# Technology Stack

Frontend stack used in this repository:

- Vite
- React
- TypeScript
- TailwindCSS
- Yarn

UI components are implemented using reusable component patterns inside the `components/ui` directory.

---

# Project Architecture

Main application structure:

```
src/
 ├─ app/
 │   ├─ components/
 │   │   ├─ dashboard/
 │   │   ├─ layout/
 │   │   └─ ui/
 │   │
 │   ├─ pages/
 │   │   Dashboard.tsx
 │   │   Upload.tsx
 │   │   Analyses.tsx
 │   │   Analysis.tsx
 │   │   ReviewNotes.tsx
 │   │   History.tsx
 │   │   Settings.tsx
 │   │
 │   ├─ data/
 │   │   mockData.ts
 │   │
 │   ├─ routes.ts
 │   └─ types.ts
 │
 ├─ styles/
 │   fonts.css
 │   tailwind.css
 │   theme.css
 │
 └─ main.tsx
```

---

# Application Entry Points

Important files that define application behavior:

| File | Purpose |
|-----|------|
| `src/main.tsx` | React application entry point |
| `src/app/App.tsx` | Root application component |
| `src/app/routes.ts` | Application routing configuration |
| `src/app/pages/` | Page-level UI components |
| `src/app/components/` | Reusable UI components |
| `src/app/data/mockData.ts` | Temporary data source |
| `src/app/types.ts` | Shared TypeScript types |

---

# UI Architecture

Guidelines for UI development:

- Reusable components belong in `src/app/components`
- Base UI primitives are located in `src/app/components/ui`
- Page-level components belong in `src/app/pages`
- Layout components belong in `src/app/components/layout`
- Avoid large monolithic page components

Prefer composition over duplication.

---

# Data Handling

The application currently uses **mock data** located in:

```
src/app/data/mockData.ts
```

Important rules:

- Mock data should **not be tightly coupled to UI components**
- Future backend integration should replace mock data via a **service/API layer**
- Avoid embedding business logic inside UI components

---

# Code Generation Guidelines for Copilot

When generating or modifying code:

1. Prefer existing UI components from `src/app/components/ui`.
2. Follow the existing project folder structure.
3. Keep components small and reusable.
4. Use TypeScript types from `src/app/types.ts`.
5. Avoid introducing unnecessary dependencies.
6. Do not introduce new frameworks unless clearly required.
7. Keep styling consistent with TailwindCSS.

---

# Future Backend Architecture

The frontend will eventually integrate with a backend API.

Expected backend stack:

- Spring Boot
- REST API
- MySQL or PostgreSQL
- Dockerized deployment

Future API responsibilities may include:

- document upload
- document analysis
- findings retrieval
- review notes management
- history tracking
- application settings

---

# Copilot Agents

This repository includes specialized Copilot agents to assist development:

```
.github/agents/
```

Agents included:

- `discovery.agent.md` → analyzes repository structure
- `architecture-review.agent.md` → evaluates frontend architecture
- `backend-integration.agent.md` → prepares the project for API integration

These agents help Copilot understand the project before suggesting changes.

---

# General Development Philosophy

This project prioritizes:

- clarity of architecture
- maintainable component structure
- incremental improvements
- minimal dependencies
- preparation for backend integration

Avoid unnecessary complexity or premature abstraction.