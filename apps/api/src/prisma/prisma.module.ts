import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Global so other modules don't each have to import this one.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
