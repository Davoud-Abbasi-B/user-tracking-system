import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { PUBLIC_ROUTE_KEY } from './public.decorator';
import { RequestWithAuth } from './auth-context';

type Bucket = {
  count: number;
  resetAt: number;
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector
  ) {
    setInterval(() => this.pruneExpiredBuckets(), 60_000).unref();
  }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const role = request.authContext?.role ?? 'client';
    const keyId = request.authContext?.keyId ?? request.ip ?? 'unknown';
    const windowMs = Number(this.configService.get<string>('RATE_LIMIT_WINDOW_MS') ?? 60_000);
    const limit =
      role === 'backend'
        ? Number(this.configService.get<string>('RATE_LIMIT_BACKEND_MAX') ?? 30_000)
        : Number(this.configService.get<string>('RATE_LIMIT_CLIENT_MAX') ?? 10_000);

    const bucketKey = `${role}:${keyId}`;
    const now = Date.now();
    const bucket = this.buckets.get(bucketKey);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
      return true;
    }

    bucket.count += 1;

    if (bucket.count > limit) {
      throw new HttpException(
        {
          success: false,
          error_code: 'RATE_LIMITED',
          message: 'too many requests'
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return true;
  }

  private pruneExpiredBuckets() {
    const now = Date.now();
    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}
