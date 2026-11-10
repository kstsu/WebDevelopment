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

Python, a separate database server, and a web server are **not required** for the current frontend-only version. The app stores its data in the browser's localStorage.

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

If `npm run dev` shows a `tee` error on Windows, start Next.js directly:

```powershell
npx next dev -p 3000
```

Press `Ctrl+C` in PowerShell to stop the development server.

### Optional: database setup (for later phases)

The UI runs without a database. If you want to prepare for Phase 2 (real CRUD via Prisma + SQLite):

```bash
cp .env.example .env
npm run db:generate   # generate Prisma client
npm run db:push       # create db/custom.db
```

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
| lucide-react | Icons |

## Roadmap (Phase 2)

- REST API routes backed by Prisma + SQLite (schema & scripts already scaffolded)
- Real server-side CRUD endpoints (`/api/products`, `/api/categories`, ...)
- Replace the client-side store with API calls
