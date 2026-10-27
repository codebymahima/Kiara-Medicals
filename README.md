# Kiara Medicals — Multi-Branch Medical Store (Prototype)

Full-stack prototype aligned with **Official SRS Draft 1.0**: shared **Medicine Master**, **branch-isolated** inventory and billing, and an **Admin** role with **read-only** operational access who can **add users** and **manage branches** (count / active status).

## Stack

- **Backend:** Node.js, Express, MySQL (`mysql2`), JWT auth
- **Frontend:** React (Vite)

## Roles

| Role | Access |
|------|--------|
| **SHOP_USER** | Billing, inventory, and search for **one assigned branch** only |
| **ADMIN** | Read-only dashboards, medicine master, inventory & sales **across branches**; **create users**; **add/deactivate branches** |

## Setup

1. **MySQL:** Create schema and seed data:

   ```bash
   mysql -u root -p < database/schema.sql
   mysql -u root -p < database/seed.sql
   ```

2. **Server:** Copy env and install:

   ```bash
   cd server
   cp .env.example .env
   npm install
   node createTestUsers.js
   npm run dev
   ```

3. **Client:**

   ```bash
   cd client
   npm install
   npm run dev
   ```

4. Open the Vite URL (usually `http://localhost:5173`). API defaults to `http://localhost:5000`.

## Test accounts (`createTestUsers.js`)

| Username | Password | Role | Branch |
|----------|----------|------|--------|
| `testadmin` | `Admin@12345` | Admin | — |
| `shopa` | `ShopA@12345` | Shop | BR001 Koramangala |
| `shopb` | `ShopB@12345` | Shop | BR002 Indiranagar |
| `shopc` | `ShopC@12345` | Shop | BR003 Whitefield |

## Database migration (existing DB)

If you already created the schema earlier, apply:

```bash
mysql -u root -p kiara_medicals < database/migrations/002_purchases_returns_analytics.sql
```

## API highlights

- `POST /api/auth/login` — JWT login
- `GET /api/products` — shared medicine master (read)
- `GET /api/inventory` — branch-scoped (shop) or all branches / `?branchId=` (admin)
- `POST /api/billing` — billed sale · `POST /api/billing/unbilled` · `PUT /api/billing/:id` (edit)
- `POST /api/purchases` — purchase stock · `GET /api/purchases` history
- `POST /api/returns/customer` · `POST /api/returns/supplier`
- `GET /api/analytics/branch` — shop daily/weekly/monthly metrics
- `GET /api/analytics/admin?period=day|week|month` — consolidated + branch-wise
- `GET /api/alerts` — low stock (≤10 units) and expiry (30 days)
- `GET /api/admin/overview`, `/branches`, `/users`, `/sales` — admin panel

## Shop workflows (SRS sequence-aligned)

1. **Purchase** — supplier → invoice lines → stock increase (4.3)
2. **Billing** — search batch → bill → stock decrease (4.4)
3. **Unbilled** — quantity only, no invoice, in reports (4.6)
4. **Customer return** — pick bill → return qty → restock + credit note (4.6)
5. **Supplier return** — batch qty back to supplier (4.3)
6. **Edit bill** — replace lines with stock restore/re-apply
7. **Analytics** — day/week/month: billed, unbilled, returns, net (4.7 / BR-07)

## Branches (seed)

Three stores with distinct **names** and **GSTIN** values (see `database/seed.sql`).
