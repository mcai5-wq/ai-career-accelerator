import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { InterviewDifficulty } from '@prisma/client';

export class CreateInterviewSessionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  role: string;

  // Required — not just role — so the AI generates questions relevant to
  // this specific company's known interview style/focus, not just a
  // generic role-shaped question. See ai-service/app/prompts/interviews.py.
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  company: string;

  @IsEnum(InterviewDifficulty)
  difficulty: InterviewDifficulty;
}
