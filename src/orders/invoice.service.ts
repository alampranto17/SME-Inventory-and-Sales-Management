import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import PDFDocument from 'pdfkit';
import { OrdersService } from './orders.service';
import { Tenant } from 'src/tenants/entities/tenant.entity';

// Builds a simple PDF invoice with the "pdfkit" library.
// pdfkit draws text at (x, y) positions on an A4 page.
@Injectable()
export class InvoiceService {
  constructor(
    private readonly ordersService: OrdersService,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  async createInvoicePdf(tenantId: string, orderId: string) {
    // 1. data we need
    const order = await this.ordersService.findOne(tenantId, orderId);
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });

    // 2. start a PDF document
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // pdfkit gives us the file in small pieces ("chunks"),
    // we collect them and join them into one Buffer at the end
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const finished = new Promise<Buffer>((resolve) =>
      doc.on('end', () => resolve(Buffer.concat(chunks))),
    );

    // 3. header
    doc.fontSize(20).text(tenant?.name ?? 'Invoice', { align: 'left' });
    doc.fontSize(10).fillColor('#666').text('INVOICE', { align: 'left' });
    doc.moveDown();

    doc.fillColor('#000').fontSize(11);
    doc.text(`Invoice no: ${order.orderNumber}`);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`);
    doc.text(`Status: ${order.status}`);
    doc.text(`Customer: ${order.customer?.name ?? 'Walk-in customer'}`);
    if (order.customer?.phone) doc.text(`Phone: ${order.customer.phone}`);
    doc.moveDown();

    // 4. table header
    const startX = 50;
    let y = doc.y + 10;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Item', startX, y);
    doc.text('Qty', 300, y);
    doc.text('Price', 350, y);
    doc.text('Disc.', 420, y);
    doc.text('Total', 480, y);
    doc.moveTo(startX, y + 15).lineTo(545, y + 15).stroke();

    // 5. one row per item
    doc.font('Helvetica');
    y += 25;
    for (const item of order.items) {
      doc.text(item.productName, startX, y, { width: 240 });
      doc.text(String(item.quantity), 300, y);
      doc.text(item.unitPrice, 350, y);
      doc.text(item.discount, 420, y);
      doc.text(item.total, 480, y);
      y += 20;
    }

    // 6. totals
    doc.moveTo(startX, y).lineTo(545, y).stroke();
    y += 10;
    const line = (label: string, value: string) => {
      doc.text(label, 380, y);
      doc.text(value, 480, y);
      y += 18;
    };
    line('Subtotal', order.subtotal);
    line('Discount', `-${order.discount}`);
    line('Tax', order.tax);
    doc.font('Helvetica-Bold');
    line('Total', order.total);
    doc.font('Helvetica');
    line('Paid', order.paidAmount);
    line('Balance due', order.balanceDue);

    doc.moveDown(2);
    doc.fontSize(9).fillColor('#666').text('Thank you for your business!', startX);

    // 7. finish and wait for the Buffer
    doc.end();
    const pdf = await finished;

    return { pdf, fileName: `invoice-${order.orderNumber}.pdf` };
  }
}
