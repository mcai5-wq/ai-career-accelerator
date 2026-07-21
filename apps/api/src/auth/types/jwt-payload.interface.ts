export interface JwtPayload {
  /** Subject — the user's id. */
  sub: string;
  email: string;
  /** Distinguishes access vs. refresh tokens so one can't be used as the other. */
  type: 'access' | 'refresh';
}
