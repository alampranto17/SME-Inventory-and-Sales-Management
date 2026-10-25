export enum OrderStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

// Which status can go to which status.
// Example: a "confirmed" order can only become "shipped".
// (cancel is done with POST /orders/:id/cancel)
export const ALLOWED_STATUS_CHANGES: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.DRAFT]: [OrderStatus.CONFIRMED],
  [OrderStatus.CONFIRMED]: [OrderStatus.SHIPPED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};
