import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { envValidationSchema } from './config/env.validation';
// Donations is built (see ./donations) but disabled until real Stripe keys
// exist. Uncomment this import + DonationsModule below to turn it back on
// (also re-enable the links in page.tsx and dashboard/sidebar.tsx).
// import { DonationsModule } from './donations/donations.module';
import { InterviewsModule } from './interviews/interviews.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { ResumesModule } from './resumes/resumes.module';
import { TechnicalPrepModule } from './technical-prep/technical-prep.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    // Default rate limit per route, tracked by IP unless overridden (see
    // @Throttle usages in auth/interviews/resumes controllers).
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 30,
      },
    ]),
    PrismaModule,
    RedisModule,
    AuthModule,
    ResumesModule,
    InterviewsModule,
    TechnicalPrepModule,
    // DonationsModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
