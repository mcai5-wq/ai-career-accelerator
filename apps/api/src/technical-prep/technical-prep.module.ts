import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { TechnicalPrepController } from './technical-prep.controller';
import { TechnicalPrepService } from './technical-prep.service';

@Module({
  imports: [AiModule],
  controllers: [TechnicalPrepController],
  providers: [TechnicalPrepService],
})
export class TechnicalPrepModule {}
