import { Module } from '@nestjs/common';
import { TechnicalPrepController } from './technical-prep.controller';
import { TechnicalPrepService } from './technical-prep.service';

// No PrismaModule import needed here — it's @Global() (see prisma.module.ts).
@Module({
  controllers: [TechnicalPrepController],
  providers: [TechnicalPrepService],
})
export class TechnicalPrepModule {}
