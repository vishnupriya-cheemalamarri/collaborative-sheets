# Collaborative Sheets

A production-grade real-time collaborative spreadsheet application built with Next.js 14, Firebase, and TypeScript.

🔗 [Live Demo](https://collaborative-sheets.vercel.app) &nbsp;·&nbsp; [GitHub](https://github.com/vishnupriya-cheemalamarri/collaborative-sheets)

---

## Features

- **Real-time collaboration** — Multiple users edit simultaneously with live cursors and presence indicators
- **Formula engine** — Hand-written recursive descent parser supporting SUM, AVERAGE, MIN, MAX, COUNT and arithmetic with correct operator precedence
- **Authentication** — Google OAuth and guest access via Firebase Auth
- **Cell formatting** — Bold, italic, text color, background color per cell
- **Live activity feed** — See who joined and what they edited in real time
- **CSV export** — Download any sheet as a CSV file
- **Keyboard navigation** — Full arrow key, Tab, Enter, Delete support
- **Auto-save** — Changes debounced and synced to Firebase with visual save indicator
- **Soft delete + restore** — Deleted sheets are moved to a separate node and are fully recoverable
- **Dark / light mode** — Theme toggle across all pages

---

## Tech Stack

| Layer       | Technology                     |
|-------------|--------------------------------|
| Framework   | Next.js 14 (App Router)        |
| Language    | TypeScript                     |
| Database    | Firebase Realtime Database     |
| Auth        | Firebase Authentication        |
| State       | Zustand + Immer                |
| Styling     | Tailwind CSS                   |
| Animations  | Framer Motion                  |
| Deployment  | Vercel                         |

---

## Architecture

```
src/
├── app/                  # Next.js App Router pages
│   ├── dashboard/        # Document list page
│   ├── sheet/[id]/       # Spreadsheet editor page
│   └── login/            # Authentication page
├── components/
│   ├── auth/             # AuthGuard
│   ├── errors/           # ErrorBoundary, SheetErrorBoundary
│   └── sheet/            # Grid, Cell, FormulaBar, FormattingToolbar
├── hooks/
│   ├── useSheet.ts       # Firebase cell sync + debounced writes
│   └── usePresence.ts    # Live user presence
├── lib/
│   ├── firebase/         # Auth, database, cells, presence, documents
│   ├── formula/          # Recursive descent parser + evaluator
│   └── utils/            # Cell address, CSV export, color, logger
├── store/
│   └── sheetStore.ts     # Zustand global state
└── types/                # TypeScript interfaces
```

---

## Key Technical Decisions

**Formula Engine**

Instead of using `eval()` or `new Function()` — both XSS risks — the formula engine is a hand-written recursive descent parser. It tokenises the expression into typed tokens (NUMBER, CELL, RANGE, FUNC, OP) and evaluates it safely without executing arbitrary JavaScript. Supports cell references, ranges (A1:B3), nested functions, and correct operator precedence (`*` before `+`).

**Real-time Sync**

Firebase Realtime Database `onChildAdded` and `onChildChanged` listeners are used instead of `onValue` to avoid re-reading the entire cells object on every keystroke. Each listener is registered with a distinct function reference so `off()` can detach them independently. Cell writes are debounced to reduce Firebase write costs. All debounce timers are cleared on unmount to prevent stale writes.

**Presence System**

Each user writes their uid, display name, color, and active cell to `presence/{docId}/{uid}`. A heartbeat refreshes `lastSeen` every 30 seconds. Users not seen within 60 seconds are treated as stale and filtered out of the UI. `onDisconnect().remove()` handles ungraceful disconnects such as tab closes or network drops.

**State Management**

Zustand with Immer is used for the sheet store. All Firebase listener callbacks write into the store, and React components subscribe only to the slices they need — preventing unnecessary re-renders across the full cell grid.

**Security**

- Firebase Security Rules restrict all reads and writes to authenticated users only
- Deleted documents are moved to a separate `deleted_documents` node so the active documents query never scans deleted data
- All rules are version-controlled in `database.rules.json`

**Error Handling**

Class-based React Error Boundaries wrap both the root app and the sheet grid independently. A custom `logger` utility suppresses all console output in production while preserving full error details in development.

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project with Realtime Database and Authentication enabled

### Setup

1. Clone the repository
   ```bash
   git clone https://github.com/vishnupriya-cheemalamarri/collaborative-sheets.git
   cd collaborative-sheets
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Configure environment variables
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Firebase config values in `.env.local`

4. Enable Firebase services
   - **Authentication** → enable Google provider and Anonymous provider
   - **Realtime Database** → create a database in your preferred region

5. Deploy Firebase rules
   ```bash
   firebase deploy --only database
   ```

6. Run the development server
   ```bash
   npm run dev
   ```

---

## Environment Variables

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

---

## Firebase Rules

```json
{
  "rules": {
    "documents": {
      ".read": "auth != null",
      ".write": "auth != null",
      ".indexOn": ["ownerId"]
    },
    "deleted_documents": {
      ".read": "auth != null",
      ".write": "auth != null",
      ".indexOn": ["ownerId"]
    },
    "cells": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "presence": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

---

## Deployment

The app is deployed on Vercel. To deploy your own instance:

1. Push your repository to GitHub
2. Import the project at [vercel.com](https://vercel.com)
3. Add all environment variables from `.env.example`
4. Deploy

---

## Demo

> Open [https://collaborative-sheets.vercel.app](https://collaborative-sheets.vercel.app) in two browser tabs on the same document to see real-time collaboration in action.