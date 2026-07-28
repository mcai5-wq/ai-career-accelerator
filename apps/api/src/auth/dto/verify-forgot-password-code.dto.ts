import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyForgotPasswordCodeDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6)
  code: string;
}
