import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

// Protects server-to-server routes (called only by the Next.js backend,
// never by a browser) with a shared secret instead of a user JWT — there's
// no end user to hold a Bearer token at this point in the OAuth flow.
@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const providedKey = request.headers['x-internal-api-key'];
    const expectedKey = this.configService.get<string>('INTERNAL_API_KEY');

    if (!providedKey || providedKey !== expectedKey) {
      throw new UnauthorizedException('Invalid internal API key.');
    }

    return true;
  }
}
