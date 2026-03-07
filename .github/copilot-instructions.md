# Copilot Instructions

This repository contains a **local-first academic integrity review application**.

## Technology stack

- Vite
- React
- TypeScript
- TailwindCSS
- Yarn

## Architecture

Main application structure:

src/
app/
components/ → reusable UI components
pages/ → application screens
data/ → mock data and fixtures
routes.ts → application routing
types.ts → shared types

styles/ → Tailwind and global styles
main.tsx → application entry point

## Guidelines for Copilot

When generating code:

1. Prefer existing UI components in `src/app/components/ui`.
2. Keep pages inside `src/app/pages`.
3. Do not introduce new frameworks unless necessary.
4. Follow the existing project structure.
5. Prefer small reusable components.
6. Keep code TypeScript-safe.
7. Avoid unnecessary dependencies.

## Future architecture

Planned backend:

Spring Boot API  
MySQL / PostgreSQL  
Dockerized deployment

Frontend will communicate with backend via REST API.