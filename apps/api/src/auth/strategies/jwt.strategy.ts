import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RedisService } from '../../redis/redis.service';
import { JwtPayload } from '../types/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  // Passport calls this once the token's signature/expiry check out. Its
  // return value becomes `req.user` on any route behind JwtAuthGuard.
  async validate(payload: JwtPayload) {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type.');
    }

    // A signature/expiry check alone can't see logout — a revoked-but-not-
    // yet-expired token would otherwise keep working for its full lifetime.
    if (await this.redisService.isRevoked(payload.jti)) {
      throw new UnauthorizedException('Token has been revoked.');
    }

    return {
      id: payload.sub,
      email: payload.email,
      jti: payload.jti,
      exp: payload.exp,
    };
  }
}
