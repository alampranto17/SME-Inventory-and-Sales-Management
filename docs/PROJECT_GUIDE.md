# SME Inventory & Sales — Full Project Guide (Blueprint)

This file is for **learning**. Read it from top to bottom once, then use it as a map.

- **Part A** — what the project is and how it runs
- **Part B** — the blueprint: every folder and file, and what it does
- **Part C** — the database: every table and how they connect
- **Part D** — the important ideas (NestJS, TypeORM, JWT, roles, multi-tenant, transactions, Next.js)
- **Part E** — the main business flows, step by step (with file names)
- **Part F** — what is built and what is **not** built yet
- **Part G** — a learning path: which files to read in which order + practice tasks
- **Part H** — common errors and how to fix them
- **Part I** — **Pusher deep-dive**: how realtime works from backend to frontend

Companion file: [API_MAP.md](API_MAP.md) = every endpoint → exact backend line → exact frontend line.

---

# Part A — The project in one page

**What it is:** a SaaS (software sold monthly) for small shops. Every shop manages products,
stock, sales (POS), customers, suppliers, purchase orders, payments and reports.
A **super admin** (you, the platform owner) creates shops and charges each shop monthly.

```
                ┌───────────────────────────┐
   Browser ───► │ FRONTEND  Next.js  :3001  │  pages, forms, tables, graphs
                └─────────────┬─────────────┘
                              │ HTTP + JWT token (axios)
                              ▼
                ┌───────────────────────────┐
                │ BACKEND   NestJS   :3000  │  rules, security, calculations
                └──────┬───────────────┬────┘
                       │ TypeORM       │ pusher (npm)
                       ▼               ▼
                ┌────────────┐   ┌──────────────┐
                │ PostgreSQL │   │ Pusher cloud │ ──► live events back to browsers
                │  sme_db    │   └──────────────┘
                └────────────┘
```

| Part | Technology | Why |
|---|---|---|
| Backend | NestJS 11 (TypeScript) | organised in modules; controllers + services |
| Database | PostgreSQL 18 + TypeORM | tables are written as TypeScript classes |
| Auth | JWT (passport-jwt) + bcrypt | login tokens, hashed passwords |
| Validation | class-validator | checks every request body |
| Frontend | Next.js 16 (App Router) + React 19 | pages are folders |
| Styling | Tailwind CSS 4 | classes like `p-4 text-sm` |
| HTTP client | axios | adds the token automatically |
| Graphs | recharts | line / bar charts |
| Realtime | Pusher (`pusher` backend, `pusher-js` frontend) | live stock, orders, notifications |
| PDF | pdfkit | invoices |
| Emails | nodemailer | low-stock + welcome emails (only logged until `MAIL_HOST` is set) |

### How to run (every day)

```bash
# 1. database (only after the Mac restarts) — in macOS Terminal
sudo -u postgres /Library/PostgreSQL/18/bin/pg_ctl -D /Library/PostgreSQL/18/data -l /tmp/pg18.log start

# 2. backend
cd ~/Desktop/SME/backend && npm run start:dev

# 3. frontend (another terminal)
cd ~/Desktop/SME/frontend && npm run dev
```

Open http://localhost:3001. Swagger (try the API in the browser): http://localhost:3000/api/docs

| Login | Email | Password |
|---|---|---|
| Super admin | admin@sme.app | Admin@1234 |
| Owner | owner@rahimtraders.com | Admin@1234 |
| Manager | manager@rahimtraders.com | Admin@1234 |
| Staff | staff@rahimtraders.com | Admin@1234 |

Fresh demo data: `cd backend && npm run seed` (it skips data that already exists).

### Settings files

| File | What is inside |
|---|---|
| `backend/.env` | port, JWT secrets, DB login, Pusher keys (with secret), mail |
| `backend/.env.example` | the same list with explanations — copy it for a new computer |
| `frontend/.env.local` | backend URL, Pusher **public** key + cluster |
| `frontend/.env.example` | template of the above |

`.env` files are in `.gitignore` → they are never committed. Never put a secret in the frontend.

---

# Part B — Blueprint: what is where

## B1. Backend — `backend/src/`

Every feature is a **module folder** with the same files:

```
products/
├── entities/product.entity.ts    → the DATABASE TABLE (columns)
├── dto/createProduct.dto.ts      → what the REQUEST BODY may contain (validation)
├── products.controller.ts        → the URLS (@Get, @Post ...) and WHO may call them (@Roles)
├── products.service.ts           → the LOGIC (checks, calculations, database queries)
└── products.module.ts            → wires the pieces together (imports / providers)
```

### Start-up and shared code

| File | What it does |
|---|---|
| [main.ts](../backend/src/main.ts) | starts the app: `/api/v1` prefix, helmet, CORS, ValidationPipe, error filter, response wrapper, global guards, Swagger, public `/uploads` folder |
| [app.module.ts](../backend/src/app.module.ts) | the root module: config, database, cron, rate limit (60/min), and the list of all modules |
| [database/database.config.ts](../backend/src/database/database.config.ts) | DB connection from `.env`; `DB_SYNC=true` creates tables automatically |
| [database/data-source.ts](../backend/src/database/data-source.ts) | only for TypeORM migration commands |
| [database/seed.ts](../backend/src/database/seed.ts) | demo data: super admin, Rahim Traders, 3 users, 5 products, orders |
| [common/filters/http-exception.filter.ts](../backend/src/common/filters/http-exception.filter.ts) | every error becomes `{ statusCode, error, message }`; turns DB duplicate errors into 409 |
| [common/interceptors/response.interceptor.ts](../backend/src/common/interceptors/response.interceptor.ts) | every success becomes `{ statusCode, message, data }` |
| [common/Guards/user-role.guards.ts](../backend/src/common/Guards/user-role.guards.ts) | `RolesGuard` — reads `@Roles(...)` and blocks other roles (403) |
| [common/Guards/tenantExsits.guards.ts](../backend/src/common/Guards/tenantExsits.guards.ts) | for `billing/:slug` routes: shop must exist and be yours |
| [common/decorators/](../backend/src/common/decorators/) | `@CurrentUser()`, `@Roles()`, `@Public()`, `@CurrentTenants()` |
| [common/constants/roles.constants.ts](../backend/src/common/constants/roles.constants.ts) | role groups: `ALL_TENANT_ROLES`, `MANAGER_AND_UP`, `OWNER_ONLY` |
| [common/interfaces/auth-user.interface.ts](../backend/src/common/interfaces/auth-user.interface.ts) | the shape of the logged-in user: `id, email, role, tenantId, tenantSlug` |
| [common/dto/pagination.dto.ts](../backend/src/common/dto/pagination.dto.ts) | `?page=&limit=` used by many lists |
| [common/utils/helpers.ts](../backend/src/common/utils/helpers.ts) | `makeNumber` (ORD-0042), `money` (round), `startOfDay`, `endOfDay`, `toDateString` |

### Feature modules

| Module | Main files | In one line |
|---|---|---|
| **auth** | `auth.controller.ts`, `auth.service.ts`, `strategies/`, `Guards/` | login, refresh token, profile, logout; blocks suspended shops |
| **users** | `users.service.ts`, `entities/user.entity.ts` | team members; bcrypt passwords; `@Exclude` hides the hash |
| **tenants** | `tenants.service.ts` → `createShopWithOwner()` | shops (companies); super admin creates shop + owner |
| **billing** | `billing.service.ts` (plans), `subscriptions.service.ts` (monthly bills), `billing.helpers.ts`, `constants/billing.constants.ts` | plan prices and the monthly software bills |
| **categories** | `categories.service.ts` | product groups, with sub-categories (`parentId`) |
| **products** | `products.service.ts`, `productImage.upload.ts` | catalog, CSV import, photos |
| **inventory** | `inventory.service.ts` → `changeStock()`, `warehouses.controller.ts`, `lowStock.cron.ts` | stock per warehouse, movement log, nightly low-stock email |
| **orders** | `orders.service.ts`, `invoice.service.ts`, `enums/orderStatus.enum.ts` | POS sales, status changes, cancel, PDF invoice |
| **customers** | `customers.service.ts` → `changeBalance()`, `ledger()` | customers and how much they owe |
| **suppliers** | `suppliers.service.ts` | who you buy from |
| **purchase-orders** | `purchase-orders.service.ts` → `receive()` | buying stock; receiving adds stock |
| **payments** | `payments.service.ts` | customer pays an order (cash, bKash, …) |
| **reports** | `reports.service.ts` | sales summary, top products, stock value, profit & loss |
| **notifications** | `notifications.service.ts`, `mail.service.ts` | in-app notifications (+ Pusher push) and emails |
| **pusher** | `pusher.service.ts`, `pusher.controller.ts` | send realtime events; give channel permission |

### Enums (fixed lists of values)

| File | Values |
|---|---|
| `users/enums/userRole.enum.ts` | super_admin, business_admin (Owner), warehouse_manager (Manager), sales_staff (Staff) |
| `tenants/enums/tenantPlan.enum.ts` | STARTER, GROWTH, ENTERPRISE |
| `tenants/enums/tenantStatus.enum.ts` | ACTIVE, SUSPENDED, CANCELLED |
| `orders/enums/orderStatus.enum.ts` | draft, confirmed, shipped, delivered, cancelled + allowed changes |
| `inventory/enums/movementType.enum.ts` | IN, OUT, ADJUST, TRANSFER |
| `purchase-orders/enums/purchaseOrderStatus.enum.ts` | draft, sent, received, cancelled |
| `payments/enums/payment.enum.ts` | cash, bkash, nagad, card, bank / pending, completed, failed |
| `notifications/enums/notificationType.enum.ts` | LOW_STOCK, ORDER_CANCELLED, PAYMENT_RECEIVED, STOCK_RECEIVED |
| `billing/enums/invoiceStatus.enum.ts` | unpaid, paid |

## B2. Frontend — `frontend/src/`

In Next.js App Router, **a folder = a URL** and `page.tsx` is the page.
`(app)` in brackets is a **route group**: it is not in the URL, it just shares `layout.tsx`.

```
app/
├── layout.tsx               → wraps EVERY page with <AuthProvider>
├── page.tsx                 → "/" sends you to /login, /dashboard or /tenants
├── login/page.tsx           → /login (everyone logs in here)
└── (app)/                   → all logged-in pages
    ├── layout.tsx           → wraps them in <AppShell> (sidebar + top bar + login check)
    ├── dashboard/page.tsx   → /dashboard
    ├── products/page.tsx    → /products
    ├── products/[id]/page.tsx → /products/123   ([id] = dynamic part, read with useParams)
    └── ...
```

| Folder / file | What it does |
|---|---|
| [lib/api.ts](../frontend/src/lib/api.ts) | **all** HTTP calls: axios with base URL, adds token, refreshes token on 401, `apiGet/apiPost/apiPatch/apiDelete`, `getErrorMessage` |
| [lib/authStorage.ts](../frontend/src/lib/authStorage.ts) | saves tokens + user in `localStorage` |
| [lib/pusher.ts](../frontend/src/lib/pusher.ts) | creates the ONE Pusher connection, channel names, event names |
| [lib/types.ts](../frontend/src/lib/types.ts) | TypeScript shapes of API data (Product, Order, …) |
| [lib/roles.ts](../frontend/src/lib/roles.ts) | `isOwner`, `isManagerOrUp`, `isSuperAdmin` — to hide buttons |
| [lib/format.ts](../frontend/src/lib/format.ts) | `formatMoney` (৳1,234.00), `formatDate`, `toInputDate` |
| [lib/uploadImage.ts](../frontend/src/lib/uploadImage.ts) | product photo upload (FormData) + size/type check |
| [context/AuthContext.tsx](../frontend/src/context/AuthContext.tsx) | `useAuth()` → `user`, `login()`, `logout()` |
| [hooks/useFetch.ts](../frontend/src/hooks/useFetch.ts) | `useFetch(url, params)` → `data, loading, error, reload` |
| [hooks/usePusherEvent.ts](../frontend/src/hooks/usePusherEvent.ts) | listen to one Pusher event in a component |
| [hooks/usePusherStatus.ts](../frontend/src/hooks/usePusherStatus.ts) | the green "Live" dot |
| [components/AppShell.tsx](../frontend/src/components/AppShell.tsx) | sidebar menu (`NAV_ITEMS` with role rules), top bar, redirect to login |
| [components/ui.tsx](../frontend/src/components/ui.tsx) | Button, Input, Select, Card, Modal, Badge, Pagination, table classes |
| [components/NotificationBell.tsx](../frontend/src/components/NotificationBell.tsx) | 🔔 list + live toast popup |
| [components/ProductForm.tsx](../frontend/src/components/ProductForm.tsx) | create / edit product form (+ photo) |
| [components/ProductImage.tsx](../frontend/src/components/ProductImage.tsx) | shows a photo or a letter box |
| [components/charts/](../frontend/src/components/charts/) | SalesTrend, TopProducts, StockLevel, Valuation, Billing graphs + `chartColors.ts` |

### Pages and who sees them

| URL | File | Who |
|---|---|---|
| `/dashboard` | `(app)/dashboard/page.tsx` | shop users (money cards + sales graphs only for Manager+) |
| `/pos` | `(app)/pos/page.tsx` | shop users |
| `/orders`, `/orders/:id` | `(app)/orders/…` | shop users (status/cancel buttons Manager+) |
| `/products`, `/products/:id` | `(app)/products/…` | shop users (edit Manager+, deactivate Owner) |
| `/categories`, `/inventory`, `/customers`, `/suppliers` | `(app)/…` | shop users (changes Manager+) |
| `/purchase-orders`, `/reports` | `(app)/…` | Manager+ |
| `/users` (Team), `/my-subscription` | `(app)/…` | Owner |
| `/tenants` (Shops), `/subscriptions` (Billing) | `(app)/…` | Super admin |
| `/notifications` | `(app)/notifications/page.tsx` | shop users |

---

# Part C — Database

16 tables in PostgreSQL database `sme_db`. Every shop table has **`tenant_id`**.

```
tenants ─┬─< users
         ├─< warehouses ─┐
         ├─< categories ─┼─< products ─┬─< inventory (product + warehouse = quantity)
         │               │             ├─< stock_movements (log of every change)
         ├─< customers ──┼─< orders ───┴─< order_items
         │               │      └────────< payments
         ├─< suppliers ──┴─< purchase_orders ─< purchase_order_items
         ├─< notifications (per user)
         └─< subscription_invoices (monthly software bill)

  ─<  means "one to many"   (one tenant has many users)
```

| Table | Entity file | Key columns |
|---|---|---|
| tenants | `tenants/entities/tenant.entity.ts` | name, slug, plan, status |
| users | `users/entities/user.entity.ts` | tenant_id (null for super admin), email, password_hash, role, is_active, refresh_token_hash |
| warehouses | `inventory/entities/warehouse.entity.ts` | name, is_default |
| categories | `categories/entities/category.entity.ts` | name, parent_id |
| products | `products/entities/product.entity.ts` | sku (unique per shop), cost_price, selling_price, reorder_level, image_url, is_active |
| inventory | `inventory/entities/inventory.entity.ts` | product_id + warehouse_id (unique), quantity |
| stock_movements | `inventory/entities/stockMovement.entity.ts` | type IN/OUT/ADJUST/TRANSFER, quantity (+/-), reason, reference_id |
| customers | `customers/entities/customer.entity.ts` | phone (unique per shop), balance |
| suppliers | `suppliers/entities/supplier.entity.ts` | name, contact_person, is_active |
| orders | `orders/entities/order.entity.ts` | order_number, status, subtotal, discount, tax, total, paid_amount |
| order_items | `orders/entities/orderItem.entity.ts` | product_name, unit_price, **cost_price** (copied at sale time), quantity, total |
| purchase_orders | `purchase-orders/entities/purchaseOrder.entity.ts` | po_number, supplier_id, status, total |
| purchase_order_items | `purchase-orders/entities/purchaseOrderItem.entity.ts` | quantity, received_qty, unit_cost |
| payments | `payments/entities/payment.entity.ts` | order_id, amount, method, reference |
| notifications | `notifications/entities/notification.entity.ts` | user_id, type, title, message, link, is_read |
| subscription_invoices | `billing/entities/subscriptionInvoice.entity.ts` | tenant_id + month (unique), plan, amount, status, due_date |

Look at the data yourself: open **pgAdmin** → `sme_db` → Schemas → public → Tables → right-click → View/Edit Data.

> Money columns are `decimal`. PostgreSQL sends them back as **strings** (`"110.00"`),
> so in code we write `Number(product.sellingPrice)` before doing math.

---

# Part D — The important ideas

## D1. A NestJS request, piece by piece

Example: the frontend sends `POST /api/v1/products` with a JSON body.

1. **Global guards** ([main.ts](../backend/src/main.ts)):
   - `JwtAuthGuard` — is there a valid token? (skipped when the route has `@Public()`)
   - `RolesGuard` — does `@Roles(...)` allow this role?
   - `ThrottlerGuard` — not more than 60 requests/minute ([app.module.ts](../backend/src/app.module.ts))
2. **ValidationPipe** checks the body against the **DTO** (`CreateProductDto`).
   Wrong body → 400 with the message you wrote in the decorator.
3. **Controller** method runs: `create(@CurrentUser() user, @Body() dto)`.
4. **Service** does the work and talks to the database with a **Repository**.
5. **ResponseInterceptor** wraps the result: `{ statusCode: 201, message, data }`.
6. If anything throws, **AllExceptionsFilter** sends `{ statusCode, error, message }`.

## D2. Dependency injection (DI)

You never write `new ProductsService()`. Nest creates it and passes it into the constructor:

```ts
constructor(private readonly productsService: ProductsService) {}
```

For this to work, the class must be in a module's `providers`, and other modules must `import` that module
(and it must be in `exports`). Example: `ProductsModule` imports `InventoryModule` to use `InventoryService`.

## D3. TypeORM basics used in this project

```ts
@InjectRepository(Product) private readonly productRepo: Repository<Product>

this.productRepo.find({ where: { tenantId, isActive: true }, order: { name: 'ASC' } })
this.productRepo.findOne({ where: { id, tenantId } })
this.productRepo.findAndCount({ where, skip, take })     // pagination
this.productRepo.save(this.productRepo.create({ ... }))  // insert
this.productRepo.createQueryBuilder('p') ...              // SUM, GROUP BY (reports)
```

`where: [ {...a}, {...b} ]` (an array) means **OR** — used for "search name OR sku".

## D4. Multi-tenant (many shops, one database)

The token contains `tenantId`. Every service query adds `tenantId`:

```ts
this.productRepo.findOne({ where: { id, tenantId } })
```

So a shop can never read another shop's data — even if it guesses an id, it gets **404**.
Shop routes use `@Roles(...ALL_TENANT_ROLES)` so the super admin (who has no tenantId) can't call them.

## D5. Login, tokens and refresh

```
login ─► backend checks bcrypt password ─► returns accessToken (15 min) + refreshToken (7 h, see .env)
          and saves sha256(refreshToken) in users.refresh_token_hash

every request:   Authorization: Bearer <accessToken>

access token expired → 401 → frontend/src/lib/api.ts automatically calls
    POST /auth/refresh  with  Authorization: Bearer <refreshToken>
    backend compares the hash, returns a NEW pair (the old refresh token stops working)
    → the failed request is sent again. The user notices nothing.

logout → refresh_token_hash = null → no more refresh possible
```

Files: [auth.service.ts](../backend/src/auth/auth.service.ts) (`userLogin`, `refresh`, `generateTokens`),
[strategies/](../backend/src/auth/strategies/), [lib/api.ts](../frontend/src/lib/api.ts) (interceptor).

## D6. Roles

```ts
@Controller('products')
@Roles(...ALL_TENANT_ROLES)          // default for every route in this controller
export class ProductsController {
  @Post()
  @Roles(...MANAGER_AND_UP)          // this route only: Owner + Manager
  create(...) {}
}
```

The frontend also hides buttons with `isManagerOrUp(user)`, but **the backend is the real lock**.

## D7. Transactions (all or nothing)

A sale changes 4 tables. If stock runs out halfway, nothing must be saved:

```ts
await this.dataSource.transaction(async (manager) => {
  await manager.save(order);                          // 1
  await this.inventoryService.changeStock(manager, …) // 2 + 3 (inventory + stock_movements)
  await this.customersService.changeBalance(manager, …) // 4
}); // an error anywhere → everything is rolled back
```

`changeStock` also uses `lock: { mode: 'pessimistic_write' }`: if two cashiers sell the last item
at the same moment, the second one waits and then gets "Not enough stock".

## D8. Next.js pages in this project

- Every page starts with `"use client"` → it runs in the browser (needed for state, clicks, localStorage).
- Data loading pattern used everywhere:

```tsx
const { data, loading, error, reload } = useFetch<Paginated<Product>>("/products", { page, limit: 10 });
```

  When `page` changes, `useFetch` loads again automatically. After saving something, call `reload()`.
- Sending data:

```tsx
await apiPost("/customers", { name, phone });
```

- Errors: `catch (err) { setError(getErrorMessage(err)) }` shows the backend's message.

---

# Part E — The main flows, step by step

### E1. A new shop joins
1. Super admin → **Shops → + Add shop** ([tenants/page.tsx](../frontend/src/app/%28app%29/tenants/page.tsx))
2. `POST /tenants/create-with-owner` → [`createShopWithOwner()`](../backend/src/tenants/tenants.service.ts) — one transaction:
   tenant + "Main Warehouse" + owner user + first monthly bill
3. Owner logs in → **Team** → adds Manager / Staff (`POST /users`)

### E2. A sale at the POS
1. [pos/page.tsx](../frontend/src/app/%28app%29/pos/page.tsx) → cart → **Complete sale** → `POST /orders`
2. [`OrdersService.create()`](../backend/src/orders/orders.service.ts):
   checks customer + products → calculates line totals, subtotal, discount, tax, total → order number `ORD-0042`
3. **Transaction:** save order + items → `changeStock(-qty)` per item (OUT movement) → customer balance `+total`
4. **After** the transaction: `afterStockChange()` → Pusher `stock-updated` + low-stock alert if needed;
   Pusher `order-created`
5. Browser goes to `/orders/:id` → take payment / download invoice

### E3. Cancel an order
`POST /orders/:id/cancel` → only `draft`/`confirmed` → stock back (`IN`) → customer balance `- unpaid part`
→ status `cancelled` → notification to the person who made the sale.

### E4. Payment
`POST /payments` → order row locked → amount must be ≤ balance due → payment saved → `orders.paid_amount` up →
customer balance down → Pusher `payment-received` → if fully paid, notify the seller.

### E5. Buying stock (purchase order)
Create PO (draft) → **Mark as sent** → goods arrive → **Receive goods** (can be less than ordered)
→ `changeStock(+qty)` per item → PO `received` → notification "Stock Received".

### E6. Low stock
After every stock change: if stock **just crossed** below `reorder_level` → notification + email to Owner/Manager.
Every night 2:00 → [lowStock.cron.ts](../backend/src/inventory/lowStock.cron.ts) emails the owner a full list.

### E7. Monthly software billing
1st of month 01:00 → `monthlyBillingJob()` in [subscriptions.service.ts](../backend/src/billing/subscriptions.service.ts)
→ one bill per active shop = plan price from [billing.constants.ts](../backend/src/billing/constants/billing.constants.ts)
→ due on the 10th (at least 7 days: `dueDateOf()` in [billing.helpers.ts](../backend/src/billing/billing.helpers.ts))
→ owner pays outside the app → super admin **Billing → Mark paid** → if a shop never pays: **Shops → Suspend** (its users can't log in).

### E8. Product photo
**Add photo** → [lib/uploadImage.ts](../frontend/src/lib/uploadImage.ts) sends `FormData` field `image`
→ `POST /products/:id/image` → Multer saves `backend/uploads/products/<random>.jpg` ([productImage.upload.ts](../backend/src/products/productImage.upload.ts))
→ DB stores `/uploads/products/<file>` → [ProductImage.tsx](../frontend/src/components/ProductImage.tsx) shows `http://localhost:3000/uploads/...`

---

# Part F — What is built, what is NOT built

### ✅ Built and tested
Auth + refresh rotation · roles · multi-tenant isolation · super admin shops + owners · monthly billing ·
products (search, filter, pages, CSV import, photos) · categories · warehouses · stock adjust/receive/transfer ·
movement log · POS sales · status flow · cancel with stock return · PDF invoice · customers + ledger ·
suppliers · purchase orders · payments · 5 reports · dashboards with graphs · in-app notifications ·
nightly low-stock email (logged) · Pusher realtime · rate limiting · helmet · Swagger.

### ❌ Not built yet (good practice tasks!)
| Missing | Where it would go |
|---|---|
| Online payment (bKash API) for orders or monthly bills | new service in `payments/` or `billing/` |
| Real email sending | just set `MAIL_HOST`, `MAIL_USER`, `MAIL_PASSWORD` in `backend/.env` |
| AWS S3 for photos (plan asks for it) | change only `products/productImage.upload.ts` |
| Auto-suspend shops that don't pay | a new `@Cron` in `billing/subscriptions.service.ts` |
| Owner changing his own plan from the UI | API exists: `PATCH /billing/:slug/change-plan`; add a button on `/my-subscription` |
| Migrations (production database changes) | `npm run migration:generate -- src/database/migrations/Init` then set `DB_SYNC=false` |
| Docker / docker-compose | new files in the project root |
| Unit + e2e tests | `backend/src/**/*.spec.ts`, `backend/test/` (only the starter test exists) |
| Winston logging (plan) | `main.ts` |
| Edit customer / supplier forms in the UI | API `PATCH` exists; add a form on the pages |
| Order "draft" flow | orders are always created as `confirmed` today |
| Deploying online so real shops can use it | a server / hosting + domain |

Old code from your first version that is still there: `tenants/dto/createTenants.dto.ts` + `POST /tenants/create`
(creates a shop **without** owner) and `POST /auth/register/super-admin`. Both still work.

---

# Part G — Learning path

Read the files in this order. Each step builds on the one before.

**Week 1 — backend basics**
1. [main.ts](../backend/src/main.ts) → [app.module.ts](../backend/src/app.module.ts): how the app starts
2. [suppliers/](../backend/src/suppliers/) — the **simplest** module. Read entity → dto → service → controller → module
3. [common/](../backend/src/common/): guards, decorators, filter, interceptor
4. [auth/auth.service.ts](../backend/src/auth/auth.service.ts) + [strategies/jwt.strategies.ts](../backend/src/auth/strategies/jwt.strategies.ts): login and tokens
5. Open Swagger, log in, press **Authorize**, call `GET /suppliers`

**Week 2 — real business logic**
6. [inventory/inventory.service.ts](../backend/src/inventory/inventory.service.ts) → `changeStock()` (transactions + locks)
7. [orders/orders.service.ts](../backend/src/orders/orders.service.ts) → `create()` and `cancel()`
8. [reports/reports.service.ts](../backend/src/reports/reports.service.ts) → QueryBuilder with SUM / GROUP BY
9. [tenants/tenants.service.ts](../backend/src/tenants/tenants.service.ts) + [billing/subscriptions.service.ts](../backend/src/billing/subscriptions.service.ts)

**Week 3 — frontend**
10. [lib/api.ts](../frontend/src/lib/api.ts) → [context/AuthContext.tsx](../frontend/src/context/AuthContext.tsx) → [hooks/useFetch.ts](../frontend/src/hooks/useFetch.ts)
11. [app/(app)/suppliers/page.tsx](../frontend/src/app/%28app%29/suppliers/page.tsx) — simple list + form
12. [components/AppShell.tsx](../frontend/src/components/AppShell.tsx) and [components/ui.tsx](../frontend/src/components/ui.tsx)
13. [app/(app)/pos/page.tsx](../frontend/src/app/%28app%29/pos/page.tsx) — cart state
14. [app/(app)/dashboard/page.tsx](../frontend/src/app/%28app%29/dashboard/page.tsx) — graphs + realtime

**Week 4 — realtime** → Part I below.

### Practice tasks (easy → hard)
1. Change the Starter price to 3,499 BDT. *(billing.constants.ts)*
2. Add a "Tax ID" field to suppliers. *(entity → DTO → frontend form + table)*
3. Make customer `email` required. *(customers/dto/customer.dto.ts)*
4. Add an **Edit** button for customers. *(API `PATCH /customers/:id` already exists)*
5. Allow Staff to create categories. *(one `@Roles` line)*
6. Add `GET /reports/sales-by-staff` (sales per user, use `orders.created_by`) + a bar chart.
7. Add a Pusher event `customer-created` and show it in the dashboard live feed. *(see I9)*
8. Auto-suspend shops whose bill is 15 days overdue. *(new `@Cron`)*

---

# Part H — Common errors and fixes

| You see | Why | Fix |
|---|---|---|
| `Can not reach the server. Is the backend running?` | backend stopped | `cd backend && npm run start:dev` |
| backend: `ECONNREFUSED 5432` / `Connection refused` | PostgreSQL is not running | run the `pg_ctl ... start` command (Part A) |
| backend: `password authentication failed` | wrong `DB_PASSWORD` | fix `backend/.env` |
| `401 Unauthorized` everywhere | token gone/expired and refresh failed | log in again |
| `403 Your role "sales_staff" can not access this route` | `@Roles` on that route | correct — or change the `@Roles` |
| `400 ...` with a field message | the DTO rejected the body | read the message; check the DTO |
| `409 This record already exists` | unique column (email, SKU, phone) | use another value |
| `422 Not enough stock` / `Insufficient stock` | business rule | receive stock first |
| `429 Too Many Requests` | > 5 logins per minute | wait 1 minute |
| `Error: listen EADDRINUSE :::3000` | the backend is already running somewhere | close the other one, or `lsof -i :3000` |
| Top bar says **Realtime off** | no `NEXT_PUBLIC_PUSHER_KEY` | add keys, restart frontend |
| **Live** but nothing updates | channel permission failed | see I8 |
| New column not in DB | `DB_SYNC` is not `true` or backend not restarted | restart backend |
| Changed `.env`, nothing happens | `.env` is read only at start | restart backend / frontend |

---

# Part I — Pusher deep-dive: how realtime works

## I1. The problem Pusher solves

HTTP is **ask → answer**: the browser asks, the server answers. The server can **never** start talking by itself.
So if cashier A sells a Mango Juice, cashier B's screen has no idea — until B refreshes.

**Pusher** keeps an always-open connection (a **WebSocket**) from every browser to Pusher's servers.
Our backend tells Pusher "send this message", and Pusher pushes it down every open connection.

```
Without Pusher:  Screen B shows 40 … refreshes … 37   (manual)
With Pusher:     Screen B shows 40 → 37 by itself in < 1 second
```

## I2. The 4 words you must know

| Word | Meaning | In our app |
|---|---|---|
| **App** | your account's project on pusher.com, with keys | app_id `2204967`, cluster `ap1` |
| **Channel** | a "room". Browsers *subscribe* (join) to rooms | `private-tenant-<shopId>` (whole shop), `private-user-<userId>` (one person) |
| **Event** | a named message sent into a room | `stock-updated`, `order-created`, … |
| **Trigger / Bind** | backend **triggers** an event, frontend **binds** (listens) | `pusher.trigger(...)` / `channel.bind(...)` |

### The keys

| Key | Where | Secret? |
|---|---|---|
| `PUSHER_APP_ID` | backend `.env` | no |
| `PUSHER_KEY` / `NEXT_PUBLIC_PUSHER_KEY` | both | **no** — public, it's in the browser anyway |
| `PUSHER_SECRET` | **backend only** | **YES** — whoever has it can send fake events |
| `PUSHER_CLUSTER` | both, must be the same | no — `ap1` = Singapore server |

> `NEXT_PUBLIC_` at the start of a name = Next.js puts this value into the browser code.
> That's why the secret must **never** have `NEXT_PUBLIC_`.

## I3. Why "private-" channels

A public channel can be joined by anyone who knows its name. Shop IDs appear in URLs and responses,
so another shop could listen to your sales. A channel whose name starts with **`private-`** makes pusher-js
ask **our backend** for permission first — and our backend checks the JWT token.

## I4. The whole picture

```
 SCREEN A (POS)                BACKEND :3000                PUSHER CLOUD (ap1)          SCREEN B (Products)
 ──────────────                ─────────────                ──────────────────          ───────────────────
                                                                                        ① page opens: getPusher()
                                                            ◄────── WebSocket ────────  connects, gets socket_id
                                                                                        ② subscribe("private-tenant-X")
                               ③ POST /pusher/auth  ◄──────────────────────────────────  {socket_id, channel_name} + JWT
                                  checks: is X *my* shop?
                                  signs with SECRET
                                  200 {auth:"key:signature"} ─────────────────────────►
                                                            ◄── subscribe + signature ─  ④ joins the room ✔
 ⑤ Complete sale
   POST /orders ─────────────► ⑥ save order, stock 37→35
                               ⑦ pusher.trigger(
                                   "private-tenant-X",
                                   "stock-updated",
                                   {productId, currentStock:35}) ──► ⑧ finds everyone
                                                                       in that room ───► ⑨ bind("stock-updated")
                                                                                           callback runs:
                                                                                           setData(...) → 35 ✔
```

Steps ①–④ happen **once** when a page opens. Steps ⑤–⑨ happen on **every** sale.

## I5. Backend code, step by step

### Step 1 — connect to Pusher: [pusher/pusher.service.ts](../backend/src/pusher/pusher.service.ts)

```ts
const appId = this.configService.get<string>('PUSHER_APP_ID');
const key = this.configService.get<string>('PUSHER_KEY');
const secret = this.configService.get<string>('PUSHER_SECRET');
const cluster = this.configService.get<string>('PUSHER_CLUSTER') ?? 'ap2';

if (!appId || !key || !secret) {
  this.logger.warn('Pusher keys not found in .env -> realtime is OFF');
  return;                       // app still works, just no realtime
}
this.pusher = new Pusher({ appId, key, secret, cluster, useTLS: true });
```

`PusherModule` is `@Global()` ([pusher.module.ts](../backend/src/pusher/pusher.module.ts)), so any service can inject `PusherService`.

### Step 2 — names in ONE place (same file)

```ts
export const PUSHER_EVENTS = {
  ORDER_CREATED: 'order-created',
  ORDER_UPDATED: 'order-updated',
  STOCK_UPDATED: 'stock-updated',
  PAYMENT_RECEIVED: 'payment-received',
  NEW_NOTIFICATION: 'new-notification',
};

tenantChannel(tenantId: string) { return `private-tenant-${tenantId}`; }
userChannel(userId: string)     { return `private-user-${userId}`; }
```

### Step 3 — the send function (same file)

```ts
async trigger(channel: string, event: string, data: any) {
  if (!this.pusher) return;
  try {
    await this.pusher.trigger(channel, event, data);
  } catch (error) {
    this.logger.error(`Pusher trigger failed: ${error.message}`);
  }
}

sendToTenant(tenantId, event, data) { return this.trigger(this.tenantChannel(tenantId), event, data); }
sendToUser(userId, event, data)     { return this.trigger(this.userChannel(userId), event, data); }
```

Services call it with **`void`** in front: `void this.pusherService.sendToTenant(...)`.
`void` = "start it but don't wait". A slow or broken Pusher must **never** make a sale fail.

### Step 4 — send AFTER the transaction: [inventory/inventory.service.ts](../backend/src/inventory/inventory.service.ts) → `afterStockChange()`

```ts
for (const product of products) {
  const currentStock = stockMap[product.id] ?? 0;

  void this.pusherService.sendToTenant(
    tenantId,
    PUSHER_EVENTS.STOCK_UPDATED,
    { productId: product.id, productName: product.name, currentStock },
  );
  ...
}
```

Why **after** the transaction? If we sent inside it and the transaction then rolled back
("not enough stock"), screens would show a stock number that never really happened.

All the places that send events:

| Event | Sent in | Data |
|---|---|---|
| `stock-updated` | `inventory.service.ts` → `afterStockChange()` | productId, productName, currentStock |
| `order-created` | `orders.service.ts` → `create()` | id, orderNumber, total, createdAt |
| `order-updated` | `orders.service.ts` → `updateStatus()` and `cancel()` | id, orderNumber, status |
| `payment-received` | `payments.service.ts` → `create()` | orderId, orderNumber, amount, method |
| `new-notification` | `notifications.service.ts` → `notifyUser()` | the whole notification row |

### Step 5 — the permission door: [pusher/pusher.controller.ts](../backend/src/pusher/pusher.controller.ts)

```ts
@Post('auth')
@HttpCode(HttpStatus.OK)               // pusher-js only accepts 200 (see I8)
auth(@CurrentUser() user, @Body() body: { socket_id: string; channel_name: string }, @Res() res) {
  const allowedChannels = [
    this.pusherService.tenantChannel(user.tenantId),   // my shop
    this.pusherService.userChannel(user.id),           // me
  ];
  if (!allowedChannels.includes(body.channel_name)) {
    throw new ForbiddenException('You can not listen to this channel');
  }
  const authResponse = this.pusherService.authorizeChannel(body.socket_id, body.channel_name);
  res.status(HttpStatus.OK).send(authResponse);       // { auth: "key:signature" }
}
```

- `@CurrentUser()` works because the global `JwtAuthGuard` already checked the token.
- `authorizeChannel` makes a **signature** with the secret. Pusher's server checks it.
  Without the secret nobody can make a valid signature → nobody can join a room we didn't allow.
- We use `@Res()` and `res.send()` because pusher-js wants the raw `{ auth }` object,
  not our usual `{ statusCode, message, data }` wrapper.

## I6. Frontend code, step by step

### Step 1 — one connection for the whole app: [lib/pusher.ts](../frontend/src/lib/pusher.ts)

```ts
let pusher: Pusher | null = null;            // ONE connection (singleton)

export function getPusher(): Pusher | null {
  if (!PUSHER_KEY) return null;              // no key → realtime off
  if (pusher) return pusher;                 // already connected → reuse

  pusher = new Pusher(PUSHER_KEY, {
    cluster: PUSHER_CLUSTER,
    channelAuthorization: {
      endpoint: `${API_URL}/pusher/auth`,    // ← our backend door (I5 step 5)
      transport: "ajax",
      headersProvider: () => ({
        Authorization: `Bearer ${getAccessToken()}`,   // a function → always the newest token
      }),
    },
  });
  return pusher;
}
```

Same file: the same `PUSHER_EVENTS` list and `tenantChannel(user)` / `userChannel(user)`.
`disconnectPusher()` is called on logout ([AuthContext.tsx](../frontend/src/context/AuthContext.tsx)).

### Step 2 — a hook any page can use: [hooks/usePusherEvent.ts](../frontend/src/hooks/usePusherEvent.ts)

```ts
export function usePusherEvent<T>(channelName: string | null, eventName: string, callback: (data: T) => void) {
  const callbackRef = useRef(callback);
  useEffect(() => { callbackRef.current = callback; });      // always the newest callback

  useEffect(() => {
    const pusher = getPusher();
    if (!pusher || !channelName) return;

    const channel = pusher.subscribe(channelName);           // join (→ triggers /pusher/auth)
    const handler = (data: T) => callbackRef.current(data);
    channel.bind(eventName, handler);                         // listen

    return () => { channel.unbind(eventName, handler); };    // stop listening when page closes
  }, [channelName, eventName]);
}
```

- **`subscribe`** joins the room. Calling it twice for the same name is fine — pusher-js reuses it.
- **cleanup** (`return () => ...`) — without it, every time you open the page a new listener
  would be added and the code would run 2×, 3×, 4× per event.
- **`useRef` trick** — the callback changes on every render (it uses new state). Keeping it in a ref
  means we don't unsubscribe/resubscribe on every render.

### Step 3 — use it in a page: [app/(app)/products/page.tsx](../frontend/src/app/%28app%29/products/page.tsx)

```tsx
usePusherEvent(tenantChannel(user), PUSHER_EVENTS.STOCK_UPDATED, (event: { productId: string; currentStock: number }) => {
  setData((old) => {
    if (!old) return old;
    return {
      ...old,
      items: old.items.map((p) =>
        p.id === event.productId
          ? { ...p, currentStock: event.currentStock, isLowStock: event.currentStock <= p.reorderLevel }
          : p,
      ),
    };
  });
});
```

This changes only the one number in the table — no API call, no page reload.
Other pages use the simpler way: `usePusherEvent(channel, EVENT, () => reload())` → load the list again.

| Page / component | Listens to | Does |
|---|---|---|
| `products/page.tsx` | stock-updated | changes the number in place |
| `products/[id]/page.tsx` | stock-updated (this product only) | reloads |
| `pos/page.tsx` | stock-updated | reloads product cards |
| `inventory/page.tsx` | stock-updated | reloads tables |
| `orders/page.tsx` | order-created, order-updated | reloads list |
| `orders/[id]/page.tsx` | order-updated, payment-received (this order only) | reloads |
| `dashboard/page.tsx` | all 4 shop events | live activity feed + reloads cards and graphs |
| `reports/page.tsx` | order-created | reloads numbers + graphs |
| `components/NotificationBell.tsx` | new-notification (user channel) | adds to list, +1 badge, toast popup |
| `notifications/page.tsx` | new-notification | reloads |

### Step 4 — the "Live" dot: [hooks/usePusherStatus.ts](../frontend/src/hooks/usePusherStatus.ts)

`pusher.connection.state` is `connecting` → `connected` (green) → maybe `unavailable` (no internet).
`AppShell.tsx` shows it in the top bar.

## I7. Watch it happen (do this yourself!)

1. Open http://localhost:3001/products in **two** browser windows side by side.
2. In window 2 go to **New Sale (POS)**, sell 2 of any product.
3. Window 1 changes by itself.
4. Open **Pusher dashboard → your app → Debug console**: you see every `stock-updated` event with its data.
5. In the browser: DevTools (F12) → **Network** → filter `pusher/auth` → status must be **200**.
6. Extra: in DevTools Console type `localStorage` to see the saved token.
   Want Pusher to print everything? Add `Pusher.logToConsole = true;` at the top of `getPusher()` (remove it after).

## I8. Debugging checklist

| Symptom | Check |
|---|---|
| "Realtime off" | `frontend/.env.local` has `NEXT_PUBLIC_PUSHER_KEY`; restart `npm run dev` |
| stuck on "connecting" / "unavailable" | internet; cluster in `.env.local` = cluster of your Pusher app |
| backend log: "Pusher keys not found" | `backend/.env` PUSHER_* lines; restart backend |
| backend log: "Pusher trigger failed" | wrong app_id/secret, or different cluster |
| **Live**, but nothing updates | DevTools → Network → `pusher/auth` must be **200**. 403 = wrong channel name; 401 = token expired (log in again) |
| Pusher debug console shows the event, but the page doesn't change | event name typo — compare `PUSHER_EVENTS` in backend and frontend |
| the update runs twice | a listener without cleanup (always `return () => channel.unbind(...)`) |

> **Real bug we hit in this project:** `/pusher/auth` answered **201** (NestJS default for POST).
> pusher-js only accepts **200**, so it silently refused to join the room — status said "Live" but no updates came.
> The fix was `@HttpCode(HttpStatus.OK)` + `res.status(200)`. Lesson: when realtime "connects but
> nothing arrives", check the auth request first.

## I9. Add your own event (exercise)

Goal: when a customer is created, show "👤 New customer Karim" in the dashboard live feed.

1. **Backend — name it** in `pusher.service.ts`:
   `CUSTOMER_CREATED: 'customer-created',`
2. **Backend — send it** in `customers.service.ts` → `create()`, after saving
   (inject `PusherService` in the constructor first):
   ```ts
   void this.pusherService.sendToTenant(tenantId, PUSHER_EVENTS.CUSTOMER_CREATED, { name: customer.name });
   ```
3. **Frontend — same name** in `lib/pusher.ts`:
   `CUSTOMER_CREATED: "customer-created",`
4. **Frontend — listen** in `dashboard/page.tsx` next to the other `usePusherEvent` calls:
   ```tsx
   usePusherEvent(channel, PUSHER_EVENTS.CUSTOMER_CREATED, (data: { name: string }) => {
     addActivity(`👤 New customer ${data.name}`);
   });
   ```
5. Restart the backend, open the dashboard in one window, create a customer in another. 🎉

## I10. Free plan limits

Pusher's free "Sandbox" plan: 100 connections at the same time and 200,000 messages per day —
plenty for learning and a few shops. Each open browser tab = 1 connection.

---

*Keep this file updated when you add modules, so it stays your map.*
