import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { TokenPayloadDto } from '../dto/auth.dto';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as TokenPayloadDto;

    if (!user?.isSuperAdmin) {
      throw new ForbiddenException('Requires super admin privileges');
    }

    return true;
  }
}
