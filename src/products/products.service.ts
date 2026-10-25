import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';
import { parse } from 'csv-parse/sync';
import { existsSync, unlinkSync } from 'fs';
import { basename, join } from 'path';
import { PRODUCT_IMAGE_FOLDER } from './productImage.upload';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/createProduct.dto';
import { UpdateProductDto } from './dto/updateProduct.dto';
import { ProductQueryDto } from './dto/productQuery.dto';
import { CategoriesService } from 'src/categories/categories.service';
import { InventoryService } from 'src/inventory/inventory.service';
import { MovementType } from 'src/inventory/enums/movementType.enum';
import type { AuthUser } from 'src/common/interfaces/auth-user.interface';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly categoriesService: CategoriesService,
    private readonly inventoryService: InventoryService,
    private readonly dataSource: DataSource,
  ) {}

  // GET /products
  async findAll(tenantId: string, query: ProductQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // 1. build the WHERE part
    const base = { tenantId, isActive: true } as any;
    if (query.category) base.categoryId = query.category;

    // search in name OR sku -> an array in "where" means OR
    const where = query.search
      ? [
          { ...base, name: ILike(`%${query.search}%`) },
          { ...base, sku: ILike(`%${query.search}%`) },
        ]
      : base;

    // 2. get one page of products + total count
    const [products, total] = await this.productRepo.findAndCount({
      where,
      relations: { category: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // 3. get stock for these products in ONE query (not one per product)
    const stockMap = await this.inventoryService.getStockMap(
      tenantId,
      products.map((p) => p.id),
    );

    // 4. add currentStock to each product
    const items = products.map((p) => this.toResponse(p, stockMap[p.id] ?? 0));

    return { items, total, page, limit };
  }

  // GET /products/:id
  async findOne(tenantId: string, id: string) {
    const product = await this.findProductOrFail(tenantId, id);
    const stockMap = await this.inventoryService.getStockMap(tenantId, [id]);

    return this.toResponse(product, stockMap[id] ?? 0);
  }

  // GET /products/low-stock
  async findLowStock(tenantId: string) {
    const items = await this.inventoryService.findLowStock(tenantId);
    return { items, total: items.length };
  }

  // POST /products
  async create(user: AuthUser, dto: CreateProductDto) {
    // 1. checks
    await this.checkSkuIsFree(user.tenantId, dto.sku);
    if (dto.categoryId) {
      await this.categoriesService.findOne(user.tenantId, dto.categoryId);
    }

    const warehouse = await this.inventoryService.getDefaultWarehouse(
      user.tenantId,
    );

    // 2. product + first stock in ONE transaction
    const product = await this.dataSource.transaction(async (manager) => {
      const saved = await manager.save(
        manager.create(Product, {
          tenantId: user.tenantId,
          name: dto.name,
          sku: dto.sku,
          barcode: dto.barcode ?? null,
          categoryId: dto.categoryId ?? null,
          costPrice: String(dto.costPrice),
          sellingPrice: String(dto.sellingPrice),
          reorderLevel: dto.reorderLevel,
          unit: dto.unit,
          imageUrl: dto.imageUrl ?? null,
        }),
      );

      if (dto.initialStock && dto.initialStock > 0) {
        await this.inventoryService.changeStock(manager, {
          tenantId: user.tenantId,
          productId: saved.id,
          warehouseId: warehouse.id,
          change: dto.initialStock,
          type: MovementType.IN,
          reason: 'Initial stock',
          userId: user.id,
        });
      }

      return saved;
    });

    return {
      message: 'Product created successfully',
      data: this.toResponse(product, dto.initialStock ?? 0),
    };
  }

  // PATCH /products/:id
  async update(tenantId: string, id: string, dto: UpdateProductDto) {
    const product = await this.findProductOrFail(tenantId, id, false);

    if (dto.sku && dto.sku !== product.sku) {
      await this.checkSkuIsFree(tenantId, dto.sku);
    }
    if (dto.categoryId) {
      await this.categoriesService.findOne(tenantId, dto.categoryId);
    }

    // copy only the fields that were sent
    if (dto.name !== undefined) product.name = dto.name;
    if (dto.sku !== undefined) product.sku = dto.sku;
    if (dto.barcode !== undefined) product.barcode = dto.barcode;
    if (dto.categoryId !== undefined) product.categoryId = dto.categoryId;
    if (dto.costPrice !== undefined) product.costPrice = String(dto.costPrice);
    if (dto.sellingPrice !== undefined)
      product.sellingPrice = String(dto.sellingPrice);
    if (dto.reorderLevel !== undefined) product.reorderLevel = dto.reorderLevel;
    if (dto.unit !== undefined) product.unit = dto.unit;
    if (dto.imageUrl !== undefined) product.imageUrl = dto.imageUrl;
    if (dto.isActive !== undefined) product.isActive = dto.isActive;

    // (we loaded the product WITHOUT the category relation above,
    //  so TypeORM uses the new categoryId column value)
    await this.productRepo.save(product);

    return {
      message: 'Product updated successfully',
      data: await this.findOne(tenantId, id),
    };
  }

  // DELETE /products/:id  -> soft delete (isActive = false)
  async remove(tenantId: string, id: string) {
    const product = await this.findProductOrFail(tenantId, id);
    product.isActive = false;
    await this.productRepo.save(product);

    return { message: 'Product deactivated successfully', data: null };
  }

  // POST /products/:id/image  (photo upload)
  async uploadImage(tenantId: string, id: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'No image uploaded or wrong field name (must be "image")',
      );
    }

    // the product must belong to this shop. If not -> delete the uploaded file
    const product = await this.productRepo.findOne({ where: { id, tenantId } });
    if (!product) {
      this.deleteImageFile(`/uploads/products/${file.filename}`);
      throw new NotFoundException('Product not found');
    }

    // 1. delete the OLD photo file (we don't need it anymore)
    this.deleteImageFile(product.imageUrl);

    // 2. save the NEW photo path, e.g. "/uploads/products/3f2a....jpg"
    //    (the frontend puts the backend address in front of it)
    product.imageUrl = `/uploads/products/${file.filename}`;
    await this.productRepo.save(product);

    return {
      message: 'Product image uploaded',
      data: await this.findOne(tenantId, id),
    };
  }

  // DELETE /products/:id/image
  async removeImage(tenantId: string, id: string) {
    const product = await this.findProductOrFail(tenantId, id, false);

    this.deleteImageFile(product.imageUrl);
    product.imageUrl = null;
    await this.productRepo.save(product);

    return { message: 'Product image removed', data: null };
  }

  // POST /products/bulk-import  (CSV file)
  async bulkImport(user: AuthUser, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'No file uploaded or wrong field name (must be "file")',
      );
    }

    // 1. CSV text -> array of objects. First row = column names.
    let rows: Record<string, string>[];
    try {
      rows = parse(file.buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch {
      throw new BadRequestException('Could not read the CSV file');
    }

    let imported = 0;
    const errors: { row: number; sku?: string; reason: string }[] = [];

    // 2. try to create each row. A bad row does NOT stop the others.
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 because row 1 is the header

      const dto: CreateProductDto = {
        name: row.name,
        sku: row.sku,
        barcode: row.barcode || undefined,
        costPrice: Number(row.costPrice),
        sellingPrice: Number(row.sellingPrice),
        reorderLevel: Number(row.reorderLevel ?? 0),
        unit: row.unit || 'pcs',
        initialStock: row.initialStock ? Number(row.initialStock) : undefined,
      };

      // simple checks (the ValidationPipe does not run for CSV rows)
      const problem = this.checkCsvRow(dto);
      if (problem) {
        errors.push({ row: rowNumber, sku: dto.sku, reason: problem });
        continue;
      }

      try {
        await this.create(user, dto);
        imported++;
      } catch (error) {
        errors.push({ row: rowNumber, sku: dto.sku, reason: error.message });
      }
    }

    return {
      message: 'Bulk import completed',
      data: { imported, failed: errors.length, errors },
    };
  }

  // ─────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────
  private async findProductOrFail(tenantId: string, id: string, withCategory = true) {
    const product = await this.productRepo.findOne({
      where: { id, tenantId },
      relations: { category: withCategory },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  private async checkSkuIsFree(tenantId: string, sku: string) {
    const exists = await this.productRepo.exists({ where: { tenantId, sku } });
    if (exists) {
      throw new ConflictException(`SKU "${sku}" already exists for this tenant`);
    }
  }

  private checkCsvRow(dto: CreateProductDto): string | null {
    if (!dto.name) return 'name is missing';
    if (!dto.sku) return 'sku is missing';
    if (isNaN(dto.costPrice)) return 'costPrice is missing';
    if (isNaN(dto.sellingPrice) || dto.sellingPrice <= 0)
      return 'sellingPrice is missing';
    if (isNaN(dto.reorderLevel)) return 'reorderLevel must be a number';
    return null;
  }

  // delete a photo file from our uploads folder (only OUR files, not web links)
  private deleteImageFile(imageUrl: string | null) {
    if (!imageUrl || !imageUrl.startsWith('/uploads/products/')) return;

    // basename() -> only the file name, so nobody can delete files outside the folder
    const filePath = join(PRODUCT_IMAGE_FOLDER, basename(imageUrl));
    if (existsSync(filePath)) unlinkSync(filePath);
  }

  // shape of a product in API responses
  private toResponse(product: Product, currentStock: number) {
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      categoryId: product.categoryId,
      categoryName: product.category?.name ?? null,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      reorderLevel: product.reorderLevel,
      unit: product.unit,
      imageUrl: product.imageUrl,
      isActive: product.isActive,
      currentStock,
      isLowStock: currentStock <= product.reorderLevel,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
