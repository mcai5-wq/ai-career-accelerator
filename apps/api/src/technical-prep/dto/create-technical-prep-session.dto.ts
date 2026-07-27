import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTechnicalPrepSessionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  companyNameRaw: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  targetRole?: string;
}
