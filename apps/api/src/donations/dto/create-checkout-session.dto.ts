import { IsInt, Max, Min } from 'class-validator';

// $1.00–$1,000.00. Stripe itself works in the currency's smallest unit
// (cents for USD), which is also what Donation.amountCents stores.
export class CreateCheckoutSessionDto {
  @IsInt()
  @Min(100)
  @Max(100_000)
  amountCents: number;
}
