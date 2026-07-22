import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

// Sent only by the Next.js server (never a browser) once it has already
// verified the user's identity with the OAuth provider — this endpoint
// trusts the caller (see InternalApiKeyGuard), not a password.
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
