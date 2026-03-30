# Trading Journal Architecture

This project follows a practical layered architecture with feature-oriented frontend boundaries and service-oriented backend boundaries.

## Architecture Style

### Frontend
- `app/`: application composition, routing, and layout
- `features/`: user-facing business capabilities such as auth
- `components/`: view components that still belong to the current product surface
- `utils/`: shared infrastructure utilities used across features

### Backend
- `routes/`: thin HTTP entry points
- `services/`: business rules and use-case orchestration
- `models/`: persistence schema definitions
- `middleware/`: request policies such as auth and trial checks
- `config/`: environment and infrastructure setup
- `utils/`: low-level helpers reused by multiple services

## SOLID Principles Applied

### S: Single Responsibility Principle
- `frontend/src/App.tsx` now only composes providers and top-level routing
- Auth session state moved into `frontend/src/features/auth/hooks/useAuthSession.ts`
- Layout rendering moved into `frontend/src/app/layout/AppShell.tsx`
- Route guarding moved into `frontend/src/app/router/ProtectedRoute.tsx`
- Backend auth redirect resolution, account persistence, auth response creation, journal persistence, and AI parsing were separated into focused services

### O: Open/Closed Principle
- New auth behavior can be added by extending auth services without rewriting route handlers
- New routes can reuse shared services without modifying existing consumers
- Frontend routing can grow by extending `AppRoutes` without bloating the shell

### L: Liskov Substitution Principle
- Shared route protection and auth-session contracts keep pages interchangeable as long as they satisfy the same user/session expectations
- Backend services return plain data structures that route handlers can consume consistently

### I: Interface Segregation Principle
- Components receive only the props they need
- Backend routes depend on small service functions such as `createJournalEntry`, `buildAuthToken`, and `getFrontendUrl` instead of one large utility module

### D: Dependency Inversion Principle
- Route handlers depend on service abstractions rather than embedding business rules
- The frontend app shell depends on the `useAuthSession` hook and route components rather than owning storage and session implementation details directly

## Current Folder Map

```text
frontend/src
├── app
│   ├── layout
│   └── router
├── components
├── features
│   └── auth
└── utils

backend
├── config
├── middleware
├── models
├── routes
├── services
│   ├── ai
│   ├── auth
│   └── journal
└── utils
```

## Design Decisions

### Frontend
- Keep page composition in `app`
- Keep user/session concerns in `features/auth`
- Keep reusable infrastructure concerns in `utils`
- Move complex UI wiring out of `App.tsx` so pages stay easier to test and extend

### Backend
- Keep routes thin and focused on HTTP concerns
- Move business rules into services
- Keep models persistence-focused
- Keep middleware independent from domain services

## Why This Structure

- Easier to change one behavior without touching unrelated code
- Lower risk of regressions from mixed responsibilities
- Clearer ownership boundaries for future features
- Better onboarding for new contributors because entry points and business logic are separated

## Refactor Outcomes

- Frontend shell, route protection, and auth-session state are separated
- Backend journal, auth, and AI behavior are extracted into dedicated services
- PnL normalization and auth redirect rules are centralized instead of duplicated

## Next Recommended Steps

1. Move dashboard data loading into a dedicated frontend feature hook/service.
2. Create backend controllers so route files become pure wiring.
3. Add unit tests for service modules, especially auth, AI parsing, and PnL normalization.
4. Introduce shared TypeScript domain models for journal and auth payloads on the frontend.
