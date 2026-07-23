import { IsEmail, IsString, Length } from 'class-validator';

// Requires the password again (not just the code) so a leaked/guessed code
// alone isn't sufficient to sign in — real two-factor semantics: something
// you know (password) + something you have (access to the email).
export class VerifyLoginCodeDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  @Length(6, 6)
  code: string;
}
