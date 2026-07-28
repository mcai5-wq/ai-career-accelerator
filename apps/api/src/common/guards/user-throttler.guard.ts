import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// Tracks authenticated requests by user id instead of IP, so limits on
// AI-calling routes apply per-account rather than per-network — several
// users behind the same IP/NAT don't throttle each other, and one user
// can't dodge the limit by switching IPs while still logged in.
//
// Must run AFTER JwtAuthGuard so `req.user` is already populated — apply
// it at the method level on controllers whose class-level guard is
// JwtAuthGuard (global guards run first, then class-level, then
// method-level), never as a global guard itself.
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    const userId = (req.user as { id?: string } | undefined)?.id;
    return Promise.resolve(userId ?? String(req.ip));
  }
}
