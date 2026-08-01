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

// Both routes are public — donations don't require an account.
@Controller('donations')
export class DonationsController {
  constructor(private readonly donationsService: DonationsService) {}

  @Post('checkout')
  createCheckoutSession(@Body() dto: CreateCheckoutSessionDto) {
    return this.donationsService.createCheckoutSession(dto);
  }

  // Stripe retries on anything non-2xx, so only a bad signature should throw.
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
