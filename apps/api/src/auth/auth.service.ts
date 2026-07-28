import { randomInt, randomUUID } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { OAuthExchangeDto } from './dto/oauth-exchange.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyForgotPasswordCodeDto } from './dto/verify-forgot-password-code.dto';
import { VerifyLoginCodeDto } from './dto/verify-login-code.dto';
import { JwtPayload } from './types/jwt-payload.interface';

const SALT_ROUNDS = 12;
const OTP_TTL_SECONDS = 10 * 60;
const OTP_MAX_ATTEMPTS = 5;
const PASSWORD_RESET_TOKEN_EXPIRES_IN = '15m';
// Separate Redis OTP namespace from the login/register flow (both keyed by
// email) so a pending "forgot password" code can't collide with, or be
// overwritten by, a pending login code for the same address.
const PASSWORD_RESET_OTP_PREFIX = 'password-reset:';

interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
  ) {}

  // Creates the account, then sends a verification code the same as
  // login() below — a password only proves the user chose one, not that
  // they actually control this email address. verifyLoginCode is what
  // actually completes both registration and login; there's no separate
  // "instant" registration path anymore.
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        provider: 'CREDENTIALS',
      },
    });

    await this.sendVerificationCode(user.email);
    return { requiresVerification: true, email: user.email };
  }

  // Step 1 of credentials login: verify the password, then email a code
  // instead of returning tokens directly. Step 2 is verifyLoginCode below.
  async login(dto: LoginDto) {
    const user = await this.verifyPassword(dto.email, dto.password);
    await this.sendVerificationCode(user.email);
    return { requiresVerification: true, email: user.email };
  }

  private async sendVerificationCode(email: string) {
    const code = randomInt(100000, 1000000).toString();
    await this.redisService.setOtp(
      email,
      { code, attempts: 0 },
      OTP_TTL_SECONDS,
    );
    await this.mailService.sendLoginCode(email, code);
  }

  // Step 2: re-checks the password (not just the code) so a leaked/guessed
  // code alone can't complete a login — real 2FA, not "code instead of
  // password."
  async verifyLoginCode(dto: VerifyLoginCodeDto) {
    const user = await this.verifyPassword(dto.email, dto.password);

    const record = await this.redisService.getOtp(user.email);
    if (!record) {
      throw new UnauthorizedException(
        'Code expired or not requested. Please log in again.',
      );
    }

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await this.redisService.deleteOtp(user.email);
      throw new UnauthorizedException(
        'Too many incorrect attempts. Please log in again.',
      );
    }

    if (record.code !== dto.code) {
      await this.redisService.updateOtpAttempts(user.email, {
        code: record.code,
        attempts: record.attempts + 1,
      });
      throw new UnauthorizedException('Incorrect code.');
    }

    await this.redisService.deleteOtp(user.email);
    return this.buildAuthResponse(user);
  }

  // Step 1: emails a code if (and only if) the address belongs to an
  // account with a password — but always returns the same generic response
  // either way, so this endpoint can't be used to enumerate registered
  // emails or distinguish password-only vs. Google-only accounts.
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (user?.passwordHash) {
      const code = randomInt(100000, 1000000).toString();
      await this.redisService.setOtp(
        `${PASSWORD_RESET_OTP_PREFIX}${dto.email}`,
        { code, attempts: 0 },
        OTP_TTL_SECONDS,
      );
      await this.mailService.sendPasswordResetCode(dto.email, code);
    }

    return { requiresVerification: true, email: dto.email };
  }

  // Step 2: checks the emailed code, then issues a short-lived, single-use
  // token authorizing (only) the actual password change in step 3 — the
  // frontend never has to hold onto the code itself past this point.
  async verifyForgotPasswordCode(dto: VerifyForgotPasswordCodeDto) {
    const otpKey = `${PASSWORD_RESET_OTP_PREFIX}${dto.email}`;
    const record = await this.redisService.getOtp(otpKey);

    if (!record) {
      throw new UnauthorizedException(
        'Code expired or not requested. Please start over.',
      );
    }

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await this.redisService.deleteOtp(otpKey);
      throw new UnauthorizedException(
        'Too many incorrect attempts. Please start over.',
      );
    }

    if (record.code !== dto.code) {
      await this.redisService.updateOtpAttempts(otpKey, {
        code: record.code,
        attempts: record.attempts + 1,
      });
      throw new UnauthorizedException('Incorrect code.');
    }

    await this.redisService.deleteOtp(otpKey);

    // Re-fetch rather than trust the request — the account could have been
    // deleted in the (short) window since the code was requested.
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Account no longer exists.');
    }

    const resetToken = await this.signToken(
      user.id,
      user.email,
      'password_reset',
    );
    return { resetToken };
  }

  // Step 3: the only step that actually touches passwordHash. Doesn't
  // re-verify the code — the resetToken from step 2 already proves that —
  // but does burn the token immediately after use (via the same Redis
  // revocation blocklist logout uses) so it can't be replayed even though
  // it's still within its ~15min expiry.
  async resetPassword(dto: ResetPasswordDto) {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(
        dto.resetToken,
      );
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired reset link. Please start over.',
      );
    }

    if (payload.type !== 'password_reset') {
      throw new UnauthorizedException('Invalid token type.');
    }

    if (await this.redisService.isRevoked(payload.jti)) {
      throw new UnauthorizedException(
        'This reset link has already been used.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: payload.sub },
      data: { passwordHash },
    });

    if (payload.exp) {
      const now = Math.floor(Date.now() / 1000);
      await this.redisService.revoke(payload.jti, payload.exp - now);
    }
  }

  private async verifyPassword(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Same error whether the email doesn't exist or the password is wrong —
    // don't give attackers a way to enumerate registered emails.
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return user;
  }

  async loginWithOAuth(dto: OAuthExchangeDto) {
    // Link by email rather than rejecting: someone who registered with
    // Credentials and later clicks "Continue with Google" using the same
    // address gets signed into the *same* account instead of a duplicate
    // one. passwordHash is left untouched either way.
    let user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          avatarUrl: dto.avatarUrl,
          provider: 'GOOGLE',
        },
      });
    }

    return this.buildAuthResponse(user);
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type.');
    }

    // A logged-out refresh token is still cryptographically valid until its
    // natural 7-day expiry — this is what actually stops it from working.
    if (await this.redisService.isRevoked(payload.jti)) {
      throw new UnauthorizedException('Refresh token has been revoked.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException('User no longer exists.');
    }

    const accessToken = await this.signToken(user.id, user.email, 'access');
    return { accessToken };
  }

  // Revokes both the access token currently in use (so it stops working
  // immediately, not just after its ~15min lifetime) and the refresh token
  // (so it can't be used to mint new access tokens either).
  async logout(
    accessToken: { jti: string; exp?: number },
    refreshToken: string,
  ) {
    const now = Math.floor(Date.now() / 1000);

    if (accessToken.exp) {
      await this.redisService.revoke(accessToken.jti, accessToken.exp - now);
    }

    try {
      const payload =
        await this.jwtService.verifyAsync<JwtPayload>(refreshToken);
      if (payload.type === 'refresh' && payload.exp) {
        await this.redisService.revoke(payload.jti, payload.exp - now);
      }
    } catch {
      // Already invalid/expired — nothing left to revoke, not an error.
    }
  }

  // Deletes the account outright — Prisma's onDelete: Cascade on Resume,
  // InterviewSession, TechnicalPrepSession, etc. (schema.prisma) means this
  // one query removes all of the user's data, not just the row itself.
  // Doesn't need the refresh token: once the user row is gone, refresh()
  // already rejects it via its own "User no longer exists" check, so
  // there's nothing extra to revoke there — only the *current* access
  // token needs explicit revocation to stop working immediately.
  async deleteAccount(
    userId: string,
    accessToken: { jti: string; exp?: number },
  ) {
    if (accessToken.exp) {
      const now = Math.floor(Date.now() / 1000);
      await this.redisService.revoke(accessToken.jti, accessToken.exp - now);
    }

    await this.prisma.user.delete({ where: { id: userId } });
  }

  private async buildAuthResponse(user: AuthUser) {
    const [accessToken, refreshToken] = await Promise.all([
      this.signToken(user.id, user.email, 'access'),
      this.signToken(user.id, user.email, 'refresh'),
    ]);

    return {
      user: { id: user.id, email: user.email, name: user.name },
      accessToken,
      refreshToken,
    };
  }

  private signToken(userId: string, email: string, type: JwtPayload['type']) {
    const payload: JwtPayload = { sub: userId, email, type, jti: randomUUID() };

    if (type === 'password_reset') {
      return this.jwtService.signAsync(payload, {
        expiresIn: PASSWORD_RESET_TOKEN_EXPIRES_IN,
      });
    }

    // configService.get<string>(...) returns a plain `string`, but
    // JwtSignOptions wants the stricter `ms`-style literal type — the value
    // itself ("15m", "7d") is valid, so we assert rather than widen the type.
    const expiresIn = this.configService.get<string>(
      type === 'access' ? 'JWT_ACCESS_EXPIRES_IN' : 'JWT_REFRESH_EXPIRES_IN',
    ) as JwtSignOptions['expiresIn'];

    return this.jwtService.signAsync(payload, { expiresIn });
  }
}
