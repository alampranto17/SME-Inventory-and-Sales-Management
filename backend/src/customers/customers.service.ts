import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, ILike, Not, Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { Order } from 'src/orders/entities/order.entity';
import { Payment } from 'src/payments/entities/payment.entity';
import { OrderStatus } from 'src/orders/enums/orderStatus.enum';
import {
  CreateCustomerDto,
  CustomerQueryDto,
  UpdateCustomerDto,
} from './dto/customer.dto';
import { money } from 'src/common/utils/helpers';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
  ) {}

  async findAll(tenantId: string, query: CustomerQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // search by name OR phone
    const where = query.search
      ? [
          { tenantId, name: ILike(`%${query.search}%`) },
          { tenantId, phone: ILike(`%${query.search}%`) },
        ]
      : { tenantId };

    const [items, total] = await this.customerRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const customer = await this.customerRepo.findOne({
      where: { id, tenantId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async create(tenantId: string, dto: CreateCustomerDto) {
    await this.checkPhoneIsFree(tenantId, dto.phone);

    const customer = await this.customerRepo.save(
      this.customerRepo.create({
        tenantId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email ?? null,
        address: dto.address ?? null,
      }),
    );

    return { message: 'Customer created', data: customer };
  }

  async update(tenantId: string, id: string, dto: UpdateCustomerDto) {
    const customer = await this.findOne(tenantId, id);

    if (dto.phone && dto.phone !== customer.phone) {
      await this.checkPhoneIsFree(tenantId, dto.phone);
    }

    Object.assign(customer, dto);
    const saved = await this.customerRepo.save(customer);

    return { message: 'Customer updated', data: saved };
  }

  // GET /customers/:id/ledger
  // A ledger = list of everything the customer bought and paid.
  async ledger(tenantId: string, id: string) {
    const customer = await this.findOne(tenantId, id);

    const orders = await this.orderRepo.find({
      where: {
        tenantId,
        customerId: id,
        status: Not(OrderStatus.CANCELLED),
      },
    });

    const payments = await this.paymentRepo.find({
      where: { tenantId, customerId: id },
      relations: { order: true },
    });

    // 1. sales are +, payments are -
    const transactions = [
      ...orders.map((o) => ({
        date: o.createdAt,
        type: 'SALE',
        amount: o.total,
        reference: o.orderNumber,
      })),
      ...payments.map((p) => ({
        date: p.paidAt,
        type: 'PAYMENT',
        amount: (-Number(p.amount)).toFixed(2),
        reference: p.reference ?? p.order?.orderNumber ?? p.id,
      })),
    ];

    // 2. oldest first
    transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

    return {
      customerId: customer.id,
      customerName: customer.name,
      phone: customer.phone,
      outstandingBalance: customer.balance,
      transactions,
    };
  }

  // used by orders + payments INSIDE their transaction
  // amount > 0 -> customer owes more, amount < 0 -> customer paid
  async changeBalance(manager: EntityManager, customerId: string, amount: number) {
    const customer = await manager.findOne(Customer, {
      where: { id: customerId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!customer) return null;

    customer.balance = money(Number(customer.balance) + amount).toFixed(2);
    return manager.save(customer);
  }

  private async checkPhoneIsFree(tenantId: string, phone: string) {
    const exists = await this.customerRepo.exists({
      where: { tenantId, phone },
    });
    if (exists) {
      throw new ConflictException('A customer with this phone already exists');
    }
  }
}
