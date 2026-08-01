import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    // Partial config counts as unconfigured rather than failing later.
    this.transporter =
      host && user && pass
        ? nodemailer.createTransport({
            host,
            port: this.configService.get<number>('SMTP_PORT') ?? 587,
            secure: this.configService.get<number>('SMTP_PORT') === 465,
            auth: { user, pass },
            // nodemailer's default timeouts are way too long (connection: 2min,
            // socket: 10min) — a stalled SMTP server would leave someone's
            // register/login request just hanging. Fail fast instead.
            connectionTimeout: 10_000,
            greetingTimeout: 10_000,
            socketTimeout: 15_000,
          })
        : null;
  }

  async sendLoginCode(to: string, code: string): Promise<void> {
    await this.sendCode(to, code, {
      logLabel: 'login code',
      subject: 'Your sign-in code',
      bodyLabel: 'sign-in code',
    });
  }

  async sendPasswordResetCode(to: string, code: string): Promise<void> {
    await this.sendCode(to, code, {
      logLabel: 'password reset code',
      subject: 'Your password reset code',
      bodyLabel: 'password reset code',
    });
  }

  private async sendCode(
    to: string,
    code: string,
    options: { logLabel: string; subject: string; bodyLabel: string },
  ): Promise<void> {
    if (!this.transporter) {
      // No SMTP set up — just log it so the flow still works in dev.
      this.logger.warn(
        `[dev] SMTP not configured — ${options.logLabel} for ${to}: ${code}`,
      );
      return;
    }

    const from =
      this.configService.get<string>('MAIL_FROM') ??
      'no-reply@ai-career-accelerator.local';

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: options.subject,
        text: `Your ${options.bodyLabel} is ${code}. It expires in 10 minutes.`,
        html: `<p>Your ${options.bodyLabel} is <strong>${code}</strong>. It expires in 10 minutes.</p>`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send ${options.logLabel} to ${to}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException(
        "Couldn't send the verification email. Please try again shortly.",
      );
    }
  }
}
