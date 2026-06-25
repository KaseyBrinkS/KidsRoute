# KidsRoute

A neighborhood app that helps parents at elementary schools coordinate groups of kids walking together to after-school activities.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Screens

| Route | Screen |
|---|---|
| `/login` | Login |
| `/dashboard` | Dashboard |
| `/my-kids` | My Kids |
| `/my-activities` | My Activities |
| `/groups` | Groups |
| `/leader` | My Groups |
| `/groups/:groupId/leader` | Manage Group |
| `/settings` | Settings |

All routes are currently open (no auth guards). The Login screen's "Sign in" button navigates to the Dashboard as a placeholder.

## Connecting Firebase

Firebase is installed but not initialized yet.

1. Copy `.env.example` to `.env` and fill in your Firebase project credentials.
2. In `src/firebase/config.js`, uncomment the `initializeApp` import and call.

## Project structure

```
src/
├── components/     # Shared UI (AppLayout, PageHeader)
├── firebase/       # Firebase config (placeholder)
├── pages/          # One file per screen
├── App.jsx         # Route definitions
└── main.jsx        # App entry point
```

Build each screen in `src/pages/` one at a time as you go.
