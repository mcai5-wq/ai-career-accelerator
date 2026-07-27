import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';

// No PrismaModule import needed here — it's @Global() (see prisma.module.ts).
@Module({
  imports: [AiModule],
  controllers: [InterviewsController],
  providers: [InterviewsService],
})
export class InterviewsModule {}
