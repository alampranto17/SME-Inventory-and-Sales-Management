import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { PurchaseOrder } from './entities/purchaseOrder.entity';
import { PurchaseOrderItem } from './entities/purchaseOrderItem.entity';
import { Product } from 'src/products/entities/product.entity';
import { PurchaseOrderStatus } from './enums/purchaseOrderStatus.enum';
import {
  CreatePurchaseOrderDto,
  PurchaseOrderQueryDto,
  ReceivePurchaseOrderDto,
} from './dto/purchaseOrder.dto';
import { SuppliersService } from 'src/suppliers/suppliers.service';
import { InventoryService } from 'src/inventory/inventory.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { NotificationType } from 'src/notifications/enums/notificationType.enum';
import { MovementType } from 'src/inventory/enums/movementType.enum';
import { MANAGER_AND_UP } from 'src/common/constants/roles.constants';
import type { AuthUser } from 'src/common/interfaces/auth-user.interface';
import { makeNumber, money } from 'src/common/utils/helpers';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly poRepo: Repository<PurchaseOrder>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly dataSource: DataSource,
    private readonly suppliersService: SuppliersService,
    private readonly inventoryService: InventoryService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(tenantId: string, query: PurchaseOrderQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await this.poRepo.findAndCount({
      where: query.status ? { tenantId, status: query.status } : { tenantId },
      relations: { supplier: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const po = await this.poRepo.findOne({
      where: { id, tenantId },
      relations: { supplier: true, items: { product: true } },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    return po;
  }

  // POST /purchase-orders
  async create(user: AuthUser, dto: CreatePurchaseOrderDto) {
    const tenantId = user.tenantId;

    // 1. checks
    await this.suppliersService.findOne(tenantId, dto.supplierId);
    const warehouse = await this.inventoryService.pickWarehouse(
      tenantId,
      dto.warehouseId,
    );

    const products = await this.productRepo.find({
      where: { id: In(dto.items.map((i) => i.productId)), tenantId },
    });

    // 2. build items + total
    let total = 0;
    const items: Partial<PurchaseOrderItem>[] = dto.items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }

      const unitCost = item.unitCost ?? Number(product.costPrice);
      const lineTotal = money(unitCost * item.quantity);
      total += lineTotal;

      return {
        productId: product.id,
        quantity: item.quantity,
        unitCost: unitCost.toFixed(2),
        total: lineTotal.toFixed(2),
      };
    });

    // 3. save (items are saved too because of cascade: true)
    const count = await this.poRepo.count({ where: { tenantId } });
    const po = await this.poRepo.save(
      this.poRepo.create({
        tenantId,
        poNumber: makeNumber('PO', count + 1),
        supplierId: dto.supplierId,
        warehouseId: warehouse.id,
        status: PurchaseOrderStatus.DRAFT,
        total: money(total).toFixed(2),
        notes: dto.notes ?? null,
        createdBy: user.id,
        items: items as PurchaseOrderItem[],
      }),
    );

    return {
      message: 'Purchase order created',
      data: {
        id: po.id,
        poNumber: po.poNumber,
        status: po.status,
        total: po.total,
      },
    };
  }

  // PATCH /purchase-orders/:id/send  (draft -> sent)
  async markSent(tenantId: string, id: string) {
    const po = await this.findOne(tenantId, id);

    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new UnprocessableEntityException('Only a draft PO can be sent');
    }

    await this.poRepo.update({ id }, { status: PurchaseOrderStatus.SENT });
    return { message: 'Purchase order marked as sent', data: { id, status: PurchaseOrderStatus.SENT } };
  }

  // PATCH /purchase-orders/:id/receive  -> stock goes UP
  async receive(user: AuthUser, id: string, dto: ReceivePurchaseOrderDto) {
    const po = await this.findOne(user.tenantId, id);

    const closed = [PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.CANCELLED];
    if (closed.includes(po.status)) {
      throw new UnprocessableEntityException(
        'Purchase order is already received or cancelled',
      );
    }

    const changes: Record<string, number> = {};

    await this.dataSource.transaction(async (manager) => {
      for (const item of po.items) {
        // 1. how many arrived? (if not sent in body -> everything arrived)
        const sent = dto.items?.find((i) => i.productId === item.productId);
        const receivedQty = sent ? sent.receivedQty : item.quantity;

        if (receivedQty > 0) {
          // 2. add stock
          await this.inventoryService.changeStock(manager, {
            tenantId: user.tenantId,
            productId: item.productId,
            warehouseId: po.warehouseId,
            change: receivedQty,
            type: MovementType.IN,
            reason: `Purchase order #${po.poNumber}`,
            referenceId: po.id,
            userId: user.id,
          });
          changes[item.productId] = (changes[item.productId] ?? 0) + receivedQty;
        }

        // 3. remember how many arrived
        await manager.update(PurchaseOrderItem, { id: item.id }, { receivedQty });
      }

      // 4. close the PO
      await manager.update(
        PurchaseOrder,
        { id: po.id },
        { status: PurchaseOrderStatus.RECEIVED, receivedAt: new Date() },
      );
    });

    // AFTER the transaction
    await this.inventoryService.afterStockChange(user.tenantId, changes);

    await this.notificationsService.notifyRoles(user.tenantId, MANAGER_AND_UP, {
      type: NotificationType.STOCK_RECEIVED,
      title: 'Stock Received',
      message: `Purchase order #${po.poNumber} from ${po.supplier.name} was received.`,
      link: `/purchase-orders/${po.id}`,
    });

    return {
      message: 'Purchase order received. Inventory updated.',
      data: {
        poId: po.id,
        status: PurchaseOrderStatus.RECEIVED,
        stockUpdated: true,
        itemsReceived: Object.keys(changes).length,
      },
    };
  }

  // POST /purchase-orders/:id/cancel
  async cancel(tenantId: string, id: string) {
    const po = await this.findOne(tenantId, id);

    if (po.status === PurchaseOrderStatus.RECEIVED) {
      throw new UnprocessableEntityException(
        'A received purchase order can not be cancelled',
      );
    }

    await this.poRepo.update({ id }, { status: PurchaseOrderStatus.CANCELLED });
    return {
      message: 'Purchase order cancelled',
      data: { id, status: PurchaseOrderStatus.CANCELLED },
    };
  }
}
