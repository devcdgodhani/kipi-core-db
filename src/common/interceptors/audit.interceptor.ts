import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AUDIT_KEY, AuditMetadata } from '../decorators/audit.decorator';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
    constructor(
        private reflector: Reflector,
        private prisma: PrismaService,
    ) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const auditMetadata = this.reflector.get<AuditMetadata>(
            AUDIT_KEY,
            context.getHandler(),
        );

        const request = context.switchToHttp().getRequest();
        const { user, method, url, ip } = request;
        const userAgent = request.headers['user-agent'];

        return next.handle().pipe(
            tap(async (data) => {
                if (!auditMetadata) return;

                // Extract old data if it exists (e.g., from body for updates)
                // In a real scenario, you might want to fetch the previous state from DB
                const oldData = method === 'PATCH' || method === 'PUT' ? request.body : null;

                await this.prisma.auditLog.create({
                    data: {
                        userId: user?.sub,
                        orgId: request.headers['x-org-id'] || user?.currentOrgId,
                        module: auditMetadata.module,
                        action: auditMetadata.action,
                        entityType: auditMetadata.module, // Simplified
                        entityId: data?.id || request.params?.id,
                        oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : undefined,
                        newData: data ? JSON.parse(JSON.stringify(data)) : undefined,
                        ipAddress: ip,
                        userAgent: userAgent,
                        metadata: {
                            url,
                            method,
                        },
                    },
                });
            }),
        );
    }
}
