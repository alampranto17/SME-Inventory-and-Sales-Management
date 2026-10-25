import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Order } from 'src/orders/entities/order.entity';
import { OrderItem } from 'src/orders/entities/orderItem.entity';
import { Inventory } from 'src/inventory/entities/inventory.entity';
import { PurchaseOrderItem } from 'src/purchase-orders/entities/purchaseOrderItem.entity';
import { OrderStatus } from 'src/orders/enums/orderStatus.enum';
import { InventoryService } from 'src/inventory/inventory.service';
import {
  DateRangeDto,
  SalesSummaryQueryDto,
  TopProductsQueryDto,
} from './dto/reportQuery.dto';
import {
  endOfDay,
  money,
  startOfDay,
  toDateString,
} from 'src/common/utils/helpers';

// In all reports:
//   revenue = sales after discount, WITHOUT tax  (subtotal - discount)
//   cogs    = "cost of goods sold" = cost price x quantity sold
//   profit  = revenue - cogs
// Cancelled orders are never counted.
@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Inventory)
    private readonly inventoryRepo: Repository<Inventory>,
    @InjectRepository(PurchaseOrderItem)
    private readonly poItemRepo: Repository<PurchaseOrderItem>,
    private readonly inventoryService: InventoryService,
  ) {}

  // ─────────────────────────────────────────────
  // GET /reports/sales-summary
  // ─────────────────────────────────────────────
  async salesSummary(tenantId: string, query: SalesSummaryQueryDto) {
    const groupBy = query.groupBy ?? 'day';
    const from = startOfDay(query.dateFrom);
    const to = endOfDay(query.dateTo);

    // DATE_TRUNC('day', date) -> cuts the time: 2026-06-01 14:22 -> 2026-06-01
    // (groupBy is safe to put in the SQL because the DTO only allows day/week/month)
    const period = `DATE_TRUNC('${groupBy}', o.created_at)`;

    // 1. orders + revenue per period
    const orderRows = await this.orderRepo
      .createQueryBuilder('o')
      .select(period, 'period')
      .addSelect('COUNT(o.id)', 'orderCount')
      .addSelect('SUM(o.subtotal - o.discount)', 'revenue')
      .where('o.tenantId = :tenantId', { tenantId })
      .andWhere('o.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .andWhere('o.createdAt BETWEEN :from AND :to', { from, to })
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany();

    // 2. cost per period (from order items)
    const costRows = await this.orderItemRepo
      .createQueryBuilder('i')
      .innerJoin('i.order', 'o')
      .select(period, 'period')
      .addSelect('SUM(i.costPrice * i.quantity)', 'cost')
      .where('o.tenantId = :tenantId', { tenantId })
      .andWhere('o.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .andWhere('o.createdAt BETWEEN :from AND :to', { from, to })
      .groupBy('period')
      .getRawMany();

    // 3. join the two lists in JavaScript
    let totalOrders = 0;
    let totalRevenue = 0;
    let totalProfit = 0;

    const summary = orderRows.map((row) => {
      const costRow = costRows.find(
        (c) => new Date(c.period).getTime() === new Date(row.period).getTime(),
      );
      const revenue = Number(row.revenue);
      const profit = revenue - Number(costRow?.cost ?? 0);

      totalOrders += Number(row.orderCount);
      totalRevenue += revenue;
      totalProfit += profit;

      return {
        date: toDateString(new Date(row.period)),
        orderCount: Number(row.orderCount),
        revenue: revenue.toFixed(2),
        profit: money(profit).toFixed(2),
      };
    });

    return {
      summary,
      totals: {
        orderCount: totalOrders,
        revenue: money(totalRevenue).toFixed(2),
        profit: money(totalProfit).toFixed(2),
      },
    };
  }

  // ─────────────────────────────────────────────
  // GET /reports/top-products
  // ─────────────────────────────────────────────
  async topProducts(tenantId: string, query: TopProductsQueryDto) {
    const rows = await this.orderItemRepo
      .createQueryBuilder('i')
      .innerJoin('i.order', 'o')
      .select('i.productId', 'productId')
      .addSelect('MAX(i.productName)', 'productName')
      .addSelect('SUM(i.quantity)', 'qtySold')
      .addSelect('SUM(i.total)', 'revenue')
      .where('o.tenantId = :tenantId', { tenantId })
      .andWhere('o.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .andWhere('o.createdAt BETWEEN :from AND :to', {
        from: startOfDay(query.dateFrom),
        to: endOfDay(query.dateTo),
      })
      .groupBy('i.productId')
      .orderBy('"qtySold"', 'DESC')
      .limit(query.limit ?? 10)
      .getRawMany();

    return rows.map((row, index) => ({
      rank: index + 1,
      productId: row.productId,
      productName: row.productName,
      qtySold: Number(row.qtySold),
      revenue: Number(row.revenue).toFixed(2),
    }));
  }

  // ─────────────────────────────────────────────
  // GET /reports/inventory-valuation
  // ─────────────────────────────────────────────
  async inventoryValuation(tenantId: string) {
    const rows = await this.inventoryRepo
      .createQueryBuilder('inv')
      .innerJoin('inv.product', 'p')
      .select('p.id', 'productId')
      .addSelect('p.name', 'productName')
      .addSelect('SUM(inv.quantity)', 'qty')
      .addSelect('SUM(inv.quantity) * p.costPrice', 'costValue')
      .addSelect('SUM(inv.quantity) * p.sellingPrice', 'retailValue')
      .where('inv.tenantId = :tenantId', { tenantId })
      .andWhere('p.isActive = true')
      .groupBy('p.id')
      .orderBy('p.name', 'ASC')
      .getRawMany();

    let totalCost = 0;
    let totalRetail = 0;

    const items = rows.map((row) => {
      totalCost += Number(row.costValue);
      totalRetail += Number(row.retailValue);

      return {
        productId: row.productId,
        productName: row.productName,
        qty: Number(row.qty),
        costValue: Number(row.costValue).toFixed(2),
        retailValue: Number(row.retailValue).toFixed(2),
      };
    });

    return {
      totalCostValue: money(totalCost).toFixed(2),
      totalRetailValue: money(totalRetail).toFixed(2),
      potentialProfit: money(totalRetail - totalCost).toFixed(2),
      items,
    };
  }

  // ─────────────────────────────────────────────
  // GET /reports/profit-loss
  // ─────────────────────────────────────────────
  async profitLoss(tenantId: string, query: DateRangeDto) {
    const from = startOfDay(query.dateFrom);
    const to = endOfDay(query.dateTo);

    const orderRow = await this.orderRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.subtotal - o.discount), 0)', 'revenue')
      .addSelect('COALESCE(SUM(o.tax), 0)', 'tax')
      .where('o.tenantId = :tenantId', { tenantId })
      .andWhere('o.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .andWhere('o.createdAt BETWEEN :from AND :to', { from, to })
      .getRawOne();

    const costRow = await this.orderItemRepo
      .createQueryBuilder('i')
      .innerJoin('i.order', 'o')
      .select('COALESCE(SUM(i.costPrice * i.quantity), 0)', 'cogs')
      .where('o.tenantId = :tenantId', { tenantId })
      .andWhere('o.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .andWhere('o.createdAt BETWEEN :from AND :to', { from, to })
      .getRawOne();

    const revenue = Number(orderRow.revenue);
    const cogs = Number(costRow.cogs);
    const grossProfit = revenue - cogs;
    // margin % = profit / revenue * 100  (avoid dividing by 0)
    const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    return {
      period: { from: query.dateFrom, to: query.dateTo },
      revenue: revenue.toFixed(2),
      cogs: cogs.toFixed(2),
      grossProfit: money(grossProfit).toFixed(2),
      margin: margin.toFixed(2),
      taxCollected: Number(orderRow.tax).toFixed(2),
    };
  }

  // ─────────────────────────────────────────────
  // GET /reports/low-stock-alert  (with last supplier, for re-ordering)
  // ─────────────────────────────────────────────
  async lowStockAlert(tenantId: string) {
    const lowStock = await this.inventoryService.findLowStock(tenantId);
    if (lowStock.length === 0) return [];

    // last purchase of each product -> who did we buy it from?
    const poItems = await this.poItemRepo.find({
      where: { productId: In(lowStock.map((p) => p.id)) },
      relations: { purchaseOrder: { supplier: true } },
      order: { purchaseOrder: { createdAt: 'DESC' } },
    });

    return lowStock.map((product) => {
      const lastPurchase = poItems.find(
        (item) =>
          item.productId === product.id &&
          item.purchaseOrder.tenantId === tenantId,
      );
      const supplier = lastPurchase?.purchaseOrder.supplier;

      return {
        ...product,
        lastSupplier: supplier
          ? { id: supplier.id, name: supplier.name, phone: supplier.phone }
          : null,
        lastUnitCost: lastPurchase?.unitCost ?? null,
      };
    });
  }
}
