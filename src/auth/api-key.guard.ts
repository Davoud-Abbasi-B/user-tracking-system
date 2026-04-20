import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { createHash, timingSafeEqual } from 'node:crypto';
import { PUBLIC_ROUTE_KEY } from './public.decorator';
import { RequestWithAuth } from './auth-context';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const suppliedKey = this.readHeader(request, 'x-api-key');

    if (!suppliedKey) {
      throw new UnauthorizedException({
        success: false,
        error_code: 'UNAUTHORIZED',
        message: 'x-api-key is required'
      });
    }

    const clientKey = this.configService.get<string>('API_KEY');
    const backendKey = this.configService.get<string>('BACKEND_API_KEY');

    if (backendKey && this.secureEquals(suppliedKey, backendKey)) {
      request.authContext = { role: 'backend', keyId: this.keyId(backendKey) };
      return true;
    }

    if (clientKey && this.secureEquals(suppliedKey, clientKey)) {
      request.authContext = { role: 'client', keyId: this.keyId(clientKey) };
      return true;
    }

    throw new UnauthorizedException({
      success: false,
      error_code: 'UNAUTHORIZED',
      message: 'invalid API key'
    });
  }

  private readHeader(request: RequestWithAuth, name: string): string | undefined {
    const value = request.headers[name] ?? request.headers[name.toLowerCase()];
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }

  private secureEquals(left: string, right: string): boolean {
    const leftHash = createHash('sha256').update(left).digest();
    const rightHash = createHash('sha256').update(right).digest();
    return timingSafeEqual(leftHash, rightHash);
  }

  private keyId(key: string): string {
    return createHash('sha256').update(key).digest('hex').slice(0, 12);
  }
}
