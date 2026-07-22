import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { LoginDto } from './dto/login.dto';
import { OAuthExchangeDto } from './dto/oauth-exchange.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './types/jwt-payload.interface';

const SALT_ROUNDS = 12;

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
  ) {}

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

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Same error whether the email doesn't exist or the password is wrong —
    // don't give attackers a way to enumerate registered emails.
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.buildAuthResponse(user);
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
    // configService.get<string>(...) returns a plain `string`, but
    // JwtSignOptions wants the stricter `ms`-style literal type — the value
    // itself ("15m", "7d") is valid, so we assert rather than widen the type.
    const expiresIn = this.configService.get<string>(
      type === 'access' ? 'JWT_ACCESS_EXPIRES_IN' : 'JWT_REFRESH_EXPIRES_IN',
    ) as JwtSignOptions['expiresIn'];

    return this.jwtService.signAsync(payload, { expiresIn });
  }
}
