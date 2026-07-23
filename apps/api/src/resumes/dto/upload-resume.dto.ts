import { IsString, MaxLength, MinLength } from 'class-validator';

// The file itself arrives via multipart/form-data and is read with
// @UploadedFile(), not through this DTO — class-validator only sees the
// non-file form fields.
export class UploadResumeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;
}
