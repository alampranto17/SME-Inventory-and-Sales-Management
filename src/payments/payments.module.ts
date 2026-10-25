import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { Order } from 'src/orders/entities/order.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { CustomersModule } from 'src/customers/customers.module';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Order]),
    CustomersModule,
    NotificationsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
