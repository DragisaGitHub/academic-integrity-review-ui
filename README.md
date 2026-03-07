# Academic Integrity Review UI

Academic Integrity Review is a desktop-first web application designed to help university professors review student seminar papers and identify potential academic issues.

The application assists in detecting patterns such as:

- Missing citations
- Suspicious or fabricated references
- Inconsistent writing style
- Factual inconsistencies
- Unsupported claims
- Possible AI-assisted writing indicators

This tool **does not attempt to accuse students of using AI**.  
Instead, it helps professors **prioritize manual review and investigate specific sections of a document**.

The application is designed to run **locally** on a professor's computer.  
No student papers are sent to external cloud services.

---

# Technology Stack

The UI is built with modern frontend technologies:

- React
- TypeScript
- Vite
- Tailwind CSS
- Material UI
- Radix UI components
- Recharts (charts and analytics)
- React Router

This provides a fast development environment and a scalable UI architecture suitable for dashboard-style applications.

---

# Project Structure

```
src
 ├── app
 │   ├── components      # Reusable UI components
 │   ├── data            # Mock/sample data used by the UI
 │   ├── pages           # Application pages (Dashboard, Upload, History, etc.)
 │   ├── App.tsx         # Root layout
 │   ├── routes.ts       # Application routing
 │   └── types.ts        # Shared TypeScript types
 │
 ├── styles              # Global styles
 └── main.tsx            # Application entry point
```

---

# Development Setup

## Requirements

- Node.js 18+
- Yarn (recommended) or npm

---

## Install Dependencies

Using Yarn:

```
yarn
```

Or using npm:

```
npm install
```

---

## Start Development Server

Using Yarn:

```
yarn dev
```

Or using npm:

```
npm run dev
```

The application will start on:

```
http://localhost:5173
```

---

# Build for Production

To create a production build:

```
yarn build
```

or

```
npm run build
```

The compiled files will be generated in the `dist` directory.

---

# Application Screens

The UI currently includes the following screens:

- Dashboard
- Document Upload
- Analysis Results
- Review Notes
- History
- Settings

These screens simulate a workflow where professors can upload seminar papers, review analysis findings, and manage document review history.

---

# Backend Integration (Future)

The UI currently uses **mock data** and is intended to be connected to a backend service in the future.

Typical API endpoints will include:

```
POST   /documents
GET    /analyses
GET    /analyses/{id}
GET    /analyses/{id}/findings
POST   /analyses/{id}/notes
```

The backend will likely be implemented using **Spring Boot** and deployed locally using **Docker**.

---

# Privacy

This application is designed with **academic privacy in mind**.

All document analysis is intended to run **locally**.  
No student papers are transmitted to external services.

---

# License

This project is intended for internal academic use.