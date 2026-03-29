# Frontend Developer README

## Overview

This is the React + TypeScript frontend for the Trading Journal app.

- Build tool: Vite
- UI library: React 19
- Language: TypeScript
- Routing: `react-router-dom`
- Drag-and-drop: `react-dnd` + `@hello-pangea/dnd`
- Charts: `chart.js` + `react-chartjs-2`

## Prerequisites

- Node.js 20+
- npm 10+

## Setup

```bash
cd frontend
npm install
```

## Environment Variables

Create `frontend/.env`:

```bash
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

Notes:

- `VITE_GOOGLE_CLIENT_ID` is used in `src/main.tsx` by `GoogleOAuthProvider`.
- The API base URL is currently hardcoded as `http://localhost:5000` in component files (`Dashboard.tsx`, `JournalCard.tsx`, `AIJournalChatbot.tsx`, `Login.tsx`).

## Run Locally

```bash
cd frontend
npm run dev
```

Default dev URL: `http://localhost:5173`

## Build and Preview

```bash
cd frontend
npm run build
npm run preview
```

## Lint

```bash
cd frontend
npm run lint
```

## Key Paths

- `src/components/JournalForm.tsx`: Create trade journal entries
- `src/components/Dashboard.tsx`: Dashboard and journal listing
- `src/components/AIJournalChatbot.tsx`: AI-assisted journal flow
- `src/components/Login.tsx`: Social login UI logic
- `src/App.tsx`: Main app routes

## Integration Notes

- Frontend expects backend at `http://localhost:5000`.
- Journal APIs used by frontend:
  - `GET /api/journal`
  - `POST /api/journal`
- Auth calls exist in the frontend (`/api/auth/google`, `/api/auth/github`) and require backend auth routes to be mounted.
