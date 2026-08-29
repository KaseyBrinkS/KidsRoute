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
| `/welcome` | Welcome / About |
| `/dashboard` | Dashboard |
| `/my-activities` | Activities |
| `/groups` | Groups |
| `/leader` | Leader |
| `/history` | History |
| `/settings` | Settings (includes My Kids) |
| `/my-kids` | Redirects to `/settings` |

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

## Report email alerts (Resend)

When a user submits a report, the app saves to Firestore and POSTs to `/api/send-report`, a Vercel serverless function that sends an alert to `hello@kidsroute.org` via [Resend](https://resend.com).

1. Sign up at resend.com and create an API key.
2. Add `RESEND_API_KEY` in Vercel → Project Settings → Environment Variables (server-side only).
3. Optionally set `RESEND_FROM_EMAIL` (defaults to `KidsRoute <onboarding@resend.dev>` for testing).
4. Deploy to Vercel — the function lives at `api/send-report.js`.

For local API testing, run `vercel dev` instead of `npm run dev`.
