import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { InterviewDifficulty } from '@prisma/client';

export class CreateInterviewSessionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  role: string;

  @IsEnum(InterviewDifficulty)
  difficulty: InterviewDifficulty;
}
