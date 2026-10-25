import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { Order } from 'src/orders/entities/order.entity';
import { OrderStatus } from 'src/orders/enums/orderStatus.enum';
import { CreatePaymentDto } from './dto/createPayment.dto';
import { CustomersService } from 'src/customers/customers.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { NotificationType } from 'src/notifications/enums/notificationType.enum';
import { PUSHER_EVENTS, PusherService } from 'src/pusher/pusher.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import type { AuthUser } from 'src/common/interfaces/auth-user.interface';
import { money } from 'src/common/utils/helpers';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly customersService: CustomersService,
    private readonly notificationsService: NotificationsService,
    private readonly pusherService: PusherService,
  ) {}

  // POST /payments
  async create(user: AuthUser, dto: CreatePaymentDto) {
    const tenantId = user.tenantId;

    const result = await this.dataSource.transaction(async (manager) => {
      // 1. lock the order row -> two payments at the same time can't
      //    both pass the "too much money" check below
      const order = await manager.findOne(Order, {
        where: { id: dto.orderId, tenantId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }
      if (order.status === OrderStatus.CANCELLED) {
        throw new UnprocessableEntityException('Order is cancelled');
      }

      // 2. you can't pay more than what is left
      const due = money(Number(order.total) - Number(order.paidAmount));
      if (dto.amount > due) {
        throw new UnprocessableEntityException(
          `Payment exceeds outstanding balance for this order (due: ${due.toFixed(2)})`,
        );
      }

      // 3. save payment
      const payment = await manager.save(
        manager.create(Payment, {
          tenantId,
          orderId: order.id,
          customerId: order.customerId,
          amount: dto.amount.toFixed(2),
          method: dto.method,
          reference: dto.reference ?? null,
          createdBy: user.id,
        }),
      );

      // 4. order paid amount goes up
      const newPaid = money(Number(order.paidAmount) + dto.amount);
      await manager.update(Order, { id: order.id }, { paidAmount: newPaid.toFixed(2) });

      // 5. customer owes less
      if (order.customerId) {
        await this.customersService.changeBalance(
          manager,
          order.customerId,
          -dto.amount,
        );
      }

      return { payment, order, newPaid };
    });

    // AFTER the transaction
    const { payment, order, newPaid } = result;

    void this.pusherService.sendToTenant(tenantId, PUSHER_EVENTS.PAYMENT_RECEIVED, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: payment.amount,
      method: payment.method,
    });

    // tell the order creator when the order is fully paid
    const fullyPaid = newPaid >= Number(order.total);
    if (order.createdBy && fullyPaid) {
      await this.notificationsService.notifyUser(order.createdBy, {
        tenantId,
        type: NotificationType.PAYMENT_RECEIVED,
        title: 'Payment Received',
        message: `Order #${order.orderNumber} is fully paid.`,
        link: `/orders/${order.id}`,
      });
    }

    return { message: 'Payment recorded', data: payment };
  }

  // GET /payments/by-order/:orderId
  async findByOrder(tenantId: string, orderId: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId, tenantId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const items = await this.paymentRepo.find({
      where: { tenantId, orderId },
      order: { paidAt: 'ASC' },
    });

    const totalPaid = items.reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      items,
      totalPaid: money(totalPaid).toFixed(2),
      orderTotal: order.total,
      balanceRemaining: money(Number(order.total) - totalPaid).toFixed(2),
    };
  }

  // GET /payments  (latest payments of the company)
  async findAll(tenantId: string, query: PaginationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [rows, total] = await this.paymentRepo.findAndCount({
      where: { tenantId },
      relations: { order: true },
      order: { paidAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const items = rows.map((p) => ({
      id: p.id,
      orderId: p.orderId,
      orderNumber: p.order?.orderNumber,
      amount: p.amount,
      method: p.method,
      reference: p.reference,
      status: p.status,
      paidAt: p.paidAt,
    }));

    return { items, total, page, limit };
  }
}
