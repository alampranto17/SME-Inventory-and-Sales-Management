import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';
import { Order } from 'src/orders/entities/order.entity';
import { Payment } from 'src/payments/entities/payment.entity';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';

@Module({
  // Order + Payment are only needed for the ledger query
  imports: [TypeOrmModule.forFeature([Customer, Order, Payment])],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
