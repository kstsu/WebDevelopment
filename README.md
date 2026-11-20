# Inventory Management System (Frontend)

A lightweight inventory management system for small & medium businesses, built with **Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui**.

> Phase 1 scope: **Frontend only**. All data lives in the browser (localStorage via Zustand), pre-loaded with realistic seed data. Backend/database integration comes in Phase 2.

## Features

- **Dashboard** — stock overview, low-stock alerts, inventory value summary
- **Products** — full CRUD: add / edit / delete products, search & filter
- **Categories** — organize products into categories (CRUD)
- **Suppliers** — manage supplier contacts (CRUD)
- **Stock movements** — stock in / stock out / stock adjust, with a movement history log
- **Theme** — light / dark mode toggle

## Requirements

To run the website locally, you need:

- **Node.js 20 or newer** — download it from [nodejs.org](https://nodejs.org/)
- **npm** — included with Node.js
- A modern web browser such as Chrome, Edge, Firefox, or Safari
- The project folder extracted from `inventory-system-frontend.zip`
- Internet access for the first `npm install`, so npm can download the dependencies

Python is **not required** to run this app. The browser UI can fall back to localStorage, but the API routes persist data directly to MongoDB using the official MongoDB driver — no Prisma or SQLite involved.

Check that Node.js and npm are installed:

```powershell
node --version
npm --version
```

## Quick start on Windows

Open PowerShell in the project folder, then run:

```powershell
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The development server logs appear in the terminal. Press `Ctrl+C` in PowerShell to stop it.

### MongoDB setup (local, recommended for development)

The API uses the official `mongodb` driver directly (no Prisma, ORM, or SQLite). Collections and indexes are created automatically on the first API request.

This project is configured for a local single-node replica set at `mongodb://127.0.0.1:27018/inventory?replicaSet=rs0&retryWrites=true&w=majority` (see `.env`). To start the database after a reboot:

```powershell
npm run db:local
```

MongoDB Server 9.0 must be installed. The data lives in `%LOCALAPPDATA%\Temp\opencode\mongodb-rs-data` and logs in `%LOCALAPPDATA%\Temp\opencode\mongod-rs.log`. The replica set only needs initiating once; the script starts the existing data directory.

### MongoDB Atlas (alternative)

To use a hosted database instead:

1. Create a MongoDB Atlas cluster (M0 free works — it is a replica set).
2. Set `DATABASE_URL` in `.env` to the Atlas connection string, including a database name, e.g. `mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/inventory?retryWrites=true&w=majority`.
3. Keep `NEXT_PUBLIC_DATABASE_ENABLED="true"` and restart `npm run dev`.

Multi-document writes use MongoDB transactions, so a replica set is required. Without `NEXT_PUBLIC_DATABASE_ENABLED="true"`, the UI uses browser localStorage and displays a notice instead of attempting database sync. For deployments, set both environment variables in the hosting provider and rebuild the app.

## Project structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main app page
│   └── globals.css         # Tailwind + theme styles
├── components/
│   ├── inventory/          # App-specific views
│   │   ├── app-shell.tsx       # Sidebar + layout shell
│   │   ├── dashboard-view.tsx  # Dashboard page
│   │   ├── products-view.tsx   # Products list & CRUD
│   │   ├── categories-view.tsx # Categories list & CRUD
│   │   ├── suppliers-view.tsx  # Suppliers list & CRUD
│   │   ├── movements-view.tsx  # Stock movement history
│   │   ├── product-dialog.tsx  # Add/Edit product form
│   │   └── stock-dialog.tsx    # Stock in/out/adjust dialog
│   └── ui/                 # shadcn/ui component library
├── lib/
│   ├── store.ts            # Zustand store — all CRUD logic (client-side)
│   ├── seed-data.ts        # Demo products/categories/suppliers
│   ├── types.ts            # TypeScript types
│   └── format.ts           # Currency / date formatting helpers
```

## How data persistence works (Phase 1)

- On first load, demo data (products, categories, suppliers, movements) is seeded.
- Every change you make is saved to your browser's **localStorage**.
- To reset to demo data: clear site data for `localhost:3000` in your browser (DevTools → Application → Storage → Clear).

## Tech stack

| Tool | Purpose |
| --- | --- |
| Next.js 16 (App Router) | Framework & dev server |
| React 19 + TypeScript | UI & type safety |
| Tailwind CSS 4 | Styling |
| shadcn/ui (Radix) | UI components |
| Zustand (+ persist) | Client state & localStorage persistence |
| MongoDB driver | Server-side database access |
| lucide-react | Icons |

## Backend

- REST API routes backed directly by MongoDB (`Category`, `Supplier`, `Product`, `StockMovement`, `AuditLog`)
- Real server-side CRUD endpoints (`/api/products`, `/api/categories`, ...)
- Replace the client-side store with API calls
