import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
  ) {}

  findAll(tenantId: string) {
    return this.supplierRepo.find({
      where: { tenantId, isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const supplier = await this.supplierRepo.findOne({
      where: { id, tenantId },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  async create(tenantId: string, dto: CreateSupplierDto) {
    const supplier = await this.supplierRepo.save(
      this.supplierRepo.create({ ...dto, tenantId }),
    );

    return { message: 'Supplier created', data: supplier };
  }

  async update(tenantId: string, id: string, dto: UpdateSupplierDto) {
    const supplier = await this.findOne(tenantId, id);
    Object.assign(supplier, dto);
    const saved = await this.supplierRepo.save(supplier);

    return { message: 'Supplier updated', data: saved };
  }

  // soft delete -> old purchase orders still show the supplier name
  async remove(tenantId: string, id: string) {
    const supplier = await this.findOne(tenantId, id);
    supplier.isActive = false;
    await this.supplierRepo.save(supplier);

    return { message: 'Supplier deactivated', data: null };
  }
}
