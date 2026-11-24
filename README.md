# Inventory Management System

A Next.js 16 App Router app built with React 19, TypeScript, Tailwind CSS 4, shadcn/ui, and Zustand. The workspace includes a stock dashboard, product catalog, categories, suppliers, stock movement history, and light/dark themes.

## Run locally

Use Node.js 22 LTS and npm. From the repository root run `npm ci`, then `npm run dev`. Open `http://localhost:3000`. No database or configuration file is required. If you have an existing `.env` that enables database sync, set `NEXT_PUBLIC_DATABASE_ENABLED=false` and restart the server to use browser mode.

## Roles and Test Accounts

The first login initializes the local development account store. An existing development store without an Owner gets the test Owner on its next auth lookup, provided that email is unused. Existing accounts and sessions are preserved. **Development test credentials only:**

| Role | Email | Password | Access |
| --- | --- | --- | --- |
| Owner | `owner@example.com` | `owner123` | All inventory actions, stock changes, reset, and Accounts; can create Admin and Staff accounts |
| Admin | `admin@example.com` | `admin123` | All inventory actions, stock changes, reset, and Accounts; can create Staff accounts only |
| Staff | `staff@example.com` | `staff123` | Browse, search, filter, and view inventory history; no writes or Accounts access |

Sign in at `/`. A valid session opens `/inventory`. Switching tabs, including **Accounts** for Owners and Admins, stays on `/inventory` without reloading. Owners and Admins can also open `/accounts` directly. Enter a full name, email, and password (at least eight characters) to create an account. Owners can choose **Staff** or **Admin**; Admins can only assign **Staff**. The application does not offer creating another Owner or changing existing roles. Emails are case-insensitive. Sessions expire after eight hours; Logout revokes the session and returns to login. The server checks account creation, protected pages, and inventory API requests independently of the visible controls.

Accounts and sessions live in `.auth/accounts.json`, outside the public directory and ignored by Git. The browser holds only an HttpOnly session cookie. Passwords use salted scrypt hashes. `src/server/auth.ts` owns authentication, role checks, and the single-process JSON storage adapter. Replace its storage operations with database calls before deploying multiple instances; the pages do not read the file directly. Test accounts are never seeded in production. Never deploy a development `.auth` directory.

In **Accounts**, open a card's actions menu to deactivate, reactivate, or permanently delete the account. Owners can manage Admin and Staff accounts; Admins can manage Staff accounts only. Nobody can deactivate or delete their own account or an Owner. Deactivation preserves the account but revokes all of its sessions and blocks sign-in. Reactivation allows a fresh sign-in without restoring old sessions. Deletion removes the account and its sessions without changing inventory records.

To provision a real Owner, set `AUTH_OWNER_EMAIL` to an unused email and `AUTH_OWNER_PASSWORD` to a unique password of 12–256 characters in the server environment, then sign in with those credentials. The server only provisions this account if no Owner exists; these variables do not promote an existing account or reset an existing Owner’s password. Remove the variables after provisioning and keep the account store on persistent, private storage. For an existing development store where the test Owner email is already in use, set these variables with a different email instead.

### Manual verification

- [ ] Signed out, open `/inventory` and `/accounts` directly: both return to login. Enter a wrong password and check the error.
- [ ] Sign in as staff. Browse every view on desktop and mobile. Accounts, Add, Edit, Delete, Restock, stock changes, and Reset should not be available. Opening `/accounts` should return to inventory.
- [ ] Sign in as admin. Create a category and supplier, create a product linked to them, change its stock, and check Inventory History. Edit and delete the test records, deleting the product first. Test Reset only on disposable sample inventory.
- [ ] Switch through all tabs and confirm the URL stays `/inventory`. Compare Accounts with Suppliers in light and dark mode.
- [ ] Create a staff account under Accounts. Log out and sign in with it; it should have the same restrictions as the test staff account.
- [ ] Sign in as Owner. The role selector should offer only Staff and Admin. Create an Admin, then sign in with it and confirm its role field is fixed to Staff.
- [ ] Using a temporary account, confirm deactivation revokes an existing session and blocks sign-in. Reactivate it and confirm a fresh login works, then delete it and confirm its card disappears. Check that Admins have no actions on Owner or Admin cards.
- [ ] A signed-out inventory API request should return 401; an inventory write as staff should return 403 even when Atlas is not configured.

## Inventory persistence and optional Atlas sync

### App accounts on Atlas

Grant the server's Atlas database user `readWrite` on a separate database, such as `naokoffi_accounts_dev`, in addition to its inventory privileges. Set `AUTH_DATABASE_NAME=naokoffi_accounts_dev` in `.env.local`, set `AUTH_OWNER_EMAIL` and `AUTH_OWNER_PASSWORD` for initial provisioning, and restart. Sign in as that Owner. The app creates `Account` and `Session` collections and does not seed known test credentials in Atlas, even in development. Remove the bootstrap variables after the first successful sign-in. Keep this database's credentials private; direct write access can bypass app roles.

Enabling Atlas auth does not import `.auth/accounts.json` or its sessions. Keep that file as a private backup, sign in fresh, and recreate accounts in the Accounts tab. Leaving `AUTH_DATABASE_NAME` unset preserves the existing JSON adapter. Atlas connection errors do not fall back to local accounts.

The browser store (`src/lib/store.ts`) starts with demo inventory and saves changes in localStorage. It is local to that browser, not a shared or tamper-proof database. The application blocks staff mutations, but someone controlling the browser can edit their own localStorage. Use server-owned inventory for authoritative records.

To enable the existing MongoDB inventory API, set `DATABASE_URL` to your Atlas connection string (including the inventory database name), set `NEXT_PUBLIC_DATABASE_ENABLED=true`, and restart or rebuild the app. Keep credentials server-side. The API uses the official MongoDB driver and transactions; it does not require a local MongoDB installation. Enabling inventory sync alone does not move accounts or upload existing browser inventory.
