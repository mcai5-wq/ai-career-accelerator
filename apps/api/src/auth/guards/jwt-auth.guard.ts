import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// AuthGuard('jwt') runs the strategy registered under the name 'jwt'
// (JwtStrategy, via PassportStrategy(Strategy) with no name override).
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
