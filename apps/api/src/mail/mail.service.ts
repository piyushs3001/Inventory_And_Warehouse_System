import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Sends transactional email via SMTP (nodemailer). SMTP config is optional: when
 * it is absent the service no-ops (so callers like the password-reset flow can
 * still return generic responses without revealing that no mail was sent). In
 * non-production the reset URL is logged so dev/QA can follow the flow without a
 * real inbox.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter?: Transporter;

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('SMTP_HOST') &&
      this.config.get<string>('SMTP_USER') &&
      this.config.get<string>('SMTP_PASS'),
    );
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`Password reset URL for ${to}: ${resetUrl}`);
    }
    if (!this.isConfigured()) {
      this.logger.warn(
        'SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS); skipping password-reset email.',
      );
      return;
    }

    const from =
      this.config.get<string>('MAIL_FROM') ??
      this.config.get<string>('SMTP_USER');

    await this.getTransport().sendMail({
      from,
      to,
      subject: 'Reset your password',
      text: this.buildText(resetUrl),
      html: this.buildHtml(resetUrl),
    });
  }

  private getTransport(): Transporter {
    if (!this.transporter) {
      const port = this.config.get<number>('SMTP_PORT') ?? 465;
      this.transporter = nodemailer.createTransport({
        host: this.config.get<string>('SMTP_HOST'),
        port,
        secure: port === 465,
        auth: {
          user: this.config.get<string>('SMTP_USER'),
          pass: this.config.get<string>('SMTP_PASS'),
        },
      });
    }
    return this.transporter;
  }

  private buildText(resetUrl: string): string {
    return [
      'We received a request to reset your password for the Inventory & Warehouse System.',
      '',
      `Reset your password: ${resetUrl}`,
      '',
      'This link expires in 1 hour and can be used once.',
      "If you didn't request this, you can safely ignore this email.",
    ].join('\n');
  }

  private buildHtml(resetUrl: string): string {
    return `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;color:#1f2937;">
        <h2 style="color:#4f46e5;margin-bottom:8px;">Reset your password</h2>
        <p>We received a request to reset your password for the Inventory &amp; Warehouse System.</p>
        <p style="margin:24px 0;">
          <a href="${resetUrl}" style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Reset password</a>
        </p>
        <p style="font-size:13px;color:#6b7280;">Or paste this link into your browser:<br><a href="${resetUrl}">${resetUrl}</a></p>
        <p style="font-size:13px;color:#6b7280;">This link expires in 1 hour and can be used once. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `.trim();
  }
}
