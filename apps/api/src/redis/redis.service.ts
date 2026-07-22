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

  // Used as a token blocklist: a jti marked revoked stays that way only
  // until the token's own expiry — after that it would be rejected as
  // expired anyway, so there's no reason to remember it any longer.
  async revoke(jti: string, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) return;
    await this.client.set(`revoked:${jti}`, '1', 'EX', ttlSeconds);
  }

  async isRevoked(jti: string): Promise<boolean> {
    const value = await this.client.get(`revoked:${jti}`);
    return value !== null;
  }
}
