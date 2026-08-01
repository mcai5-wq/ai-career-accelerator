import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

// Sent by the Next.js server after it's already verified the user with
// Google — see InternalApiKeyGuard for how this route trusts the caller.
export class OAuthExchangeDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
