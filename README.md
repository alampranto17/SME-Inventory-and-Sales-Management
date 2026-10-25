# SME Inventory & Sales Management

```
SME/
├── backend/    NestJS + PostgreSQL (TypeORM) API  -> http://localhost:3000/api/v1
├── frontend/   Next.js + Tailwind + Pusher         -> http://localhost:3001
└── docs/
    ├── PROJECT_GUIDE.md  full blueprint + learning path + how Pusher works (start here to LEARN)
    └── API_MAP.md        every endpoint → backend file + frontend file (start here to CHANGE code)
```

## 1. Run the backend

```bash
cd backend
npm install
```

1. Start PostgreSQL and create a database called `sme_db`.
2. Open `backend/.env` and set `DB_USER` / `DB_PASSWORD` to your postgres login.
   `DB_SYNC=true` makes TypeORM create all tables automatically (development only).
3. Add demo data (company, 3 users, products, orders):

```bash
npm run seed
```

4. Start the API:

```bash
npm run start:dev
```

Swagger docs: http://localhost:3000/api/docs

Demo logins (password `Admin@1234`):

| Role    | Email                    | Can do                                  |
|---------|--------------------------|-----------------------------------------|
| Super admin | admin@sme.app        | create shops + owners, monthly billing  |
| Owner   | owner@rahimtraders.com   | everything + team + delete products     |
| Manager | manager@rahimtraders.com | products, stock, suppliers, POs, reports|
| Staff   | staff@rahimtraders.com   | sell (POS), customers, payments         |

## 2. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3001

## How a new shop gets the software

Everyone (super admin, owners, managers, staff) logs in at the same `/login` page.
There is no public sign-up.

1. **Super admin** → **Shops** → **+ Add shop**: enters the shop name, plan, and the owner's name/email/password.
   This creates the shop, its "Main Warehouse", the owner account and the first monthly bill.
2. **Owner** logs in → **Team** → adds managers and staff.
3. **Every month** (1st, 01:00) each active shop gets a bill for its plan price (`billing/constants/billing.constants.ts`).
   Bills are due on the 10th; after that they show as **Overdue**.
4. The owner pays by bKash / bank; the **super admin** opens **Billing** → **Mark paid**.
   The owner sees his bills on **My Subscription**.
5. A shop that doesn't pay can be **suspended** on the Shops page → nobody in that shop can log in.

## 3. Turn on realtime (Pusher)

The app works without Pusher, it's just not live. To turn it on:

1. Create a free account at https://dashboard.pusher.com → **Channels** → create an app (cluster `ap2` = Mumbai).
2. Copy the keys from **App Keys**:
   - `backend/.env` → `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`
   - `frontend/.env.local` → `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`
     (**never** put the secret in the frontend!)
3. Restart both. The top bar shows a green **Live** dot.
4. Test it: open the dashboard in one tab and the POS in another, then make a sale.

### How the realtime flow works

```
 Staff makes a sale (POS)
        │  POST /orders
        ▼
 backend/src/orders/orders.service.ts
   pusherService.sendToTenant(tenantId, "order-created", {...})
        │
        ▼
 Pusher cloud  ──►  every browser subscribed to "private-tenant-{tenantId}"
        │
        ▼
 frontend: usePusherEvent(tenantChannel(user), "order-created", (data) => reload())
```

| Read this file                                   | To learn                                 |
|--------------------------------------------------|------------------------------------------|
| `backend/src/pusher/pusher.service.ts`           | sending events, channel names            |
| `backend/src/pusher/pusher.controller.ts`        | who may join a private channel           |
| `frontend/src/lib/pusher.ts`                     | connecting + auth from the browser       |
| `frontend/src/hooks/usePusherEvent.ts`           | the React hook used on every page        |
| `frontend/src/components/NotificationBell.tsx`   | live notifications + toast popup         |
| `frontend/src/app/(app)/dashboard/page.tsx`      | live activity feed + live graphs         |

Events: `order-created`, `order-updated`, `stock-updated`, `payment-received` (company channel), `new-notification` (user channel).

## Backend structure (every module looks the same)

```
src/products/
├── entities/product.entity.ts   database table
├── dto/createProduct.dto.ts     what the request body must look like (validation)
├── products.service.ts          business logic + database queries
├── products.controller.ts       routes (@Get, @Post ...) + @Roles
└── products.module.ts           connects them
```

Important ideas:
- **Every query filters by `tenantId`** (from the JWT) → one company never sees another company's data.
- **`InventoryService.changeStock()`** is the only place stock changes. It always writes a `stock_movements` row.
- **Transactions**: an order, its stock and the customer balance are saved together. If one step fails, nothing is saved.
- Responses always look like `{ statusCode, message, data }`. Errors look like `{ statusCode, error, message }`.

## Migrations (for production)

`DB_SYNC=true` is for learning. For production set `DB_SYNC=false` and use:

```bash
npm run migration:generate -- src/database/migrations/Init
npm run migration:run
```
