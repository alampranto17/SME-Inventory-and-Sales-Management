import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/orderItem.entity';
import { Product } from 'src/products/entities/product.entity';
import { ALLOWED_STATUS_CHANGES, OrderStatus } from './enums/orderStatus.enum';
import {
  CancelOrderDto,
  CreateOrderDto,
  OrderQueryDto,
  UpdateOrderStatusDto,
} from './dto/order.dto';
import { InventoryService } from 'src/inventory/inventory.service';
import { CustomersService } from 'src/customers/customers.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { NotificationType } from 'src/notifications/enums/notificationType.enum';
import { PUSHER_EVENTS, PusherService } from 'src/pusher/pusher.service';
import { MovementType } from 'src/inventory/enums/movementType.enum';
import type { AuthUser } from 'src/common/interfaces/auth-user.interface';
import {
  endOfDay,
  makeNumber,
  money,
  startOfDay,
  toDateString,
} from 'src/common/utils/helpers';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly dataSource: DataSource,
    private readonly inventoryService: InventoryService,
    private readonly customersService: CustomersService,
    private readonly notificationsService: NotificationsService,
    private readonly pusherService: PusherService,
  ) {}

  // ═════════════════════════════════════════════
  // POST /orders  (POS sale)
  // ═════════════════════════════════════════════
  async create(user: AuthUser, dto: CreateOrderDto) {
    const tenantId = user.tenantId;

    // 1. customer must exist (if sent)
    if (dto.customerId) {
      await this.customersService.findOne(tenantId, dto.customerId);
    }

    // 2. which warehouse do we sell from?
    const warehouse = await this.inventoryService.pickWarehouse(
      tenantId,
      dto.warehouseId,
    );

    // 3. load all products of this order in one query
    const productIds = dto.items.map((item) => item.productId);
    const products = await this.productRepo.find({
      where: { id: In(productIds), tenantId, isActive: true },
    });

    // 4. build order lines + calculate money
    let subtotal = 0;
    const items: Partial<OrderItem>[] = [];

    for (const item of dto.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }

      const unitPrice = item.unitPrice ?? Number(product.sellingPrice);
      const discount = item.discount ?? 0;
      const lineTotal = money(unitPrice * item.quantity - discount);

      if (lineTotal < 0) {
        throw new BadRequestException(
          `Discount is bigger than the price for "${product.name}"`,
        );
      }

      subtotal += lineTotal;
      items.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: unitPrice.toFixed(2),
        costPrice: product.costPrice, // saved for profit reports
        discount: discount.toFixed(2),
        total: lineTotal.toFixed(2),
      });
    }

    const orderDiscount = dto.discount ?? 0;
    const tax = dto.tax ?? 0;
    const total = money(subtotal - orderDiscount + tax);

    if (total < 0) {
      throw new BadRequestException('Order total can not be negative');
    }

    // 5. order number like ORD-0042
    const count = await this.orderRepo.count({ where: { tenantId } });
    const orderNumber = makeNumber('ORD', count + 1);

    // 6. TRANSACTION: save order + take stock + update customer balance.
    //    If ANY step fails (e.g. not enough stock), everything is undone.
    const order = await this.dataSource.transaction(async (manager) => {
      const savedOrder = await manager.save(
        manager.create(Order, {
          tenantId,
          orderNumber,
          customerId: dto.customerId ?? null,
          warehouseId: warehouse.id,
          status: OrderStatus.CONFIRMED,
          subtotal: money(subtotal).toFixed(2),
          discount: orderDiscount.toFixed(2),
          tax: tax.toFixed(2),
          total: total.toFixed(2),
          notes: dto.notes ?? null,
          createdBy: user.id,
          items: items as OrderItem[], // saved too, because cascade: true
        }),
      );

      for (const item of items) {
        try {
          await this.inventoryService.changeStock(manager, {
            tenantId,
            productId: item.productId as string,
            warehouseId: warehouse.id,
            change: -(item.quantity as number),
            type: MovementType.OUT,
            reason: `Sale order #${orderNumber}`,
            referenceId: savedOrder.id,
            userId: user.id,
          });
        } catch (error) {
          // make the error message friendlier (add the product name)
          if (error instanceof UnprocessableEntityException) {
            throw new UnprocessableEntityException(
              `Insufficient stock for product "${item.productName}". ${error.message}`,
            );
          }
          throw error;
        }
      }

      if (dto.customerId) {
        await this.customersService.changeBalance(manager, dto.customerId, total);
      }

      return savedOrder;
    });

    // 7. AFTER the transaction: realtime events + low stock alerts
    const changes: Record<string, number> = {};
    for (const item of items) {
      const id = item.productId as string;
      changes[id] = (changes[id] ?? 0) - (item.quantity as number);
    }
    await this.inventoryService.afterStockChange(tenantId, changes);

    void this.pusherService.sendToTenant(tenantId, PUSHER_EVENTS.ORDER_CREATED, {
      id: order.id,
      orderNumber: order.orderNumber,
      total: order.total,
      createdAt: order.createdAt,
    });

    return {
      message: 'Order created successfully',
      data: await this.findOne(tenantId, order.id),
    };
  }

  // ─────────────────────────────────────────────
  // GET /orders
  // ─────────────────────────────────────────────
  async findAll(tenantId: string, query: OrderQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.customer', 'customer')
      .where('o.tenantId = :tenantId', { tenantId });

    if (query.status) {
      qb.andWhere('o.status = :status', { status: query.status });
    }
    if (query.customerId) {
      qb.andWhere('o.customerId = :customerId', {
        customerId: query.customerId,
      });
    }
    if (query.dateFrom) {
      qb.andWhere('o.createdAt >= :from', { from: startOfDay(query.dateFrom) });
    }
    if (query.dateTo) {
      qb.andWhere('o.createdAt <= :to', { to: endOfDay(query.dateTo) });
    }

    const [orders, total] = await qb
      .orderBy('o.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const items = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      total: o.total,
      paidAmount: o.paidAmount,
      customerId: o.customerId,
      customerName: o.customer?.name ?? 'Walk-in customer',
      createdAt: o.createdAt,
    }));

    return { items, total, page, limit };
  }

  // ─────────────────────────────────────────────
  // GET /orders/today-summary
  // revenue = sales after discount, WITHOUT tax
  // profit  = revenue - cost of the goods sold
  // ─────────────────────────────────────────────
  async todaySummary(tenantId: string) {
    const from = startOfDay(new Date());
    const to = endOfDay(new Date());

    const orderRow = await this.orderRepo
      .createQueryBuilder('o')
      .select('COUNT(o.id)', 'orderCount')
      .addSelect('COALESCE(SUM(o.subtotal - o.discount), 0)', 'revenue')
      .where('o.tenantId = :tenantId', { tenantId })
      .andWhere('o.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .andWhere('o.createdAt BETWEEN :from AND :to', { from, to })
      .getRawOne();

    const costRow = await this.dataSource
      .getRepository(OrderItem)
      .createQueryBuilder('i')
      .innerJoin('i.order', 'o')
      .select('COALESCE(SUM(i.costPrice * i.quantity), 0)', 'cost')
      .where('o.tenantId = :tenantId', { tenantId })
      .andWhere('o.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .andWhere('o.createdAt BETWEEN :from AND :to', { from, to })
      .getRawOne();

    const revenue = Number(orderRow.revenue);
    const cost = Number(costRow.cost);

    return {
      date: toDateString(from),
      orderCount: Number(orderRow.orderCount),
      totalRevenue: revenue.toFixed(2),
      totalProfit: money(revenue - cost).toFixed(2),
    };
  }

  // ─────────────────────────────────────────────
  // GET /orders/:id
  // ─────────────────────────────────────────────
  async findOne(tenantId: string, id: string) {
    const order = await this.orderRepo.findOne({
      where: { id, tenantId },
      relations: { items: true, customer: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const balanceDue = money(Number(order.total) - Number(order.paidAmount));

    return { ...order, balanceDue: balanceDue.toFixed(2) };
  }

  // ─────────────────────────────────────────────
  // PATCH /orders/:id/status
  // ─────────────────────────────────────────────
  async updateStatus(user: AuthUser, id: string, dto: UpdateOrderStatusDto) {
    const order = await this.findOrderEntity(user.tenantId, id);

    if (dto.status === OrderStatus.CANCELLED) {
      throw new BadRequestException(
        'Use POST /orders/:id/cancel to cancel an order',
      );
    }

    // check the "status map" in orderStatus.enum.ts
    const allowed = ALLOWED_STATUS_CHANGES[order.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from "${order.status}" to "${dto.status}"`,
      );
    }

    order.status = dto.status;
    await this.orderRepo.save(order);

    void this.pusherService.sendToTenant(user.tenantId, PUSHER_EVENTS.ORDER_UPDATED, {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
    });

    return {
      message: `Order status updated to ${order.status}`,
      data: { id: order.id, status: order.status },
    };
  }

  // ─────────────────────────────────────────────
  // POST /orders/:id/cancel  -> give the stock back
  // ─────────────────────────────────────────────
  async cancel(user: AuthUser, id: string, dto: CancelOrderDto) {
    const order = await this.orderRepo.findOne({
      where: { id, tenantId: user.tenantId },
      relations: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const canCancel = [OrderStatus.DRAFT, OrderStatus.CONFIRMED];
    if (!canCancel.includes(order.status)) {
      throw new UnprocessableEntityException(
        `Cannot cancel a ${order.status} order`,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      // 1. put every item back into stock
      for (const item of order.items) {
        await this.inventoryService.changeStock(manager, {
          tenantId: user.tenantId,
          productId: item.productId,
          warehouseId: order.warehouseId,
          change: item.quantity,
          type: MovementType.IN,
          reason: `Order cancellation #${order.orderNumber}`,
          referenceId: order.id,
          userId: user.id,
        });
      }

      // 2. customer does not owe the unpaid part anymore
      if (order.customerId) {
        const unpaid = Number(order.total) - Number(order.paidAmount);
        await this.customersService.changeBalance(
          manager,
          order.customerId,
          -unpaid,
        );
      }

      // 3. mark order as cancelled
      // (we update only these columns, so the items are not touched)
      await manager.update(
        Order,
        { id: order.id },
        { status: OrderStatus.CANCELLED, cancelReason: dto.reason },
      );
    });

    // AFTER the transaction
    const changes: Record<string, number> = {};
    for (const item of order.items) {
      changes[item.productId] = (changes[item.productId] ?? 0) + item.quantity;
    }
    await this.inventoryService.afterStockChange(user.tenantId, changes);

    void this.pusherService.sendToTenant(user.tenantId, PUSHER_EVENTS.ORDER_UPDATED, {
      id: order.id,
      orderNumber: order.orderNumber,
      status: OrderStatus.CANCELLED,
    });

    // tell the person who created the order
    if (order.createdBy && order.createdBy !== user.id) {
      await this.notificationsService.notifyUser(order.createdBy, {
        tenantId: user.tenantId,
        type: NotificationType.ORDER_CANCELLED,
        title: 'Order Cancelled',
        message: `Order #${order.orderNumber} was cancelled. Reason: ${dto.reason}`,
        link: `/orders/${order.id}`,
      });
    }

    return {
      message: 'Order cancelled and stock reversed',
      data: {
        orderId: order.id,
        status: OrderStatus.CANCELLED,
        stockReversed: true,
        movementsCreated: order.items.length,
      },
    };
  }

  private async findOrderEntity(tenantId: string, id: string) {
    const order = await this.orderRepo.findOne({ where: { id, tenantId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }
}
