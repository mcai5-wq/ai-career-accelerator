import { Module } from '@nestjs/common';
import { DonationsController } from './donations.controller';
import { DonationsService } from './donations.service';

// No PrismaModule import needed here — it's @Global() (see prisma.module.ts).
@Module({
  controllers: [DonationsController],
  providers: [DonationsService],
})
export class DonationsModule {}
