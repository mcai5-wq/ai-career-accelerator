import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyLoginCodeDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  @Length(6, 6)
  code: string;
}
