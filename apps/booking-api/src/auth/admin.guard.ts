import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user?: {
    role?: UserRole;
  };
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('Admin access required');
    }

    if (user.role === UserRole.ADMIN || user.role === UserRole.STAFF) {
      return true;
    }

    throw new ForbiddenException('Admin access required');
  }
}
