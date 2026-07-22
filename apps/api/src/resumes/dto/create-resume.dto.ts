import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateResumeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(1, { message: 'Resume text cannot be empty.' })
  rawText: string;

  @IsOptional()
  @IsUrl()
  fileUrl?: string;
}
