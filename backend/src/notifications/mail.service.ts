import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

// Sends emails with nodemailer.
// If MAIL_HOST is not set in .env, we only print the email in the console.
// (So you can develop without a real email account.)
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('MAIL_HOST');

    if (!host) {
      this.logger.warn('MAIL_HOST not set -> emails are only logged');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: Number(this.configService.get('MAIL_PORT') ?? 587),
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
    });
  }

  async send(to: string, subject: string, text: string) {
    if (!this.transporter) {
      this.logger.log(`[EMAIL to ${to}] ${subject} - ${text}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('MAIL_FROM') ?? 'noreply@sme.app',
        to,
        subject,
        text,
      });
    } catch (error) {
      // a broken email must never break the main request
      this.logger.error(`Email failed: ${error.message}`);
    }
  }
}
