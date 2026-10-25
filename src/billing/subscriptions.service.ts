import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { In, Repository } from 'typeorm';
import { SubscriptionInvoice } from './entities/subscriptionInvoice.entity';
import { InvoiceStatus } from './enums/invoiceStatus.enum';
import { Tenant } from 'src/tenants/entities/tenant.entity';
import { TenantStatus } from 'src/tenants/enums/tenantStatus.enum';
import { InvoiceQueryDto, MarkPaidDto } from './dto/subscription.dto';
import { dueDateOf, lastMonths, monthlyPrice, toMonth } from './billing.helpers';
import { toDateString } from 'src/common/utils/helpers';

// ─────────────────────────────────────────────
// MONTHLY SOFTWARE BILLS (shop -> super admin)
// ─────────────────────────────────────────────
// 1. Every month each ACTIVE shop gets one bill = its plan's monthly price.
//    (automatic on the 1st of the month, or the super admin presses "Generate")
// 2. The shop owner pays (bKash, bank ...) outside the app.
// 3. The super admin presses "Mark paid" -> status = paid.
// 4. Summary = billed / collected / due for a month.
@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(SubscriptionInvoice)
    private readonly invoiceRepo: Repository<SubscriptionInvoice>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  // ─────────────────────────────────────────────
  // CREATE BILLS
  // ─────────────────────────────────────────────

  // make this month's bill for every active shop that doesn't have one yet
  async generateBills(month = toMonth(new Date())) {
    // 1. all active shops
    const shops = await this.tenantRepo.find({
      where: { status: TenantStatus.ACTIVE },
    });

    // 2. shops that ALREADY have a bill for this month
    const existing = await this.invoiceRepo.find({
      where: { month, tenantId: In(shops.map((s) => s.id)) },
    });
    const alreadyBilled = existing.map((invoice) => invoice.tenantId);

    // 3. create a bill for the others
    const newBills = shops
      .filter((shop) => !alreadyBilled.includes(shop.id))
      .map((shop) =>
        this.invoiceRepo.create({
          tenantId: shop.id,
          month,
          plan: shop.plan,
          amount: monthlyPrice(shop.plan).toFixed(2),
          dueDate: dueDateOf(month),
        }),
      );

    await this.invoiceRepo.save(newBills);

    return {
      message: `${newBills.length} new bills created for ${month}`,
      data: { month, created: newBills.length, skipped: alreadyBilled.length },
    };
  }

  // runs automatically at 01:00 on the 1st day of every month
  @Cron('0 1 1 * *')
  async monthlyBillingJob() {
    const result = await this.generateBills();
    this.logger.log(result.message);
  }

  // ─────────────────────────────────────────────
  // READ BILLS (super admin)
  // ─────────────────────────────────────────────
  async findInvoices(query: InvoiceQueryDto) {
    const where: Record<string, unknown> = {};
    if (query.month) where.month = query.month;
    if (query.status) where.status = query.status;
    if (query.tenantId) where.tenantId = query.tenantId;

    const invoices = await this.invoiceRepo.find({
      where,
      relations: { tenant: true },
      order: { month: 'DESC', createdAt: 'DESC' },
    });

    return invoices.map((invoice) => this.toResponse(invoice));
  }

  // the numbers for the super admin billing dashboard
  async summary(month = toMonth(new Date())) {
    // 1. this month's bills
    const invoices = await this.invoiceRepo.find({ where: { month } });

    const paid = invoices.filter((i) => i.status === InvoiceStatus.PAID);
    const unpaid = invoices.filter((i) => i.status === InvoiceStatus.UNPAID);
    const overdue = unpaid.filter((i) => this.isOverdue(i));

    const sum = (list: SubscriptionInvoice[]) =>
      list.reduce((total, i) => total + Number(i.amount), 0);

    // 2. billed vs collected for the last 6 months (for the graph)
    const months = lastMonths(6);
    const history = await this.invoiceRepo.find({
      where: { month: In(months) },
    });

    const chart = months.map((m) => {
      const monthBills = history.filter((i) => i.month === m);
      return {
        month: m,
        billed: sum(monthBills),
        collected: sum(monthBills.filter((i) => i.status === InvoiceStatus.PAID)),
      };
    });

    // 3. expected income: what all ACTIVE shops pay per month on their plan
    const activeShops = await this.tenantRepo.find({
      where: { status: TenantStatus.ACTIVE },
    });
    const monthlyRecurringRevenue = activeShops.reduce(
      (total, shop) => total + monthlyPrice(shop.plan),
      0,
    );

    return {
      month,
      billed: sum(invoices).toFixed(2),
      collected: sum(paid).toFixed(2),
      due: sum(unpaid).toFixed(2),
      overdueAmount: sum(overdue).toFixed(2),
      billCount: invoices.length,
      paidCount: paid.length,
      unpaidCount: unpaid.length,
      overdueCount: overdue.length,
      activeShops: activeShops.length,
      monthlyRecurringRevenue: monthlyRecurringRevenue.toFixed(2),
      chart,
    };
  }

  // ─────────────────────────────────────────────
  // PAYMENT (super admin marks a bill as paid / unpaid)
  // ─────────────────────────────────────────────
  async markPaid(id: string, dto: MarkPaidDto) {
    const invoice = await this.findInvoice(id);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new UnprocessableEntityException('This bill is already paid');
    }

    invoice.status = InvoiceStatus.PAID;
    invoice.paidAt = new Date();
    invoice.method = dto.method;
    invoice.reference = dto.reference ?? null;
    await this.invoiceRepo.save(invoice);

    return { message: 'Bill marked as paid', data: this.toResponse(invoice) };
  }

  // undo a mistake
  async markUnpaid(id: string) {
    const invoice = await this.findInvoice(id);

    invoice.status = InvoiceStatus.UNPAID;
    invoice.paidAt = null;
    invoice.method = null;
    invoice.reference = null;
    await this.invoiceRepo.save(invoice);

    return { message: 'Bill marked as unpaid', data: this.toResponse(invoice) };
  }

  // ─────────────────────────────────────────────
  // SHOP OWNER: my own bills
  // ─────────────────────────────────────────────
  async myBills(tenantId: string) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Shop not found');
    }

    const invoices = await this.invoiceRepo.find({
      where: { tenantId },
      order: { month: 'DESC' },
    });

    const totalDue = invoices
      .filter((i) => i.status === InvoiceStatus.UNPAID)
      .reduce((total, i) => total + Number(i.amount), 0);

    return {
      shopName: tenant.name,
      plan: tenant.plan,
      monthlyPrice: monthlyPrice(tenant.plan).toFixed(2),
      totalDue: totalDue.toFixed(2),
      invoices: invoices.map((invoice) => this.toResponse(invoice)),
    };
  }

  // ─────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────
  private async findInvoice(id: string) {
    const invoice = await this.invoiceRepo.findOne({
      where: { id },
      relations: { tenant: true },
    });
    if (!invoice) {
      throw new NotFoundException('Bill not found');
    }
    return invoice;
  }

  // unpaid AND the due date is already in the past
  private isOverdue(invoice: SubscriptionInvoice) {
    const today = toDateString(new Date()); // "2026-10-25"
    return invoice.status === InvoiceStatus.UNPAID && invoice.dueDate < today;
  }

  private toResponse(invoice: SubscriptionInvoice) {
    return {
      id: invoice.id,
      tenantId: invoice.tenantId,
      shopName: invoice.tenant?.name,
      shopSlug: invoice.tenant?.slug,
      month: invoice.month,
      plan: invoice.plan,
      amount: invoice.amount,
      status: invoice.status,
      isOverdue: this.isOverdue(invoice),
      dueDate: invoice.dueDate,
      paidAt: invoice.paidAt,
      method: invoice.method,
      reference: invoice.reference,
    };
  }
}
