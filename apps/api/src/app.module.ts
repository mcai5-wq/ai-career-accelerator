import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { envValidationSchema } from './config/env.validation';
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
    PrismaModule,
    RedisModule,
    AuthModule,
    ResumesModule,
    InterviewsModule,
    TechnicalPrepModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
