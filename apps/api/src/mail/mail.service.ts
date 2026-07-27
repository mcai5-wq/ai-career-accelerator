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

    // All three (or none) — a partially-configured SMTP setup is treated
    // the same as unconfigured, rather than failing at connection time.
    this.transporter =
      host && user && pass
        ? nodemailer.createTransport({
            host,
            port: this.configService.get<number>('SMTP_PORT') ?? 587,
            secure: this.configService.get<number>('SMTP_PORT') === 465,
            auth: { user, pass },
            // nodemailer's defaults are way too generous for a request a
            // user is actively waiting on (connectionTimeout defaults to
            // 2min, socketTimeout to 10min) — a slow/stalled SMTP server
            // would leave the register/login request hanging that whole
            // time with no error, which is exactly what happened here.
            // Fail fast instead so the frontend gets a clear error quickly.
            connectionTimeout: 10_000,
            greetingTimeout: 10_000,
            socketTimeout: 15_000,
          })
        : null;
  }

  async sendLoginCode(to: string, code: string): Promise<void> {
    if (!this.transporter) {
      // No SMTP configured — log instead of failing, so the whole 2FA flow
      // is still fully usable (and testable) in local dev without real
      // email credentials. See apps/api/.env for how to configure a real
      // provider.
      this.logger.warn(
        `[dev] SMTP not configured — login code for ${to}: ${code}`,
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
        subject: 'Your sign-in code',
        text: `Your sign-in code is ${code}. It expires in 10 minutes.`,
        html: `<p>Your sign-in code is <strong>${code}</strong>. It expires in 10 minutes.</p>`,
      });
    } catch (error) {
      // Surface a clear, expected error instead of letting nodemailer's
      // exception bubble up as an opaque 500 — this is a legitimate runtime
      // condition (provider rejected the recipient, network hiccup, etc.),
      // not a bug, so the caller should get something actionable.
      this.logger.error(
        `Failed to send login code to ${to}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException(
        "Couldn't send the verification email. Please try again shortly.",
      );
    }
  }
}
