import { Module } from '@nestjs/common';
import { ResumesController } from './resumes.controller';
import { ResumesService } from './resumes.service';

// No PrismaModule import needed here — it's @Global() (see prisma.module.ts).
@Module({
  controllers: [ResumesController],
  providers: [ResumesService],
})
export class ResumesModule {}
