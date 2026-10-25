import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryService } from './inventory.service';
import { MailService } from 'src/notifications/mail.service';
import { UsersService } from 'src/users/users.service';
import { Tenant } from 'src/tenants/entities/tenant.entity';
import { TenantStatus } from 'src/tenants/enums/tenantStatus.enum';
import { OWNER_ONLY } from 'src/common/constants/roles.constants';

// A "cron job" = code that runs automatically on a schedule.
// '0 2 * * *' means: minute 0, hour 2, every day  -> every night at 2:00 AM
@Injectable()
export class LowStockCron {
  private readonly logger = new Logger(LowStockCron.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    private readonly inventoryService: InventoryService,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
  ) {}

  @Cron('0 2 * * *')
  async nightlyLowStockEmail() {
    this.logger.log('Running nightly low-stock check...');

    // 1. every active company
    const tenants = await this.tenantRepo.find({
      where: { status: TenantStatus.ACTIVE },
    });

    for (const tenant of tenants) {
      // 2. low stock products of this company
      const lowStock = await this.inventoryService.findLowStock(tenant.id);
      if (lowStock.length === 0) continue;

      // 3. build a simple text email
      const lines = lowStock.map(
        (p) => `- ${p.name} (${p.sku}): ${p.currentStock} left, reorder at ${p.reorderLevel}`,
      );
      const text = `Daily low stock report for ${tenant.name}:\n\n${lines.join('\n')}`;

      // 4. send to every owner
      const owners = await this.usersService.findByRoles(tenant.id, OWNER_ONLY);
      for (const owner of owners) {
        await this.mailService.send(owner.email, 'Daily Low Stock Report', text);
      }
    }
  }
}
