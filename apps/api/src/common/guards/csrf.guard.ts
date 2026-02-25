import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * CSRF double-submit cookie guard.
 *
 * For every mutating request (POST/PUT/PATCH/DELETE) that carries a cookie-based
 * access token, the client must also send the value of the `csrf-token` cookie as
 * the `X-CSRF-Token` header.  Safe methods (GET, HEAD, OPTIONS) are always allowed.
 *
 * Requests that do NOT use cookie auth (e.g. Bearer-only mobile clients) skip
 * this check entirely.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Safe methods never need CSRF protection
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return true;
    }

    // Check if the route is marked as @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Public routes (login, register, etc.) don't need CSRF protection
    if (isPublic) {
      return true;
    }

    // If the request does not carry a cookie-based access token this is a
    // Bearer-only request (mobile, Postman, etc.) — skip CSRF check.
    if (!request.cookies?.accessToken) {
      return true;
    }

    // Double-submit: compare cookie value with header value
    const csrfCookie = request.cookies?.['csrf-token'];
    const csrfHeader = request.headers['x-csrf-token'] as string;

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      throw new ForbiddenException('Invalid or missing CSRF token');
    }

    return true;
  }
}
