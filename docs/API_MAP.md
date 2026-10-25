# API Map — where every endpoint lives

For each API endpoint, this file shows **which backend file** handles it and **which frontend file** calls it,
so you can find and change any part of the app on your own. Click a link to open the file at that line.

> Line numbers were correct when this file was written. If you add code above a method, its line moves —
> search for the **method name** instead (e.g. `findAll`).

## 1. How one request travels

```
Browser page (frontend/src/app/...)
   │  apiGet / apiPost / useFetch       ← frontend/src/lib/api.ts adds the token + base URL
   ▼
http://localhost:3000/api/v1/products
   ▼
main.ts  → guards check: logged in? (JwtAuthGuard)  right role? (RolesGuard)
   ▼
*.controller.ts   @Get / @Post ... + @Roles(...)    ← WHO can call it, which URL
   ▼  the body is checked by the DTO (dto/*.dto.ts) ← WHAT data is allowed
*.service.ts      the real work + database           ← HOW it works (business rules)
   ▼
entities/*.entity.ts  = the database table           ← WHAT is stored
   ▼
answer: { statusCode, message, data }  (common/interceptors/response.interceptor.ts)
```

## 2. "I want to change …" → open this file

| I want to … | Open |
|---|---|
| change **who** can use a route | the `@Roles(...)` line in the **controller** (role groups: [`common/constants/roles.constants.ts`](../backend/src/common/constants/roles.constants.ts)) |
| change a **validation rule** (required field, min length, password rule) | the **DTO** file of that module |
| change **what happens** (calculation, check, error message) | the **service** method |
| add a **column** to a table | the **entity** (with `DB_SYNC=true` the table updates itself on restart) |
| change the **error format** | [`common/filters/http-exception.filter.ts`](../backend/src/common/filters/http-exception.filter.ts) |
| change the **success format** `{statusCode, message, data}` | [`common/interceptors/response.interceptor.ts`](../backend/src/common/interceptors/response.interceptor.ts) |
| change the **API base URL** / token handling in the browser | [`lib/api.ts`](../frontend/src/lib/api.ts) and `frontend/.env.local` |
| change a **page** | `frontend/src/app/(app)/<page>/page.tsx` (see tables below) |
| change the **sidebar menu** | [`components/AppShell.tsx`](../frontend/src/components/AppShell.tsx) → `NAV_ITEMS` |
| change buttons, inputs, tables style | [`components/ui.tsx`](../frontend/src/components/ui.tsx) |
| change a **graph** | `frontend/src/components/charts/` |
| change TypeScript shapes of API data | [`lib/types.ts`](../frontend/src/lib/types.ts) |

### Example: add a new field `brand` to products

1. **Entity** – add the column: [`products/entities/product.entity.ts`](../backend/src/products/entities/product.entity.ts)
2. **DTO** – allow it in the request: [`products/dto/createProduct.dto.ts`](../backend/src/products/dto/createProduct.dto.ts) (update DTO copies it automatically)
3. **Service** – save it in `create()` and `update()`, and return it in `toResponse()`: [`products/products.service.ts`](../backend/src/products/products.service.ts)
4. **Frontend type** – add `brand` to `Product`: [`lib/types.ts`](../frontend/src/lib/types.ts)
5. **Frontend form + table** – [`components/ProductForm.tsx`](../frontend/src/components/ProductForm.tsx) and [`products/page.tsx`](../frontend/src/app/%28app%29/products/page.tsx)
6. Restart the backend → the new column is created in PostgreSQL.

### Example: add a brand-new endpoint

1. Write the logic as a method in the **service** (`async myThing(tenantId: string) { ... }`).
2. Add a route in the **controller**: `@Get('my-thing')` + `@Roles(...)` + call the service. Always pass `user.tenantId`.
3. If it takes a body, make a **DTO** class with `class-validator` decorators.
4. Frontend: `const { data } = useFetch("/module/my-thing")` or `await apiPost("/module/my-thing", body)`.

## 3. Roles

| Role in code | Shown as | Can do |
|---|---|---|
| `super_admin` | Super admin | Shops, owners, monthly billing. No shop data. |
| `business_admin` | Owner | Everything in his shop + Team + delete products + My Subscription |
| `warehouse_manager` | Manager | Products, stock, suppliers, purchase orders, reports |
| `sales_staff` | Staff | POS sales, customers, payments, viewing |

In the tables: **Manager+** = Owner or Manager. **All shop users** = Owner, Manager, Staff.

## 4. Every endpoint

All URLs start with `http://localhost:3000/api/v1`. Try them in Swagger: http://localhost:3000/api/docs

### Auth (login, tokens)

**Controller** [`auth/auth.controller.ts`](../backend/src/auth/auth.controller.ts) · **Service** [`auth/auth.service.ts`](../backend/src/auth/auth.service.ts) · **DTO** [`auth/dto/login.dto.ts`](../backend/src/auth/dto/login.dto.ts), [`auth/dto/register.dto.ts`](../backend/src/auth/dto/register.dto.ts) · **Table** [`users/entities/user.entity.ts`](../backend/src/users/entities/user.entity.ts)

| Method | URL | Who | Route (controller) | Logic (service) | Frontend calls it from |
|---|---|---|---|---|---|
| `POST` | `/auth/register/super-admin` | Public (2nd one needs secretKey) | [line 26](../backend/src/auth/auth.controller.ts#L26) | [`createAdmin()`](../backend/src/auth/auth.service.ts#L44) | — (not used in the UI yet) |
| `POST` | `/auth/login` | Public (5 per minute) | [line 37](../backend/src/auth/auth.controller.ts#L37) | [`userLogin()`](../backend/src/auth/auth.service.ts#L112) | [`context/AuthContext.tsx:46`](../frontend/src/context/AuthContext.tsx#L46) |
| `POST` | `/auth/refresh` | Refresh token in header | [line 47](../backend/src/auth/auth.controller.ts#L47) | [`refresh()`](../backend/src/auth/auth.service.ts#L145) | [`lib/api.ts:41`](../frontend/src/lib/api.ts#L41) (automatic when a token expires) |
| `GET` | `/auth/profile` | All shop users | [line 55](../backend/src/auth/auth.controller.ts#L55) | [`profile()`](../backend/src/auth/auth.service.ts#L167) | — (not used in the UI yet) |
| `POST` | `/auth/logout` | All shop users | [line 60](../backend/src/auth/auth.controller.ts#L60) | [`logout()`](../backend/src/auth/auth.service.ts#L175) | [`context/AuthContext.tsx:55`](../frontend/src/context/AuthContext.tsx#L55) |

- Token creation (expiry, what is inside the token): [`auth/auth.service.ts:183`](../backend/src/auth/auth.service.ts#L183) `generateTokens()`
- What `@CurrentUser()` returns: [`auth/strategies/jwt.strategies.ts`](../backend/src/auth/strategies/jwt.strategies.ts)
- Suspended-shop check: `checkShopIsActive()` in [`auth/auth.service.ts`](../backend/src/auth/auth.service.ts)
- `register()` (line 51) has no route on purpose; only the seed script uses it.

### Users / Team

**Controller** [`users/users.controller.ts`](../backend/src/users/users.controller.ts) · **Service** [`users/users.service.ts`](../backend/src/users/users.service.ts) · **DTO** [`users/dto/createUser.dto.ts`](../backend/src/users/dto/createUser.dto.ts), [`users/dto/updateUser.dto.ts`](../backend/src/users/dto/updateUser.dto.ts) · **Table** [`users/entities/user.entity.ts`](../backend/src/users/entities/user.entity.ts)

| Method | URL | Who | Route (controller) | Logic (service) | Frontend calls it from |
|---|---|---|---|---|---|
| `GET` | `/users` | Super admin, Owner | [line 24](../backend/src/users/users.controller.ts#L24) | [`findAll()`](../backend/src/users/users.service.ts#L65) | [`users/page.tsx:17`](../frontend/src/app/%28app%29/users/page.tsx#L17) |
| `POST` | `/users/create-buisness-Owner` | Super admin | [line 31](../backend/src/users/users.controller.ts#L31) | [`createOwner()`](../backend/src/users/users.service.ts#L92) | — (not used in the UI yet) |
| `POST` | `/users` | Owner | [line 38](../backend/src/users/users.controller.ts#L38) | [`createUser()`](../backend/src/users/users.service.ts#L116) | [`users/page.tsx:118`](../frontend/src/app/%28app%29/users/page.tsx#L118) |
| `PATCH` | `/users/:id` | Super admin, Owner | [line 44](../backend/src/users/users.controller.ts#L44) | [`updateUser()`](../backend/src/users/users.service.ts#L139) | [`users/page.tsx:24`](../frontend/src/app/%28app%29/users/page.tsx#L24) (active on/off)<br>[`users/page.tsx:34`](../frontend/src/app/%28app%29/users/page.tsx#L34) (role) |
| `DELETE` | `/users/:id` | Super admin, Owner | [line 54](../backend/src/users/users.controller.ts#L54) | [`deactivateUser()`](../backend/src/users/users.service.ts#L162) | — (not used in the UI yet) |

- Password rules: [`users/dto/createUser.dto.ts`](../backend/src/users/dto/createUser.dto.ts). Roles list: [`users/enums/userRole.enum.ts`](../backend/src/users/enums/userRole.enum.ts)

### Tenants / Shops (super admin)

**Controller** [`tenants/tenants.controller.ts`](../backend/src/tenants/tenants.controller.ts) · **Service** [`tenants/tenants.service.ts`](../backend/src/tenants/tenants.service.ts) · **DTO** [`tenants/dto/createShop.dto.ts`](../backend/src/tenants/dto/createShop.dto.ts), [`tenants/dto/createTenants.dto.ts`](../backend/src/tenants/dto/createTenants.dto.ts), [`tenants/dto/updateTenants.dto.ts`](../backend/src/tenants/dto/updateTenants.dto.ts) · **Table** [`tenants/entities/tenant.entity.ts`](../backend/src/tenants/entities/tenant.entity.ts)

| Method | URL | Who | Route (controller) | Logic (service) | Frontend calls it from |
|---|---|---|---|---|---|
| `POST` | `/tenants/create-with-owner` | Super admin | [line 29](../backend/src/tenants/tenants.controller.ts#L29) | [`createShopWithOwner()`](../backend/src/tenants/tenants.service.ts#L39) | [`tenants/page.tsx:174`](../frontend/src/app/%28app%29/tenants/page.tsx#L174) |
| `POST` | `/tenants/create` | Super admin | [line 23](../backend/src/tenants/tenants.controller.ts#L23) | [`createTenants()`](../backend/src/tenants/tenants.service.ts#L143) | — (not used in the UI yet) |
| `GET` | `/tenants` | Super admin | [line 34](../backend/src/tenants/tenants.controller.ts#L34) | [`findAllWithOwners()`](../backend/src/tenants/tenants.service.ts#L114) | [`tenants/page.tsx:31`](../frontend/src/app/%28app%29/tenants/page.tsx#L31) |
| `GET` | `/tenants/:slug` | Super admin | [line 38](../backend/src/tenants/tenants.controller.ts#L38) | [`findOne()`](../backend/src/tenants/tenants.service.ts#L164) | — (not used in the UI yet) |
| `PATCH` | `/tenants/:slug` | Super admin | [line 43](../backend/src/tenants/tenants.controller.ts#L43) | [`update()`](../backend/src/tenants/tenants.service.ts#L184) | [`tenants/page.tsx:48`](../frontend/src/app/%28app%29/tenants/page.tsx#L48) (Activate) |
| `POST` | `/tenants/:slug/suspend` | Super admin | [line 48](../backend/src/tenants/tenants.controller.ts#L48) | [`suspend()`](../backend/src/tenants/tenants.service.ts#L193) | [`tenants/page.tsx:39`](../frontend/src/app/%28app%29/tenants/page.tsx#L39) |
| `DELETE` | `/tenants/:slug` | Super admin | [line 53](../backend/src/tenants/tenants.controller.ts#L53) | [`delete()`](../backend/src/tenants/tenants.service.ts#L199) | — (not used in the UI yet) |

- `create-with-owner` saves shop + Main Warehouse + owner + first bill in one transaction.

### Billing plans (your original module)

**Controller** [`billing/billing.controller.ts`](../backend/src/billing/billing.controller.ts) · **Service** [`billing/billing.service.ts`](../backend/src/billing/billing.service.ts) · **DTO** [`billing/dto/changePlan.dto.ts`](../backend/src/billing/dto/changePlan.dto.ts), [`billing/dto/changeStatus.dto.ts`](../backend/src/billing/dto/changeStatus.dto.ts)

| Method | URL | Who | Route (controller) | Logic (service) | Frontend calls it from |
|---|---|---|---|---|---|
| `GET` | `/billing/plans` | Public | [line 15](../backend/src/billing/billing.controller.ts#L15) | [`getPlans()`](../backend/src/billing/billing.service.ts#L11) | — (not used in the UI yet) |
| `GET` | `/billing/:slug` | Own shop / Super admin | [line 21](../backend/src/billing/billing.controller.ts#L21) | [`getBilling()`](../backend/src/billing/billing.service.ts#L15) | — (not used in the UI yet) |
| `PATCH` | `/billing/:slug/change-plan` | Super admin, Owner | [line 28](../backend/src/billing/billing.controller.ts#L28) | [`changePlan()`](../backend/src/billing/billing.service.ts#L24) | — (not used in the UI yet) |
| `PATCH` | `/billing/:slug/change-status` | Super admin | [line 35](../backend/src/billing/billing.controller.ts#L35) | [`changeStatus()`](../backend/src/billing/billing.service.ts#L43) | — (not used in the UI yet) |

- **Plan prices** live in [`billing/constants/billing.constants.ts`](../backend/src/billing/constants/billing.constants.ts). Change a price there and new monthly bills use it.

### Monthly subscription bills

**Controller** [`billing/subscriptions.controller.ts`](../backend/src/billing/subscriptions.controller.ts) · **Service** [`billing/subscriptions.service.ts`](../backend/src/billing/subscriptions.service.ts) · **DTO** [`billing/dto/subscription.dto.ts`](../backend/src/billing/dto/subscription.dto.ts) · **Table** [`billing/entities/subscriptionInvoice.entity.ts`](../backend/src/billing/entities/subscriptionInvoice.entity.ts)

| Method | URL | Who | Route (controller) | Logic (service) | Frontend calls it from |
|---|---|---|---|---|---|
| `GET` | `/subscriptions/summary` | Super admin | [line 31](../backend/src/billing/subscriptions.controller.ts#L31) | [`summary()`](../backend/src/billing/subscriptions.service.ts#L101) | [`subscriptions/page.tsx:59`](../frontend/src/app/%28app%29/subscriptions/page.tsx#L59) |
| `GET` | `/subscriptions/invoices` | Super admin | [line 36](../backend/src/billing/subscriptions.controller.ts#L36) | [`findInvoices()`](../backend/src/billing/subscriptions.service.ts#L85) | [`subscriptions/page.tsx:60`](../frontend/src/app/%28app%29/subscriptions/page.tsx#L60) |
| `POST` | `/subscriptions/generate` | Super admin | [line 42](../backend/src/billing/subscriptions.controller.ts#L42) | [`generateBills()`](../backend/src/billing/subscriptions.service.ts#L42) | [`subscriptions/page.tsx:74`](../frontend/src/app/%28app%29/subscriptions/page.tsx#L74) |
| `PATCH` | `/subscriptions/invoices/:id/pay` | Super admin | [line 47](../backend/src/billing/subscriptions.controller.ts#L47) | [`markPaid()`](../backend/src/billing/subscriptions.service.ts#L155) | [`subscriptions/page.tsx:224`](../frontend/src/app/%28app%29/subscriptions/page.tsx#L224) |
| `PATCH` | `/subscriptions/invoices/:id/unpay` | Super admin | [line 52](../backend/src/billing/subscriptions.controller.ts#L52) | [`markUnpaid()`](../backend/src/billing/subscriptions.service.ts#L172) | [`subscriptions/page.tsx:85`](../frontend/src/app/%28app%29/subscriptions/page.tsx#L85) |
| `GET` | `/subscriptions/my` | Owner | [line 58](../backend/src/billing/subscriptions.controller.ts#L58) | [`myBills()`](../backend/src/billing/subscriptions.service.ts#L187) | [`my-subscription/page.tsx:29`](../frontend/src/app/%28app%29/my-subscription/page.tsx#L29) |

- Due date rule (10th, but at least 7 days): `dueDateOf()` in [`billing/billing.helpers.ts`](../backend/src/billing/billing.helpers.ts)
- Automatic bills on the 1st of each month: `monthlyBillingJob()` [`billing/subscriptions.service.ts:77`](../backend/src/billing/subscriptions.service.ts#L77)

### Categories

**Controller** [`categories/categories.controller.ts`](../backend/src/categories/categories.controller.ts) · **Service** [`categories/categories.service.ts`](../backend/src/categories/categories.service.ts) · **DTO** [`categories/dto/createCategory.dto.ts`](../backend/src/categories/dto/createCategory.dto.ts), [`categories/dto/updateCategory.dto.ts`](../backend/src/categories/dto/updateCategory.dto.ts) · **Table** [`categories/entities/category.entity.ts`](../backend/src/categories/entities/category.entity.ts)

| Method | URL | Who | Route (controller) | Logic (service) | Frontend calls it from |
|---|---|---|---|---|---|
| `GET` | `/categories` | All shop users | [line 29](../backend/src/categories/categories.controller.ts#L29) | [`findAll()`](../backend/src/categories/categories.service.ts#L15) | [`categories/page.tsx:16`](../frontend/src/app/%28app%29/categories/page.tsx#L16)<br>[`components/ProductForm.tsx:21`](../frontend/src/components/ProductForm.tsx#L21)<br>[`products/page.tsx:38`](../frontend/src/app/%28app%29/products/page.tsx#L38) |
| `POST` | `/categories` | Manager+ | [line 34](../backend/src/categories/categories.controller.ts#L34) | [`create()`](../backend/src/categories/categories.service.ts#L35) | [`categories/page.tsx:28`](../frontend/src/app/%28app%29/categories/page.tsx#L28) |
| `PATCH` | `/categories/:id` | Manager+ | [line 40](../backend/src/categories/categories.controller.ts#L40) | [`update()`](../backend/src/categories/categories.service.ts#L53) | — (not used in the UI yet) |
| `DELETE` | `/categories/:id` | Manager+ | [line 50](../backend/src/categories/categories.controller.ts#L50) | [`remove()`](../backend/src/categories/categories.service.ts#L69) | [`categories/page.tsx:42`](../frontend/src/app/%28app%29/categories/page.tsx#L42) |

### Products

**Controller** [`products/products.controller.ts`](../backend/src/products/products.controller.ts) · **Service** [`products/products.service.ts`](../backend/src/products/products.service.ts) · **DTO** [`products/dto/createProduct.dto.ts`](../backend/src/products/dto/createProduct.dto.ts), [`products/dto/updateProduct.dto.ts`](../backend/src/products/dto/updateProduct.dto.ts), [`products/dto/productQuery.dto.ts`](../backend/src/products/dto/productQuery.dto.ts) · **Table** [`products/entities/product.entity.ts`](../backend/src/products/entities/product.entity.ts)

| Method | URL | Who | Route (controller) | Logic (service) | Frontend calls it from |
|---|---|---|---|---|---|
| `GET` | `/products` | All shop users | [line 38](../backend/src/products/products.controller.ts#L38) | [`findAll()`](../backend/src/products/products.service.ts#L33) | [`products/page.tsx:32`](../frontend/src/app/%28app%29/products/page.tsx#L32)<br>[`pos/page.tsx:28`](../frontend/src/app/%28app%29/pos/page.tsx#L28)<br>[`dashboard/page.tsx:55`](../frontend/src/app/%28app%29/dashboard/page.tsx#L55)<br>[`inventory/page.tsx:184`](../frontend/src/app/%28app%29/inventory/page.tsx#L184)<br>[`purchase-orders/page.tsx:71`](../frontend/src/app/%28app%29/purchase-orders/page.tsx#L71) |
| `POST` | `/products` | Manager+ | [line 43](../backend/src/products/products.controller.ts#L43) | [`create()`](../backend/src/products/products.service.ts#L85) | [`components/ProductForm.tsx:83`](../frontend/src/components/ProductForm.tsx#L83) |
| `GET` | `/products/low-stock` | All shop users | [line 50](../backend/src/products/products.controller.ts#L50) | [`findLowStock()`](../backend/src/products/products.service.ts#L79) | [`dashboard/page.tsx:43`](../frontend/src/app/%28app%29/dashboard/page.tsx#L43) |
| `POST` | `/products/bulk-import` | Manager+ | [line 56](../backend/src/products/products.controller.ts#L56) | [`bulkImport()`](../backend/src/products/products.service.ts#L218) | [`products/page.tsx:178`](../frontend/src/app/%28app%29/products/page.tsx#L178) |
| `GET` | `/products/:id` | All shop users | [line 71](../backend/src/products/products.controller.ts#L71) | [`findOne()`](../backend/src/products/products.service.ts#L71) | [`products/[id]/page.tsx:29`](../frontend/src/app/%28app%29/products/[id]/page.tsx#L29) |
| `PATCH` | `/products/:id` | Manager+ | [line 79](../backend/src/products/products.controller.ts#L79) | [`update()`](../backend/src/products/products.service.ts#L135) | [`components/ProductForm.tsx:80`](../frontend/src/components/ProductForm.tsx#L80) |
| `POST` | `/products/:id/image` | Manager+ | [line 90](../backend/src/products/products.controller.ts#L90) | [`uploadImage()`](../backend/src/products/products.service.ts#L178) | [`lib/uploadImage.ts:10`](../frontend/src/lib/uploadImage.ts#L10) (called by ProductForm + product page) |
| `DELETE` | `/products/:id/image` | Manager+ | [line 101](../backend/src/products/products.controller.ts#L101) | [`removeImage()`](../backend/src/products/products.service.ts#L207) | [`products/[id]/page.tsx:62`](../frontend/src/app/%28app%29/products/[id]/page.tsx#L62) |
| `DELETE` | `/products/:id` | Owner | [line 110](../backend/src/products/products.controller.ts#L110) | [`remove()`](../backend/src/products/products.service.ts#L169) | [`products/[id]/page.tsx:72`](../frontend/src/app/%28app%29/products/[id]/page.tsx#L72) |

- Photo rules (folder, file types, 5 MB): [`products/productImage.upload.ts`](../backend/src/products/productImage.upload.ts)
- The shape of a product in every response: `toResponse()` at the bottom of [`products/products.service.ts`](../backend/src/products/products.service.ts)
- Showing photos in the frontend: [`components/ProductImage.tsx`](../frontend/src/components/ProductImage.tsx)

### Inventory + Warehouses

**Controller** [`inventory/inventory.controller.ts`](../backend/src/inventory/inventory.controller.ts) · **Service** [`inventory/inventory.service.ts`](../backend/src/inventory/inventory.service.ts) · **DTO** [`inventory/dto/inventory.dto.ts`](../backend/src/inventory/dto/inventory.dto.ts) · **Table** [`inventory/entities/inventory.entity.ts`](../backend/src/inventory/entities/inventory.entity.ts), [`inventory/entities/stockMovement.entity.ts`](../backend/src/inventory/entities/stockMovement.entity.ts), [`inventory/entities/warehouse.entity.ts`](../backend/src/inventory/entities/warehouse.entity.ts)

| Method | URL | Who | Route (controller) | Logic (service) | Frontend calls it from |
|---|---|---|---|---|---|
| `GET` | `/inventory` | All shop users | [line 32](../backend/src/inventory/inventory.controller.ts#L32) | [`findAll()`](../backend/src/inventory/inventory.service.ts#L173) | [`inventory/page.tsx:29`](../frontend/src/app/%28app%29/inventory/page.tsx#L29) |
| `GET` | `/inventory/movements` | All shop users | [line 39](../backend/src/inventory/inventory.controller.ts#L39) | [`findMovements()`](../backend/src/inventory/inventory.service.ts#L205) | [`inventory/page.tsx:31`](../frontend/src/app/%28app%29/inventory/page.tsx#L31)<br>[`products/[id]/page.tsx:31`](../frontend/src/app/%28app%29/products/[id]/page.tsx#L31) |
| `GET` | `/inventory/:productId` | All shop users | [line 47](../backend/src/inventory/inventory.controller.ts#L47) | [`findByProduct()`](../backend/src/inventory/inventory.service.ts#L184) | [`products/[id]/page.tsx:30`](../frontend/src/app/%28app%29/products/[id]/page.tsx#L30) |
| `POST` | `/inventory/adjust` | Manager+ | [line 55](../backend/src/inventory/inventory.controller.ts#L55) | [`adjust()`](../backend/src/inventory/inventory.service.ts#L285) | [`inventory/page.tsx:212`](../frontend/src/app/%28app%29/inventory/page.tsx#L212) |
| `POST` | `/inventory/receive` | Manager+ | [line 62](../backend/src/inventory/inventory.controller.ts#L62) | [`receive()`](../backend/src/inventory/inventory.service.ts#L318) | [`inventory/page.tsx:212`](../frontend/src/app/%28app%29/inventory/page.tsx#L212) |
| `POST` | `/inventory/transfer` | Manager+ | [line 69](../backend/src/inventory/inventory.controller.ts#L69) | [`transfer()`](../backend/src/inventory/inventory.service.ts#L351) | [`inventory/page.tsx:203`](../frontend/src/app/%28app%29/inventory/page.tsx#L203) |
| `GET` | `/warehouses` | All shop users | [line 17](../backend/src/inventory/warehouses.controller.ts#L17) | [`findAllWarehouses()`](../backend/src/inventory/inventory.service.ts#L405) | [`inventory/page.tsx:30`](../frontend/src/app/%28app%29/inventory/page.tsx#L30) |
| `POST` | `/warehouses` | Manager+ | [line 22](../backend/src/inventory/warehouses.controller.ts#L22) | [`createWarehouse()`](../backend/src/inventory/inventory.service.ts#L412) | [`inventory/page.tsx:277`](../frontend/src/app/%28app%29/inventory/page.tsx#L277) |

- **Every stock change goes through `changeStock()`** [`inventory/inventory.service.ts:55`](../backend/src/inventory/inventory.service.ts#L55) (sales, cancel, purchase orders, adjust, transfer).
- Live stock update + low-stock alert after a change: `afterStockChange()` [`inventory/inventory.service.ts:114`](../backend/src/inventory/inventory.service.ts#L114)
- Warehouse routes are in [`inventory/warehouses.controller.ts`](../backend/src/inventory/warehouses.controller.ts) (GET line 17, POST line 22).
- Nightly 2 AM low-stock email: [`inventory/lowStock.cron.ts`](../backend/src/inventory/lowStock.cron.ts)

### Orders (sales / POS)

**Controller** [`orders/orders.controller.ts`](../backend/src/orders/orders.controller.ts) · **Service** [`orders/orders.service.ts`](../backend/src/orders/orders.service.ts) · **DTO** [`orders/dto/order.dto.ts`](../backend/src/orders/dto/order.dto.ts) · **Table** [`orders/entities/order.entity.ts`](../backend/src/orders/entities/order.entity.ts), [`orders/entities/orderItem.entity.ts`](../backend/src/orders/entities/orderItem.entity.ts)

| Method | URL | Who | Route (controller) | Logic (service) | Frontend calls it from |
|---|---|---|---|---|---|
| `GET` | `/orders` | All shop users | [line 39](../backend/src/orders/orders.controller.ts#L39) | [`findAll()`](../backend/src/orders/orders.service.ts#L189) | [`orders/page.tsx:25`](../frontend/src/app/%28app%29/orders/page.tsx#L25)<br>[`dashboard/page.tsx:44`](../frontend/src/app/%28app%29/dashboard/page.tsx#L44)<br>[`customers/[id]/page.tsx:26`](../frontend/src/app/%28app%29/customers/[id]/page.tsx#L26) |
| `POST` | `/orders` | All shop users | [line 45](../backend/src/orders/orders.controller.ts#L45) | [`create()`](../backend/src/orders/orders.service.ts#L51) | [`pos/page.tsx:75`](../frontend/src/app/%28app%29/pos/page.tsx#L75) |
| `GET` | `/orders/today-summary` | Manager+ | [line 50](../backend/src/orders/orders.controller.ts#L50) | [`todaySummary()`](../backend/src/orders/orders.service.ts#L238) | [`dashboard/page.tsx:42`](../frontend/src/app/%28app%29/dashboard/page.tsx#L42) |
| `GET` | `/orders/:id` | All shop users | [line 56](../backend/src/orders/orders.controller.ts#L56) | [`findOne()`](../backend/src/orders/orders.service.ts#L275) | [`orders/[id]/page.tsx:39`](../frontend/src/app/%28app%29/orders/[id]/page.tsx#L39) |
| `PATCH` | `/orders/:id/status` | Manager+ | [line 64](../backend/src/orders/orders.controller.ts#L64) | [`updateStatus()`](../backend/src/orders/orders.service.ts#L293) | [`orders/[id]/page.tsx:62`](../frontend/src/app/%28app%29/orders/[id]/page.tsx#L62) |
| `POST` | `/orders/:id/cancel` | Manager+ | [line 74](../backend/src/orders/orders.controller.ts#L74) | [`cancel()`](../backend/src/orders/orders.service.ts#L328) | [`orders/[id]/page.tsx:252`](../frontend/src/app/%28app%29/orders/[id]/page.tsx#L252) |
| `GET` | `/orders/:id/invoice` | All shop users | [line 86](../backend/src/orders/orders.controller.ts#L86) | [`createInvoicePdf()`](../backend/src/orders/invoice.service.ts#L18) | [`orders/[id]/page.tsx:72`](../frontend/src/app/%28app%29/orders/[id]/page.tsx#L72) |

- Allowed status changes (confirmed → shipped → delivered): [`orders/enums/orderStatus.enum.ts`](../backend/src/orders/enums/orderStatus.enum.ts)
- PDF invoice layout: [`orders/invoice.service.ts`](../backend/src/orders/invoice.service.ts)

### Customers

**Controller** [`customers/customers.controller.ts`](../backend/src/customers/customers.controller.ts) · **Service** [`customers/customers.service.ts`](../backend/src/customers/customers.service.ts) · **DTO** [`customers/dto/customer.dto.ts`](../backend/src/customers/dto/customer.dto.ts) · **Table** [`customers/entities/customer.entity.ts`](../backend/src/customers/entities/customer.entity.ts)

| Method | URL | Who | Route (controller) | Logic (service) | Frontend calls it from |
|---|---|---|---|---|---|
| `GET` | `/customers` | All shop users | [line 30](../backend/src/customers/customers.controller.ts#L30) | [`findAll()`](../backend/src/customers/customers.service.ts#L26) | [`customers/page.tsx:21`](../frontend/src/app/%28app%29/customers/page.tsx#L21)<br>[`pos/page.tsx:29`](../frontend/src/app/%28app%29/pos/page.tsx#L29) |
| `POST` | `/customers` | All shop users | [line 35](../backend/src/customers/customers.controller.ts#L35) | [`create()`](../backend/src/customers/customers.service.ts#L60) | [`customers/page.tsx:95`](../frontend/src/app/%28app%29/customers/page.tsx#L95) |
| `GET` | `/customers/:id/ledger` | Manager+ | [line 40](../backend/src/customers/customers.controller.ts#L40) | [`ledger()`](../backend/src/customers/customers.service.ts#L91) | [`customers/[id]/page.tsx:28`](../frontend/src/app/%28app%29/customers/[id]/page.tsx#L28) |
| `GET` | `/customers/:id` | All shop users | [line 49](../backend/src/customers/customers.controller.ts#L49) | [`findOne()`](../backend/src/customers/customers.service.ts#L48) | [`customers/[id]/page.tsx:25`](../frontend/src/app/%28app%29/customers/[id]/page.tsx#L25) |
| `PATCH` | `/customers/:id` | All shop users | [line 57](../backend/src/customers/customers.controller.ts#L57) | [`update()`](../backend/src/customers/customers.service.ts#L76) | — (not used in the UI yet) |

- Customer balance (+ on sale, - on payment): `changeBalance()` [`customers/customers.service.ts:137`](../backend/src/customers/customers.service.ts#L137)

### Suppliers

**Controller** [`suppliers/suppliers.controller.ts`](../backend/src/suppliers/suppliers.controller.ts) · **Service** [`suppliers/suppliers.service.ts`](../backend/src/suppliers/suppliers.service.ts) · **DTO** [`suppliers/dto/supplier.dto.ts`](../backend/src/suppliers/dto/supplier.dto.ts) · **Table** [`suppliers/entities/supplier.entity.ts`](../backend/src/suppliers/entities/supplier.entity.ts)

| Method | URL | Who | Route (controller) | Logic (service) | Frontend calls it from |
|---|---|---|---|---|---|
| `GET` | `/suppliers` | All shop users | [line 26](../backend/src/suppliers/suppliers.controller.ts#L26) | [`findAll()`](../backend/src/suppliers/suppliers.service.ts#L14) | [`suppliers/page.tsx:16`](../frontend/src/app/%28app%29/suppliers/page.tsx#L16)<br>[`purchase-orders/page.tsx:70`](../frontend/src/app/%28app%29/purchase-orders/page.tsx#L70) |
| `POST` | `/suppliers` | Manager+ | [line 31](../backend/src/suppliers/suppliers.controller.ts#L31) | [`create()`](../backend/src/suppliers/suppliers.service.ts#L33) | [`suppliers/page.tsx:89`](../frontend/src/app/%28app%29/suppliers/page.tsx#L89) |
| `GET` | `/suppliers/:id` | All shop users | [line 37](../backend/src/suppliers/suppliers.controller.ts#L37) | [`findOne()`](../backend/src/suppliers/suppliers.service.ts#L21) | — (not used in the UI yet) |
| `PATCH` | `/suppliers/:id` | Manager+ | [line 45](../backend/src/suppliers/suppliers.controller.ts#L45) | [`update()`](../backend/src/suppliers/suppliers.service.ts#L41) | — (not used in the UI yet) |
| `DELETE` | `/suppliers/:id` | Manager+ | [line 55](../backend/src/suppliers/suppliers.controller.ts#L55) | [`remove()`](../backend/src/suppliers/suppliers.service.ts#L50) | [`suppliers/page.tsx:21`](../frontend/src/app/%28app%29/suppliers/page.tsx#L21) |

### Purchase orders (buying stock)

**Controller** [`purchase-orders/purchase-orders.controller.ts`](../backend/src/purchase-orders/purchase-orders.controller.ts) · **Service** [`purchase-orders/purchase-orders.service.ts`](../backend/src/purchase-orders/purchase-orders.service.ts) · **DTO** [`purchase-orders/dto/purchaseOrder.dto.ts`](../backend/src/purchase-orders/dto/purchaseOrder.dto.ts) · **Table** [`purchase-orders/entities/purchaseOrder.entity.ts`](../backend/src/purchase-orders/entities/purchaseOrder.entity.ts), [`purchase-orders/entities/purchaseOrderItem.entity.ts`](../backend/src/purchase-orders/entities/purchaseOrderItem.entity.ts)

| Method | URL | Who | Route (controller) | Logic (service) | Frontend calls it from |
|---|---|---|---|---|---|
| `GET` | `/purchase-orders` | Manager+ | [line 30](../backend/src/purchase-orders/purchase-orders.controller.ts#L30) | [`findAll()`](../backend/src/purchase-orders/purchase-orders.service.ts#L39) | [`purchase-orders/page.tsx:15`](../frontend/src/app/%28app%29/purchase-orders/page.tsx#L15) |
| `POST` | `/purchase-orders` | Manager+ | [line 35](../backend/src/purchase-orders/purchase-orders.controller.ts#L35) | [`create()`](../backend/src/purchase-orders/purchase-orders.service.ts#L68) | [`purchase-orders/page.tsx:88`](../frontend/src/app/%28app%29/purchase-orders/page.tsx#L88) |
| `GET` | `/purchase-orders/:id` | Manager+ | [line 40](../backend/src/purchase-orders/purchase-orders.controller.ts#L40) | [`findOne()`](../backend/src/purchase-orders/purchase-orders.service.ts#L54) | [`purchase-orders/[id]/page.tsx:17`](../frontend/src/app/%28app%29/purchase-orders/[id]/page.tsx#L17) |
| `PATCH` | `/purchase-orders/:id/send` | Manager+ | [line 48](../backend/src/purchase-orders/purchase-orders.controller.ts#L48) | [`markSent()`](../backend/src/purchase-orders/purchase-orders.service.ts#L130) | [`purchase-orders/[id]/page.tsx:55`](../frontend/src/app/%28app%29/purchase-orders/[id]/page.tsx#L55) |
| `PATCH` | `/purchase-orders/:id/receive` | Manager+ | [line 56](../backend/src/purchase-orders/purchase-orders.controller.ts#L56) | [`receive()`](../backend/src/purchase-orders/purchase-orders.service.ts#L142) | [`purchase-orders/[id]/page.tsx:43`](../frontend/src/app/%28app%29/purchase-orders/[id]/page.tsx#L43) |
| `POST` | `/purchase-orders/:id/cancel` | Manager+ | [line 65](../backend/src/purchase-orders/purchase-orders.controller.ts#L65) | [`cancel()`](../backend/src/purchase-orders/purchase-orders.service.ts#L209) | [`purchase-orders/[id]/page.tsx:59`](../frontend/src/app/%28app%29/purchase-orders/[id]/page.tsx#L59) |

### Payments (customer pays a sale)

**Controller** [`payments/payments.controller.ts`](../backend/src/payments/payments.controller.ts) · **Service** [`payments/payments.service.ts`](../backend/src/payments/payments.service.ts) · **DTO** [`payments/dto/createPayment.dto.ts`](../backend/src/payments/dto/createPayment.dto.ts) · **Table** [`payments/entities/payment.entity.ts`](../backend/src/payments/entities/payment.entity.ts)

| Method | URL | Who | Route (controller) | Logic (service) | Frontend calls it from |
|---|---|---|---|---|---|
| `GET` | `/payments` | All shop users | [line 23](../backend/src/payments/payments.controller.ts#L23) | [`findAll()`](../backend/src/payments/payments.service.ts#L137) | — (not used in the UI yet) |
| `POST` | `/payments` | All shop users | [line 28](../backend/src/payments/payments.controller.ts#L28) | [`create()`](../backend/src/payments/payments.service.ts#L34) | [`orders/[id]/page.tsx:210`](../frontend/src/app/%28app%29/orders/[id]/page.tsx#L210) |
| `GET` | `/payments/by-order/:orderId` | All shop users | [line 33](../backend/src/payments/payments.controller.ts#L33) | [`findByOrder()`](../backend/src/payments/payments.service.ts#L115) | [`orders/[id]/page.tsx:40`](../frontend/src/app/%28app%29/orders/[id]/page.tsx#L40) |

### Reports

**Controller** [`reports/reports.controller.ts`](../backend/src/reports/reports.controller.ts) · **Service** [`reports/reports.service.ts`](../backend/src/reports/reports.service.ts) · **DTO** [`reports/dto/reportQuery.dto.ts`](../backend/src/reports/dto/reportQuery.dto.ts)

| Method | URL | Who | Route (controller) | Logic (service) | Frontend calls it from |
|---|---|---|---|---|---|
| `GET` | `/reports/sales-summary` | Manager+ | [line 21](../backend/src/reports/reports.controller.ts#L21) | [`salesSummary()`](../backend/src/reports/reports.service.ts#L44) | [`reports/page.tsx:57`](../frontend/src/app/%28app%29/reports/page.tsx#L57)<br>[`dashboard/page.tsx:47`](../frontend/src/app/%28app%29/dashboard/page.tsx#L47) |
| `GET` | `/reports/top-products` | Manager+ | [line 29](../backend/src/reports/reports.controller.ts#L29) | [`topProducts()`](../backend/src/reports/reports.service.ts#L115) | [`reports/page.tsx:59`](../frontend/src/app/%28app%29/reports/page.tsx#L59)<br>[`dashboard/page.tsx:51`](../frontend/src/app/%28app%29/dashboard/page.tsx#L51) |
| `GET` | `/reports/inventory-valuation` | Manager+ | [line 37](../backend/src/reports/reports.controller.ts#L37) | [`inventoryValuation()`](../backend/src/reports/reports.service.ts#L146) | [`reports/page.tsx:60`](../frontend/src/app/%28app%29/reports/page.tsx#L60) |
| `GET` | `/reports/profit-loss` | Manager+ | [line 42](../backend/src/reports/reports.controller.ts#L42) | [`profitLoss()`](../backend/src/reports/reports.service.ts#L188) | [`reports/page.tsx:58`](../frontend/src/app/%28app%29/reports/page.tsx#L58) |
| `GET` | `/reports/low-stock-alert` | All shop users | [line 48](../backend/src/reports/reports.controller.ts#L48) | [`lowStockAlert()`](../backend/src/reports/reports.service.ts#L229) | [`reports/page.tsx:61`](../frontend/src/app/%28app%29/reports/page.tsx#L61) |

- How revenue / profit is calculated is written at the top of [`reports/reports.service.ts`](../backend/src/reports/reports.service.ts)

### Notifications

**Controller** [`notifications/notifications.controller.ts`](../backend/src/notifications/notifications.controller.ts) · **Service** [`notifications/notifications.service.ts`](../backend/src/notifications/notifications.service.ts) · **DTO** [`notifications/dto/notificationQuery.dto.ts`](../backend/src/notifications/dto/notificationQuery.dto.ts) · **Table** [`notifications/entities/notification.entity.ts`](../backend/src/notifications/entities/notification.entity.ts)

| Method | URL | Who | Route (controller) | Logic (service) | Frontend calls it from |
|---|---|---|---|---|---|
| `GET` | `/notifications` | All shop users | [line 14](../backend/src/notifications/notifications.controller.ts#L14) | [`findMine()`](../backend/src/notifications/notifications.service.ts#L97) | [`components/NotificationBell.tsx:29`](../frontend/src/components/NotificationBell.tsx#L29)<br>[`notifications/page.tsx:17`](../frontend/src/app/%28app%29/notifications/page.tsx#L17) |
| `PATCH` | `/notifications/read-all` | All shop users | [line 20](../backend/src/notifications/notifications.controller.ts#L20) | [`markAllRead()`](../backend/src/notifications/notifications.service.ts#L134) | [`components/NotificationBell.tsx:66`](../frontend/src/components/NotificationBell.tsx#L66)<br>[`notifications/page.tsx:31`](../frontend/src/app/%28app%29/notifications/page.tsx#L31) |
| `PATCH` | `/notifications/:id/read` | All shop users | [line 25](../backend/src/notifications/notifications.controller.ts#L25) | [`markRead()`](../backend/src/notifications/notifications.service.ts#L115) | [`components/NotificationBell.tsx:54`](../frontend/src/components/NotificationBell.tsx#L54)<br>[`notifications/page.tsx:26`](../frontend/src/app/%28app%29/notifications/page.tsx#L26) |

- Emails: [`notifications/mail.service.ts`](../backend/src/notifications/mail.service.ts) (set `MAIL_HOST` in `.env` to really send them)

### Pusher (realtime)

**Controller** [`pusher/pusher.controller.ts`](../backend/src/pusher/pusher.controller.ts) · **Service** [`pusher/pusher.service.ts`](../backend/src/pusher/pusher.service.ts)

| Method | URL | Who | Route (controller) | Logic (service) | Frontend calls it from |
|---|---|---|---|---|---|
| `POST` | `/pusher/auth` | All shop users | [line 23](../backend/src/pusher/pusher.controller.ts#L23) | [`authorizeChannel()`](../backend/src/pusher/pusher.service.ts#L86) | [`lib/pusher.ts:59`](../frontend/src/lib/pusher.ts#L59) (pusher-js calls it automatically) |

## 5. Realtime events (Pusher)

| Event | Sent from (backend) | Channel | Listened to in (frontend) |
|---|---|---|---|
| `order-created` | [`orders/orders.service.ts:173`](../backend/src/orders/orders.service.ts#L173) | shop | dashboard, orders list, reports |
| `order-updated` | [`orders/orders.service.ts:313`](../backend/src/orders/orders.service.ts#L313) (status), [`orders/orders.service.ts:386`](../backend/src/orders/orders.service.ts#L386) (cancel) | shop | dashboard, orders list, order page |
| `stock-updated` | [`inventory/inventory.service.ts:127`](../backend/src/inventory/inventory.service.ts#L127) | shop | products list + product page, POS, inventory, dashboard |
| `payment-received` | [`payments/payments.service.ts:92`](../backend/src/payments/payments.service.ts#L92) | shop | dashboard, order page |
| `new-notification` | [`notifications/notifications.service.ts:48`](../backend/src/notifications/notifications.service.ts#L48) | one user | [`components/NotificationBell.tsx`](../frontend/src/components/NotificationBell.tsx), notifications page |

- Event names (keep both lists the same!): backend [`pusher/pusher.service.ts`](../backend/src/pusher/pusher.service.ts) `PUSHER_EVENTS`, frontend [`lib/pusher.ts`](../frontend/src/lib/pusher.ts) `PUSHER_EVENTS`
- Listening in a page: `usePusherEvent(channel, EVENT, (data) => {...})` from [`hooks/usePusherEvent.ts`](../frontend/src/hooks/usePusherEvent.ts)
- Who may join which channel: [`pusher/pusher.controller.ts`](../backend/src/pusher/pusher.controller.ts)
- Keys: `backend/.env` (PUSHER_*) and `frontend/.env.local` (NEXT_PUBLIC_PUSHER_*)

## 6. Frontend pages → file

| URL in browser | File |
|---|---|
| `/login` | [`app/login/page.tsx`](../frontend/src/app/login/page.tsx) |
| `/dashboard` | [`dashboard/page.tsx`](../frontend/src/app/%28app%29/dashboard/page.tsx) |
| `/pos` | [`pos/page.tsx`](../frontend/src/app/%28app%29/pos/page.tsx) |
| `/orders` | [`orders/page.tsx`](../frontend/src/app/%28app%29/orders/page.tsx) |
| `/orders/:id` | [`orders/[id]/page.tsx`](../frontend/src/app/%28app%29/orders/[id]/page.tsx) |
| `/products` | [`products/page.tsx`](../frontend/src/app/%28app%29/products/page.tsx) |
| `/products/:id` | [`products/[id]/page.tsx`](../frontend/src/app/%28app%29/products/[id]/page.tsx) |
| `/categories` | [`categories/page.tsx`](../frontend/src/app/%28app%29/categories/page.tsx) |
| `/inventory` | [`inventory/page.tsx`](../frontend/src/app/%28app%29/inventory/page.tsx) |
| `/customers` | [`customers/page.tsx`](../frontend/src/app/%28app%29/customers/page.tsx) |
| `/customers/:id` | [`customers/[id]/page.tsx`](../frontend/src/app/%28app%29/customers/[id]/page.tsx) |
| `/suppliers` | [`suppliers/page.tsx`](../frontend/src/app/%28app%29/suppliers/page.tsx) |
| `/purchase-orders` | [`purchase-orders/page.tsx`](../frontend/src/app/%28app%29/purchase-orders/page.tsx) |
| `/purchase-orders/:id` | [`purchase-orders/[id]/page.tsx`](../frontend/src/app/%28app%29/purchase-orders/[id]/page.tsx) |
| `/reports` | [`reports/page.tsx`](../frontend/src/app/%28app%29/reports/page.tsx) |
| `/users (Team)` | [`users/page.tsx`](../frontend/src/app/%28app%29/users/page.tsx) |
| `/my-subscription` | [`my-subscription/page.tsx`](../frontend/src/app/%28app%29/my-subscription/page.tsx) |
| `/notifications` | [`notifications/page.tsx`](../frontend/src/app/%28app%29/notifications/page.tsx) |
| `/tenants (Shops)` | [`tenants/page.tsx`](../frontend/src/app/%28app%29/tenants/page.tsx) |
| `/subscriptions (Billing)` | [`subscriptions/page.tsx`](../frontend/src/app/%28app%29/subscriptions/page.tsx) |

Shared frontend pieces: [`lib/api.ts`](../frontend/src/lib/api.ts), [`hooks/useFetch.ts`](../frontend/src/hooks/useFetch.ts), [`context/AuthContext.tsx`](../frontend/src/context/AuthContext.tsx), [`components/AppShell.tsx`](../frontend/src/components/AppShell.tsx), [`components/ui.tsx`](../frontend/src/components/ui.tsx)
