// TypeScript "shapes" of the data our backend sends back.
// Money values come as strings like "110.00" (that's how PostgreSQL sends decimals).

export type Role =
  | "super_admin"
  | "business_admin" // Owner
  | "warehouse_manager" // Manager
  | "sales_staff"; // Staff

export type User = {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: Role;
  tenantId: string | null;
  tenantSlug?: string | null;
  companyName?: string | null;
  isActive?: boolean;
  createdAt?: string;
};

// lists with pagination look like this
export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export type Category = {
  id: string;
  name: string;
  parentId: string | null;
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  categoryId: string | null;
  categoryName: string | null;
  costPrice: string;
  sellingPrice: string;
  reorderLevel: number;
  unit: string;
  imageUrl: string | null;
  isActive: boolean;
  currentStock: number;
  isLowStock: boolean;
  createdAt: string;
};

export type LowStockProduct = {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  reorderLevel: number;
  shortage: number;
  sellingPrice: string;
};

export type Warehouse = {
  id: string;
  name: string;
  address: string | null;
  isDefault: boolean;
};

export type StockRow = {
  productId: string;
  productName: string;
  sku: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  reservedQty: number;
  available: number;
  reorderLevel: number;
  updatedAt: string;
};

export type Movement = {
  id: string;
  productId: string;
  productName: string;
  type: "IN" | "OUT" | "ADJUST" | "TRANSFER";
  quantity: number;
  reason: string | null;
  createdAt: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  balance: string;
  createdAt: string;
};

export type Supplier = {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
};

export type OrderStatus =
  | "draft"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

export type OrderListItem = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: string;
  paidAmount: string;
  customerName: string;
  createdAt: string;
};

export type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  discount: string;
  total: string;
};

export type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customer: Customer | null;
  items: OrderItem[];
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  paidAmount: string;
  balanceDue: string;
  notes: string | null;
  cancelReason: string | null;
  createdAt: string;
};

export type PaymentMethod = "cash" | "bkash" | "nagad" | "card" | "bank";

export type Payment = {
  id: string;
  amount: string;
  method: PaymentMethod;
  reference: string | null;
  paidAt: string;
};

export type PurchaseOrder = {
  id: string;
  poNumber: string;
  status: "draft" | "sent" | "received" | "cancelled";
  total: string;
  notes: string | null;
  supplier: Supplier;
  receivedAt: string | null;
  createdAt: string;
  items?: {
    id: string;
    productId: string;
    product: { name: string; sku: string };
    quantity: number;
    receivedQty: number;
    unitCost: string;
    total: string;
  }[];
};

export type AppNotification = {
  id: string;
  type: "LOW_STOCK" | "ORDER_CANCELLED" | "PAYMENT_RECEIVED" | "STOCK_RECEIVED";
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};
