import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/createCategory.dto';
import { UpdateCategoryDto } from './dto/updateCategory.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  findAll(tenantId: string) {
    return this.categoryRepo.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  // find one category of THIS company, or throw 404
  async findOne(tenantId: string, id: string) {
    const category = await this.categoryRepo.findOne({
      where: { id, tenantId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async create(tenantId: string, dto: CreateCategoryDto) {
    // 1. parent must exist in the same company
    if (dto.parentId) {
      await this.findParent(tenantId, dto.parentId);
    }

    // 2. save
    const category = await this.categoryRepo.save(
      this.categoryRepo.create({
        tenantId,
        name: dto.name,
        parentId: dto.parentId ?? null,
      }),
    );

    return { message: 'Category created', data: category };
  }

  async update(tenantId: string, id: string, dto: UpdateCategoryDto) {
    const category = await this.findOne(tenantId, id);

    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('A category can not be its own parent');
      }
      await this.findParent(tenantId, dto.parentId);
    }

    Object.assign(category, dto);
    const saved = await this.categoryRepo.save(category);

    return { message: 'Category updated', data: saved };
  }

  async remove(tenantId: string, id: string) {
    const category = await this.findOne(tenantId, id);

    // products in this category will get categoryId = null (onDelete: SET NULL)
    await this.categoryRepo.remove(category);

    return { message: 'Category deleted', data: null };
  }

  private async findParent(tenantId: string, parentId: string) {
    const parent = await this.categoryRepo.findOne({
      where: { id: parentId, tenantId },
    });

    if (!parent) {
      throw new NotFoundException('Parent category not found');
    }

    return parent;
  }
}
