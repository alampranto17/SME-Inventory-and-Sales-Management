export enum MovementType {
  IN = 'IN', // stock came in (purchase, order cancel)
  OUT = 'OUT', // stock went out (sale)
  ADJUST = 'ADJUST', // manual correction (damage, count mistake)
  TRANSFER = 'TRANSFER', // moved between warehouses
}
