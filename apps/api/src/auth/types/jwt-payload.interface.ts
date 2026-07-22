export interface JwtPayload {
  /** Subject — the user's id. */
  sub: string;
  email: string;
  /** Distinguishes access vs. refresh tokens so one can't be used as the other. */
  type: 'access' | 'refresh';
  /** Unique per-token id — how a specific token gets targeted in the Redis revocation blocklist (logout). */
  jti: string;
  /** Populated automatically by jsonwebtoken via the `expiresIn` sign option — never set manually, only read (e.g. to size a revocation TTL). */
  exp?: number;
}
