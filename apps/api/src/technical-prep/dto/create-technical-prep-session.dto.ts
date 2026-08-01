import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTechnicalPrepSessionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  companyNameRaw: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  targetRole: string;
}
