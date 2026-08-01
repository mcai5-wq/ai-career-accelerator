import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AnalyzeResumeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  jobTitle: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  jobDescriptionText?: string;
}
