import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.client = new Redis(this.configService.get<string>('REDIS_URL')!);
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  // Token blocklist — the revoked flag only needs to outlive the token's
  // own expiry, since it'd get rejected as expired after that anyway.
  async revoke(jti: string, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) return;
    await this.client.set(`revoked:${jti}`, '1', 'EX', ttlSeconds);
  }

  async isRevoked(jti: string): Promise<boolean> {
    const value = await this.client.get(`revoked:${jti}`);
    return value !== null;
  }

  async setOtp(
    email: string,
    record: { code: string; attempts: number },
    ttlSeconds: number,
  ): Promise<void> {
    await this.client.set(
      `otp:${email}`,
      JSON.stringify(record),
      'EX',
      ttlSeconds,
    );
  }

  async getOtp(
    email: string,
  ): Promise<{ code: string; attempts: number } | null> {
    const value = await this.client.get(`otp:${email}`);
    return value
      ? (JSON.parse(value) as { code: string; attempts: number })
      : null;
  }

  // KEEPTTL so a failed attempt doesn't buy the caller a fresh 10 minutes.
  async updateOtpAttempts(
    email: string,
    record: { code: string; attempts: number },
  ): Promise<void> {
    await this.client.set(`otp:${email}`, JSON.stringify(record), 'KEEPTTL');
  }

  async deleteOtp(email: string): Promise<void> {
    await this.client.del(`otp:${email}`);
  }
}
