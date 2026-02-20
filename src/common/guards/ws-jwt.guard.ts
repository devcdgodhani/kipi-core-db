import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { SOCKET_ROOMS } from '../constants/socket-events.constants';

@Injectable()
export class WsJwtGuard implements CanActivate {
    constructor(
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        try {
            const client: Socket = context.switchToWs().getClient<Socket>();
            const authToken = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1] || client.handshake.query?.token;

            if (!authToken || typeof authToken !== 'string') {
                throw new WsException('Missing authentication token');
            }

            const payload = await this.jwtService.verifyAsync(authToken, {
                secret: this.configService.get<string>('jwt.secret'),
            });

            // Attach user and identifiers directly to client for gateway compatibility
            client.data.user = payload;
            (client as any).userId = payload.sub;
            (client as any).orgId = payload.orgId || client.handshake.query?.orgId;

            const orgId = (client as any).orgId;

            // Join user and organization rooms
            client.join(SOCKET_ROOMS.user(payload.sub));
            if (orgId) {
                client.join(SOCKET_ROOMS.org(orgId as string));
            }

            return true;
        } catch (err) {
            throw new WsException('Invalid authentication token');
        }
    }
}
