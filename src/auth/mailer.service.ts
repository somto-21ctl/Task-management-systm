import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transporter: Transporter | null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    if (!host) {
      this.transporter = null;
      return;
    }

    const port = this.config.get<number>('SMTP_PORT', 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASSWORD');
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port === 587,
      ...(user && pass ? { auth: { user, pass } } : {}),
    });
  }

  createPasswordResetUrl(token: string): string {
    this.getTransporter();

    const resetUrl = new URL(
      this.config.getOrThrow<string>('PASSWORD_RESET_URL'),
    );
    resetUrl.searchParams.set('token', token);
    return resetUrl.toString();
  }

  assertConfigured(): void {
    this.getTransporter();
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      throw new ServiceUnavailableException(
        'Password reset email delivery is not configured.',
      );
    }
    return this.transporter;
  }

  async sendPasswordResetEmail(
    recipient: string,
    resetUrl: string,
    expiresInMinutes: number,
  ): Promise<void> {
    const transporter = this.getTransporter();

    try {
      await transporter.sendMail({
        from: this.config.getOrThrow<string>('MAIL_FROM'),
        to: recipient,
        subject: 'Reset your Team Tasks password',
        text: [
          'We received a request to reset your Team Tasks password.',
          '',
          `Use this link to choose a new password: ${resetUrl}`,
          '',
          `This link expires in ${expiresInMinutes} minutes and can only be used once.`,
          'If you did not request a password reset, you can ignore this email.',
        ].join('\n'),
      });
    } catch (error) {
      this.logger.error(
        'Failed to send a password reset email',
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException(
        'Unable to send the password reset email. Please try again later.',
      );
    }
  }
}
