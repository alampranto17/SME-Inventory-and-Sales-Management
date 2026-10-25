export enum PurchaseOrderStatus {
  DRAFT = 'draft', // just created
  SENT = 'sent', // sent to supplier
  RECEIVED = 'received', // goods arrived -> stock added
  CANCELLED = 'cancelled',
}
