import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { DonationsService } from './donations.service';

// Both routes are intentionally public — donations don't require an
// account, and the webhook is called by Stripe itself, not a browser.
@Controller('donations')
export class DonationsController {
  constructor(private readonly donationsService: DonationsService) {}

  @Post('checkout')
  createCheckoutSession(@Body() dto: CreateCheckoutSessionDto) {
    return this.donationsService.createCheckoutSession(dto);
  }

  // Stripe retries on non-2xx, so this must return 200 once the event is
  // handled (or safely ignored) — throwing only for a genuinely invalid
  // signature, which Stripe won't retry into fixing itself.
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ) {
    if (!signature || !req.rawBody) {
      throw new UnauthorizedException('Missing Stripe signature.');
    }
    return this.donationsService.handleWebhookEvent(req.rawBody, signature);
  }
}
