import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class MfaGuard implements CanActivate {
    constructor(private prisma: PrismaService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) throw new UnauthorizedException();

        const security = await this.prisma.userSecurity.findUnique({
            where: { userId: user.sub },
            select: { mfaEnabled: true },
        });

        if (security?.mfaEnabled) {
            // Check if MFA was recently verified in this session
            // This usually comes from a specific claim in the JWT or a session flag
            if (!user.mfaVerified) {
                throw new ForbiddenException('MFA verification required for this action');
            }
        }

        return true;
    }
}
