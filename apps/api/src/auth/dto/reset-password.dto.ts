import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  resetToken: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  // bcrypt ignores anything past 72 bytes.
  @MaxLength(72)
  newPassword: string;
}
