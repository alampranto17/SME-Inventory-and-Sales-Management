import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { Inventory } from './entities/inventory.entity';
import { StockMovement } from './entities/stockMovement.entity';
import { Warehouse } from './entities/warehouse.entity';
import { Product } from 'src/products/entities/product.entity';
import { MovementType } from './enums/movementType.enum';
import {
  AdjustStockDto,
  CreateWarehouseDto,
  MovementQueryDto,
  ReceiveStockDto,
  StockChangeInput,
  TransferStockDto,
} from './dto/inventory.dto';
import { NotificationsService } from 'src/notifications/notifications.service';
import { PUSHER_EVENTS, PusherService } from 'src/pusher/pusher.service';
import type { AuthUser } from 'src/common/interfaces/auth-user.interface';
import { endOfDay, startOfDay } from 'src/common/utils/helpers';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepo: Repository<Inventory>,
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepo: Repository<Warehouse>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
    private readonly pusherService: PusherService,
  ) {}

  // ═════════════════════════════════════════════
  // THE MOST IMPORTANT METHOD
  // ═════════════════════════════════════════════
  // Every stock change in the whole app goes through here
  // (sales, cancel, purchase receive, adjust, transfer).
  //
  // It needs an EntityManager -> that means it must run INSIDE
  // a transaction started by the caller:
  //
  //   await this.dataSource.transaction(async (manager) => {
  //     await this.inventoryService.changeStock(manager, {...});
  //   });
  async changeStock(manager: EntityManager, input: StockChangeInput) {
    // 1. find the stock row for this product + warehouse.
    //    "pessimistic_write" lock = if 2 sales happen at the same time,
    //    the second one waits until the first one is finished.
    let inventory = await manager.findOne(Inventory, {
      where: {
        tenantId: input.tenantId,
        productId: input.productId,
        warehouseId: input.warehouseId,
      },
      lock: { mode: 'pessimistic_write' },
    });

    // 2. first time this product is in this warehouse -> create the row
    if (!inventory) {
      inventory = manager.create(Inventory, {
        tenantId: input.tenantId,
        productId: input.productId,
        warehouseId: input.warehouseId,
        quantity: 0,
        reservedQty: 0,
      });
    }

    // 3. stock can never go below 0
    const newQuantity = inventory.quantity + input.change;
    if (newQuantity < 0) {
      throw new UnprocessableEntityException(
        `Not enough stock. Available: ${inventory.quantity}, Requested: ${Math.abs(input.change)}`,
      );
    }

    // 4. save new quantity
    inventory.quantity = newQuantity;
    inventory = await manager.save(inventory);

    // 5. save the movement (audit log)
    const movement = await manager.save(
      manager.create(StockMovement, {
        tenantId: input.tenantId,
        productId: input.productId,
        warehouseId: input.warehouseId,
        toWarehouseId: input.toWarehouseId ?? null,
        type: input.type,
        quantity: input.change,
        reason: input.reason,
        referenceId: input.referenceId ?? null,
        createdBy: input.userId,
      }),
    );

    return { inventory, movement };
  }

  // Call this AFTER the transaction is finished (committed).
  // changes = { productId: how much it changed } e.g. { 'abc': -3 }
  // It does 2 things:
  //   1. tells every browser in the company "stock changed" (Pusher)
  //   2. sends a low-stock alert if stock just went below reorder level
  async afterStockChange(tenantId: string, changes: Record<string, number>) {
    const productIds = Object.keys(changes);
    if (productIds.length === 0) return;

    const stockMap = await this.getStockMap(tenantId, productIds);
    const products = await this.productRepo.find({
      where: { id: In(productIds), tenantId },
    });

    for (const product of products) {
      const currentStock = stockMap[product.id] ?? 0;
      const previousStock = currentStock - changes[product.id];

      void this.pusherService.sendToTenant(
        tenantId,
        PUSHER_EVENTS.STOCK_UPDATED,
        { productId: product.id, productName: product.name, currentStock },
      );

      // only alert when it CROSSES the line (not on every sale)
      const isLowNow = currentStock <= product.reorderLevel;
      const wasLowBefore = previousStock <= product.reorderLevel;

      if (isLowNow && !wasLowBefore) {
        await this.notificationsService.notifyLowStock(
          tenantId,
          product,
          currentStock,
        );
      }
    }
  }

  // ─────────────────────────────────────────────
  // READ STOCK
  // ─────────────────────────────────────────────

  // { productId: totalQuantityInAllWarehouses }
  async getStockMap(tenantId: string, productIds: string[]) {
    const map: Record<string, number> = {};
    if (productIds.length === 0) return map;

    const rows = await this.inventoryRepo
      .createQueryBuilder('inv')
      .select('inv.productId', 'productId')
      .addSelect('SUM(inv.quantity)', 'total')
      .where('inv.tenantId = :tenantId', { tenantId })
      .andWhere('inv.productId IN (:...productIds)', { productIds })
      .groupBy('inv.productId')
      .getRawMany();

    for (const row of rows) {
      map[row.productId] = Number(row.total);
    }

    return map;
  }

  // GET /inventory
  async findAll(tenantId: string) {
    const rows = await this.inventoryRepo.find({
      where: { tenantId },
      relations: { product: true, warehouse: true },
      order: { updatedAt: 'DESC' },
    });

    return rows.map((row) => this.toStockResponse(row));
  }

  // GET /inventory/:productId
  async findByProduct(tenantId: string, productId: string) {
    const product = await this.findProduct(tenantId, productId);

    const rows = await this.inventoryRepo.find({
      where: { tenantId, productId },
      relations: { product: true, warehouse: true },
    });

    const totalQuantity = rows.reduce((sum, row) => sum + row.quantity, 0);

    return {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      reorderLevel: product.reorderLevel,
      totalQuantity,
      warehouses: rows.map((row) => this.toStockResponse(row)),
    };
  }

  // GET /inventory/movements
  async findMovements(tenantId: string, query: MovementQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const qb = this.movementRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.product', 'product')
      .where('m.tenantId = :tenantId', { tenantId });

    // add filters only if they are sent
    if (query.productId) {
      qb.andWhere('m.productId = :productId', { productId: query.productId });
    }
    if (query.type) {
      qb.andWhere('m.type = :type', { type: query.type });
    }
    if (query.dateFrom) {
      qb.andWhere('m.createdAt >= :from', { from: startOfDay(query.dateFrom) });
    }
    if (query.dateTo) {
      qb.andWhere('m.createdAt <= :to', { to: endOfDay(query.dateTo) });
    }

    const [rows, total] = await qb
      .orderBy('m.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const items = rows.map((m) => ({
      id: m.id,
      productId: m.productId,
      productName: m.product?.name,
      warehouseId: m.warehouseId,
      toWarehouseId: m.toWarehouseId,
      type: m.type,
      quantity: m.quantity,
      reason: m.reason,
      referenceId: m.referenceId,
      createdBy: m.createdBy,
      createdAt: m.createdAt,
    }));

    return { items, total, page, limit };
  }

  // products where total stock <= reorder level
  async findLowStock(tenantId: string) {
    const rows = await this.productRepo
      .createQueryBuilder('p')
      .leftJoin(Inventory, 'inv', 'inv.productId = p.id')
      .select('p.id', 'id')
      .addSelect('p.name', 'name')
      .addSelect('p.sku', 'sku')
      .addSelect('p.reorderLevel', 'reorderLevel')
      .addSelect('p.sellingPrice', 'sellingPrice')
      .addSelect('COALESCE(SUM(inv.quantity), 0)', 'currentStock')
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere('p.isActive = true')
      .groupBy('p.id')
      .having('COALESCE(SUM(inv.quantity), 0) <= p.reorderLevel')
      .orderBy('p.name', 'ASC')
      .getRawMany();

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      currentStock: Number(row.currentStock),
      reorderLevel: Number(row.reorderLevel),
      shortage: Number(row.reorderLevel) - Number(row.currentStock),
      sellingPrice: row.sellingPrice,
    }));
  }

  // ─────────────────────────────────────────────
  // CHANGE STOCK (HTTP endpoints)
  // ─────────────────────────────────────────────

  // POST /inventory/adjust
  async adjust(user: AuthUser, dto: AdjustStockDto) {
    await this.findProduct(user.tenantId, dto.productId);
    const warehouse = await this.pickWarehouse(user.tenantId, dto.warehouseId);

    const result = await this.dataSource.transaction((manager) =>
      this.changeStock(manager, {
        tenantId: user.tenantId,
        productId: dto.productId,
        warehouseId: warehouse.id,
        change: dto.quantity,
        type: MovementType.ADJUST,
        reason: dto.reason,
        userId: user.id,
      }),
    );

    await this.afterStockChange(user.tenantId, {
      [dto.productId]: dto.quantity,
    });

    return {
      message: 'Stock adjusted successfully',
      data: {
        productId: dto.productId,
        adjustment: dto.quantity,
        newQuantity: result.inventory.quantity,
        movementId: result.movement.id,
        reason: dto.reason,
      },
    };
  }

  // POST /inventory/receive
  async receive(user: AuthUser, dto: ReceiveStockDto) {
    await this.findProduct(user.tenantId, dto.productId);
    const warehouse = await this.pickWarehouse(user.tenantId, dto.warehouseId);

    const result = await this.dataSource.transaction((manager) =>
      this.changeStock(manager, {
        tenantId: user.tenantId,
        productId: dto.productId,
        warehouseId: warehouse.id,
        change: dto.quantity,
        type: MovementType.IN,
        reason: dto.reason,
        referenceId: dto.purchaseOrderId ?? dto.supplierId ?? null,
        userId: user.id,
      }),
    );

    await this.afterStockChange(user.tenantId, {
      [dto.productId]: dto.quantity,
    });

    return {
      message: 'Stock received successfully',
      data: {
        productId: dto.productId,
        received: dto.quantity,
        newQuantity: result.inventory.quantity,
        movementId: result.movement.id,
      },
    };
  }

  // POST /inventory/transfer
  async transfer(user: AuthUser, dto: TransferStockDto) {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException('From and To warehouse must be different');
    }

    await this.findProduct(user.tenantId, dto.productId);
    await this.findWarehouse(user.tenantId, dto.fromWarehouseId);
    await this.findWarehouse(user.tenantId, dto.toWarehouseId);

    const reason = dto.reason ?? 'Warehouse transfer';

    // 2 changes in ONE transaction: remove from A, add to B
    const result = await this.dataSource.transaction(async (manager) => {
      const from = await this.changeStock(manager, {
        tenantId: user.tenantId,
        productId: dto.productId,
        warehouseId: dto.fromWarehouseId,
        toWarehouseId: dto.toWarehouseId,
        change: -dto.quantity,
        type: MovementType.TRANSFER,
        reason,
        userId: user.id,
      });

      const to = await this.changeStock(manager, {
        tenantId: user.tenantId,
        productId: dto.productId,
        warehouseId: dto.toWarehouseId,
        change: dto.quantity,
        type: MovementType.TRANSFER,
        reason,
        userId: user.id,
      });

      return { from, to };
    });

    // total stock did not change (0), but we still push the update
    await this.afterStockChange(user.tenantId, { [dto.productId]: 0 });

    return {
      message: 'Stock transferred successfully',
      data: {
        productId: dto.productId,
        quantity: dto.quantity,
        fromQuantity: result.from.inventory.quantity,
        toQuantity: result.to.inventory.quantity,
      },
    };
  }

  // ─────────────────────────────────────────────
  // WAREHOUSES
  // ─────────────────────────────────────────────
  findAllWarehouses(tenantId: string) {
    return this.warehouseRepo.find({
      where: { tenantId },
      order: { isDefault: 'DESC', name: 'ASC' },
    });
  }

  async createWarehouse(tenantId: string, dto: CreateWarehouseDto) {
    // the first warehouse of a company becomes the default one
    const count = await this.warehouseRepo.count({ where: { tenantId } });

    const warehouse = await this.warehouseRepo.save(
      this.warehouseRepo.create({
        tenantId,
        name: dto.name,
        address: dto.address ?? null,
        isDefault: count === 0,
      }),
    );

    return { message: 'Warehouse created', data: warehouse };
  }

  async findWarehouse(tenantId: string, id: string) {
    const warehouse = await this.warehouseRepo.findOne({
      where: { id, tenantId },
    });
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }
    return warehouse;
  }

  // returns the company's default warehouse (creates one if missing)
  async getDefaultWarehouse(tenantId: string) {
    const warehouse = await this.warehouseRepo.findOne({
      where: { tenantId, isDefault: true },
    });
    if (warehouse) return warehouse;

    return this.warehouseRepo.save(
      this.warehouseRepo.create({
        tenantId,
        name: 'Main Warehouse',
        isDefault: true,
      }),
    );
  }

  // if an id is sent use it, otherwise use the default warehouse
  pickWarehouse(tenantId: string, warehouseId?: string) {
    if (warehouseId) {
      return this.findWarehouse(tenantId, warehouseId);
    }
    return this.getDefaultWarehouse(tenantId);
  }

  // ─────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────
  private async findProduct(tenantId: string, productId: string) {
    const product = await this.productRepo.findOne({
      where: { id: productId, tenantId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  private toStockResponse(row: Inventory) {
    return {
      productId: row.productId,
      productName: row.product?.name,
      sku: row.product?.sku,
      warehouseId: row.warehouseId,
      warehouseName: row.warehouse?.name,
      quantity: row.quantity,
      reservedQty: row.reservedQty,
      available: row.quantity - row.reservedQty,
      reorderLevel: row.product?.reorderLevel,
      updatedAt: row.updatedAt,
    };
  }
}
