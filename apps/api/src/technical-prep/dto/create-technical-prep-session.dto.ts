import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTechnicalPrepSessionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  companyNameRaw: string;

  // Required — not optional — since a topic breakdown/problem set tailored
  // to "some role at this company" needs to know which role.
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  targetRole: string;
}
