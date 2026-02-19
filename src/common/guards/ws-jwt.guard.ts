import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
    constructor(private jwtService: JwtService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        try {
            const client: Socket = context.switchToWs().getClient<Socket>();
            const authToken = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];

            if (!authToken) {
                throw new WsException('Missing authentication token');
            }

            const payload = await this.jwtService.verifyAsync(authToken);
            // Attach user to socket
            client.data.user = payload;

            // Join user and organization rooms for targeted events
            client.join(`user:${payload.sub}`);
            if (payload.currentOrgId) {
                client.join(`org:${payload.currentOrgId}`);
            }

            return true;
        } catch (err) {
            throw new WsException('Invalid authentication token');
        }
    }
}
