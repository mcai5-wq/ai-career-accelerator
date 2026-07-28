import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  resetToken: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  // bcrypt silently ignores bytes past 72 — reject longer input instead of
  // pretending the extra characters matter.
  @MaxLength(72)
  newPassword: string;
}
