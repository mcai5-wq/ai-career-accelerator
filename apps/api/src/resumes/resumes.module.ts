import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { ResumesController } from './resumes.controller';
import { ResumesService } from './resumes.service';

@Module({
  imports: [AiModule],
  controllers: [ResumesController],
  providers: [ResumesService],
})
export class ResumesModule {}
