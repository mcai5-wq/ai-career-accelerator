import { IsEnum } from 'class-validator';
import { ProblemProgressStatus } from '@prisma/client';

export class UpdateProblemProgressDto {
  @IsEnum(ProblemProgressStatus)
  status: ProblemProgressStatus;
}
