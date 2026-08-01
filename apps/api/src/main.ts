import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody: true keeps the unparsed request body around too — needed for
  // Stripe's webhook signature check in donations.controller.ts.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const configService = app.get(ConfigService);

  app.enableCors({ origin: configService.get<string>('FRONTEND_URL') });

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
