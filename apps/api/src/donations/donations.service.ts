import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';

@Injectable()
export class DonationsService {
  private readonly logger = new Logger(DonationsService.name);
  private readonly stripe: Stripe | null;
  private readonly webhookSecret?: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.stripe = secretKey ? new Stripe(secretKey) : null;
    this.webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
  }

  // Donations are anonymous — Donation.userId is nullable for this reason.
  async createCheckoutSession(dto: CreateCheckoutSessionDto) {
    if (!this.stripe) {
      throw new ServiceUnavailableException(
        "Donations aren't configured yet — set STRIPE_SECRET_KEY to enable them.",
      );
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Donation to AI Career Accelerator' },
            unit_amount: dto.amountCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/donate/cancel`,
    });

    if (!session.url) {
      throw new ServiceUnavailableException(
        'Stripe did not return a checkout URL.',
      );
    }

    // PENDING until the webhook confirms payment (or expires it).
    await this.prisma.donation.create({
      data: {
        stripeSessionId: session.id,
        amountCents: dto.amountCents,
        status: 'PENDING',
      },
    });

    return { url: session.url };
  }

  // rawBody has to be the exact bytes Stripe sent, not a re-parsed copy —
  // the signature is computed over those bytes specifically.
  async handleWebhookEvent(rawBody: Buffer, signature: string) {
    if (!this.stripe || !this.webhookSecret) {
      throw new ServiceUnavailableException(
        'Stripe webhook is not configured.',
      );
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret,
      );
    } catch (error) {
      this.logger.warn(
        `Rejected webhook with invalid signature: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadRequestException('Invalid webhook signature.');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const paymentIntentId =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : (session.payment_intent?.id ?? null);

        // updateMany so an unrecognized session id is a no-op, not a 500.
        await this.prisma.donation.updateMany({
          where: { stripeSessionId: session.id },
          data: { status: 'SUCCEEDED', stripePaymentId: paymentIntentId },
        });
        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object;
        await this.prisma.donation.updateMany({
          where: { stripeSessionId: session.id },
          data: { status: 'FAILED' },
        });
        break;
      }
      default:
        // Not a donation-relevant event — ignore.
        break;
    }
  }
}
