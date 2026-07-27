import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody: true preserves the unparsed request body (as req.rawBody)
  // alongside the normal parsed one — needed for Stripe webhook signature
  // verification in donations/donations.controller.ts, which must hash the
  // exact bytes Stripe sent, not a re-serialized JSON.parse'd copy.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const configService = app.get(ConfigService);

  // The frontend (localhost:3000) and API (localhost:3001) are different
  // origins, so the browser blocks the request unless the API explicitly
  // allows it via CORS.
  app.enableCors({ origin: configService.get<string>('FRONTEND_URL') });

  // Applies every DTO's class-validator decorators automatically: rejects
  // requests with missing/malformed fields before a controller method runs.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip properties with no matching @Is... decorator
      forbidNonWhitelisted: true, // ...and reject the request if it had any
      transform: true, // convert plain JSON into the DTO class instance
    }),
  );

  await app.listen(configService.get<number>('PORT')!);
}
void bootstrap();
