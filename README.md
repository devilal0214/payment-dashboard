# Payment & Claims Reporting Dashboard

A production-ready, read-only reporting dashboard for the payment team. Deployed at `reports.refly.org`, running as an isolated Next.js process on `127.0.0.1:3040`.

---

## Features

- **KPI Dashboard** — 8 real-time aggregate cards (Total Claims, Open Tickets, Compensation, etc.)
- **Server-Side Table** — All filtering, sorting, and pagination in SQL — never client-side
- **Advanced Filter Panel** — 30+ filters including date ranges, amounts, booleans
- **URL-Persistent State** — Search, filters, page, sort all in the URL (bookmarkable/shareable)
- **Detail Drawer** — 9-section claim detail view with collapsible JSON viewer
- **Export** — CSV (streaming) and XLSX (batched) respecting all active filters
- **Selected Row Export** — Export only checked rows
- **Authentication** — Cookie-based sessions with `iron-session`
- **RBAC** — 4 roles: `admin`, `payment_manager`, `payment_agent`, `viewer`
- **Audit Logging** — Login, view, export events logged to daily audit files
- **Read-Only** — Dashboard user has `SELECT` only; can never write to `refly_db`
- **Security** — Prepared statements, column whitelist for ORDER BY, HTTP security headers

---

## Tech Stack

| Component | Library |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Table | TanStack Table v8 |
| Database | mysql2 (connection pool) |
| Validation | Zod |
| Auth | iron-session |
| XLSX Export | exceljs |
| Password | bcryptjs |

---

## Project Structure

```
app/
  (auth)/login/          ← Login page
  (dashboard)/
    dashboard/           ← KPI dashboard
    tickets/             ← Claims table + detail drawer
  api/
    health/              ← GET /api/health
    auth/                ← login, logout, me
    tickets/             ← list, [id], stats, export, filter-options

components/
  layout/                ← Sidebar, TopBar
  dashboard/             ← KpiCard, KpiGrid
  tickets/               ← TicketsPageClient, StatusBadge, BooleanBadge, ColumnVisibilityMenu
  filters/               ← FilterDrawer, FilterChips
  pagination/            ← Pagination
  detail/                ← DetailDrawer, JsonViewer, DocumentLink
  export/                ← ExportMenu

lib/
  db/pool.ts             ← mysql2 connection pool
  queries/               ← SQL query builders
  auth/                  ← session, roles
  validation/            ← Zod schemas
  export/                ← CSV streaming, XLSX generation
  audit/                 ← File-based audit logging
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
# Edit .env.local with your database credentials
```

| Variable | Description |
|---|---|
| `REPORT_DB_HOST` | MySQL host (usually `127.0.0.1`) |
| `REPORT_DB_PORT` | MySQL port (default `3306`) |
| `REPORT_DB_USER` | MySQL user (read-only) |
| `REPORT_DB_PASS` | MySQL password |
| `REPORT_DB_NAME` | Database name (`zendesk_reporting`) |
| `REPORT_DB_POOL_LIMIT` | Connection pool size (default `10`) |
| `SESSION_SECRET` | Min 32-char random secret for cookie encryption |
| `SEED_ADMIN_USERNAME` | Username for seed script (default `admin`) |
| `SEED_ADMIN_PASSWORD` | Password for seed script (min 12 chars) |
| `AUDIT_LOG_DIR` | Directory for audit log files (default `./logs`) |

---

## Database Setup

1. Run the setup SQL (as MySQL admin):
   ```bash
   mysql -u root -p zendesk_reporting < scripts/setup-db.sql
   ```

2. Create the read-only MySQL user:
   ```sql
   CREATE USER 'refly_reporting_ro'@'127.0.0.1' IDENTIFIED BY 'strong_password';
   GRANT SELECT ON zendesk_reporting.reporting_tickets TO 'refly_reporting_ro'@'127.0.0.1';
   GRANT SELECT, INSERT ON zendesk_reporting.users TO 'refly_reporting_ro'@'127.0.0.1';
   FLUSH PRIVILEGES;
   ```
   > Note: The `users` table needs INSERT only for the seed script. The running app only needs SELECT on `users`.

---

## Installation & Running

```bash
# Install dependencies
npm install

# Run database setup
mysql -u root -p zendesk_reporting < scripts/setup-db.sql

# Seed admin user
SEED_ADMIN_PASSWORD=YourStrongPass123! npm run seed-admin

# Development
npm run dev

# Production build
npm run build

# Production start (port 3040)
npm run start
```

---

## User Management

Users are stored in `zendesk_reporting.users`. To add more users:

```sql
-- Insert with bcrypt hash (generate via seed script or external tool)
INSERT INTO users (username, password_hash, role, is_active)
VALUES ('agent1', '$2a$12$...hash...', 'payment_agent', 1);
```

Or re-run the seed script with different credentials to add users:
```bash
SEED_ADMIN_USERNAME=newuser SEED_ADMIN_PASSWORD=Password123! npm run seed-admin
```

### Roles

| Role | List | Detail | Sensitive Fields | Raw JSON | Export | Advanced Export |
|---|---|---|---|---|---|---|
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `payment_manager` | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| `payment_agent` | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| `viewer` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## API Reference

| Endpoint | Description |
|---|---|
| `GET /api/health` | Health check |
| `POST /api/auth/login` | Login (returns session cookie) |
| `POST /api/auth/logout` | Logout |
| `GET /api/auth/me` | Current user |
| `GET /api/tickets` | Paginated claim list (all filters) |
| `GET /api/tickets/[id]` | Single claim detail |
| `GET /api/tickets/stats` | KPI aggregates |
| `GET /api/tickets/export` | CSV/XLSX export |
| `GET /api/tickets/filter-options` | Distinct values for dropdowns |

---

## Security Notes

- All SQL uses **prepared statements** — no user input interpolated
- ORDER BY columns validated against an **explicit whitelist** before use
- `mysql2` credentials **never** exposed via `NEXT_PUBLIC_*`
- Session cookie is `HttpOnly`, `SameSite=Lax`, `Secure` in production
- Raw JSON fields only visible to `admin` role
- All access events written to `logs/audit-YYYY-MM-DD.log`
- Dashboard user has no `INSERT/UPDATE/DELETE` on any table
- Dashboard user has **zero access** to `refly_db`
