import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { envValidationSchema } from './config/env.validation';
// Donations feature is fully built (see ./donations) but disabled — not
// ready to require real Stripe keys yet. Uncomment both this import and
// DonationsModule below (and the frontend links, see apps/web/src/app/page.tsx
// and components/dashboard/sidebar.tsx) to turn it back on.
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
    // Default rate limit applied to every route (tracked by IP), unless
    // overridden per-route with @Throttle({ default: {...} }) — tighter on
    // auth/AI-calling routes, see auth.controller.ts / interviews.controller.ts
    // / resumes.controller.ts. In-memory storage is fine for the
    // single-instance deployment this app actually runs as; swap in a Redis
    // storage adapter if this ever runs as multiple replicas behind a load
    // balancer.
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
