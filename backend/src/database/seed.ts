// Fills the database with demo data so you can try the app quickly.
// Run:  npm run seed
//
// It starts the Nest app WITHOUT the http server and uses our real
// services (same code the API uses), so the data is always valid.

import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.module';
import { AuthService } from 'src/auth/auth.service';
import { UsersService } from 'src/users/users.service';
import { CategoriesService } from 'src/categories/categories.service';
import { ProductsService } from 'src/products/products.service';
import { CustomersService } from 'src/customers/customers.service';
import { SuppliersService } from 'src/suppliers/suppliers.service';
import { OrdersService } from 'src/orders/orders.service';
import { UserRole } from 'src/users/enums/userRole.enum';
import { AuthUser } from 'src/common/interfaces/auth-user.interface';

const PASSWORD = 'Admin@1234';
const OWNER_EMAIL = 'owner@rahimtraders.com';
const SUPER_ADMIN_EMAIL = 'admin@sme.app';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const authService = app.get(AuthService);
  const usersService = app.get(UsersService);
  const categoriesService = app.get(CategoriesService);
  const productsService = app.get(ProductsService);
  const customersService = app.get(CustomersService);
  const suppliersService = app.get(SuppliersService);
  const ordersService = app.get(OrdersService);

  // 0. the platform super admin (creates shops + shop owners)
  if (!(await usersService.findOne(SUPER_ADMIN_EMAIL))) {
    await usersService.createSuperAdmin({
      fullName: 'Platform Admin',
      email: SUPER_ADMIN_EMAIL,
      password: PASSWORD,
    });
    console.log(`Super admin created: ${SUPER_ADMIN_EMAIL} / ${PASSWORD}`);
  }

  // don't seed the demo shop twice
  if (await usersService.findOne(OWNER_EMAIL)) {
    console.log('Demo data already exists. Nothing to do.');
    await app.close();
    return;
  }

  // 1. company + owner
  const { data } = await authService.register({
    companyName: 'Rahim Traders',
    fullName: 'Rahim Uddin',
    email: OWNER_EMAIL,
    password: PASSWORD,
  });

  // we act as the owner from now on
  const owner: AuthUser = {
    id: data.userId,
    email: data.email,
    role: UserRole.BUSINESS_ADMIN,
    tenantId: data.tenantId as string,
    tenantSlug: null,
  };

  // 2. manager + staff
  await usersService.createUser(owner, {
    fullName: 'Karim Manager',
    email: 'manager@rahimtraders.com',
    password: PASSWORD,
    role: UserRole.WAREHOUSE_MANAGER,
  });
  await usersService.createUser(owner, {
    fullName: 'Salma Staff',
    email: 'staff@rahimtraders.com',
    password: PASSWORD,
    role: UserRole.SALES_STAFF,
  });

  // 3. categories
  const grains = await categoriesService.create(owner.tenantId, { name: 'Grains' });
  const drinks = await categoriesService.create(owner.tenantId, { name: 'Beverages' });

  // 4. products (with starting stock)
  const products = [
    { name: 'Basmati Rice 1kg', sku: 'RICE-001', categoryId: grains.data.id, costPrice: 85, sellingPrice: 110, reorderLevel: 20, unit: 'pcs', initialStock: 120 },
    { name: 'Atta 1kg', sku: 'ATTA-001', categoryId: grains.data.id, costPrice: 55, sellingPrice: 75, reorderLevel: 20, unit: 'pcs', initialStock: 80 },
    { name: 'Sugar 1kg', sku: 'SUGAR-001', categoryId: grains.data.id, costPrice: 65, sellingPrice: 85, reorderLevel: 15, unit: 'pcs', initialStock: 18 },
    { name: 'Mineral Water 1L', sku: 'WATER-001', categoryId: drinks.data.id, costPrice: 12, sellingPrice: 20, reorderLevel: 30, unit: 'pcs', initialStock: 200 },
    { name: 'Mango Juice 250ml', sku: 'JUICE-001', categoryId: drinks.data.id, costPrice: 18, sellingPrice: 30, reorderLevel: 25, unit: 'pcs', initialStock: 40 },
  ];

  const created: { id: string }[] = [];
  for (const product of products) {
    const result = await productsService.create(owner, product);
    created.push(result.data);
  }

  // 5. supplier + customer
  await suppliersService.create(owner.tenantId, {
    name: 'ACI Foods Ltd',
    contactPerson: 'Rahim',
    phone: '01700000000',
    email: 'aci@aci.com',
  });

  const customer = await customersService.create(owner.tenantId, {
    name: 'Karim Mia',
    phone: '01711000001',
    address: '123 Dhaka Road',
  });

  // 6. two sample orders
  await ordersService.create(owner, {
    customerId: customer.data.id,
    items: [
      { productId: created[0].id, quantity: 3 },
      { productId: created[3].id, quantity: 6 },
    ],
  });
  await ordersService.create(owner, {
    items: [{ productId: created[1].id, quantity: 2 }],
  });

  console.log('\n✅ Demo data created! Log in with:');
  console.log(`   Super admin : ${SUPER_ADMIN_EMAIL} / ${PASSWORD}`);
  console.log(`   Owner   : ${OWNER_EMAIL} / ${PASSWORD}`);
  console.log(`   Manager : manager@rahimtraders.com / ${PASSWORD}`);
  console.log(`   Staff   : staff@rahimtraders.com / ${PASSWORD}\n`);

  await app.close();
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
