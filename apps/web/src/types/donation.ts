// Frontend-facing shape for the NestJS donations endpoints (see
// apps/api/src/donations). No auth required — donations are anonymous.
//   POST /donations/checkout   { amountCents }  ->  { url }
export interface CreateCheckoutSessionResponse {
  url: string;
}
