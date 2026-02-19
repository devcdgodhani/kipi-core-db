import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect, MessageBody,
  ConnectedSocket, WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';
import { SOCKET_EVENTS, SOCKET_ROOMS } from '../../../common/constants/socket-events.constants';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  orgId?: string;
}

@WebSocketGateway({ cors: { origin: '*', credentials: true }, namespace: '/chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);
  private onlineUsers = new Map<string, string>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) throw new WsException('Missing auth token');
      const payload = await this.jwtService.verifyAsync(token, { secret: this.configService.get<string>('jwt.secret') });
      client.userId = payload.sub;
      client.orgId = payload.orgId;
      this.onlineUsers.set(payload.sub, client.id);
      client.join(SOCKET_ROOMS.user(payload.sub));
      if (payload.orgId) client.join(SOCKET_ROOMS.org(payload.orgId));
      this.server.emit(SOCKET_EVENTS.USER_ONLINE, { userId: payload.sub });
      this.logger.log(`WS connected: ${payload.sub}`);
    } catch (error) {
      this.logger.warn(`WS unauthorized: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.onlineUsers.delete(client.userId);
      this.server.emit(SOCKET_EVENTS.USER_OFFLINE, { userId: client.userId });
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.JOIN_ROOM)
  async handleJoinRoom(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() data: { caseId: string }) {
    client.join(SOCKET_ROOMS.case(data.caseId));
    client.emit(SOCKET_EVENTS.JOINED, { room: data.caseId });
  }

  @SubscribeMessage(SOCKET_EVENTS.LEAVE_ROOM)
  async handleLeaveRoom(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() data: { caseId: string }) {
    client.leave(SOCKET_ROOMS.case(data.caseId));
  }

  @SubscribeMessage(SOCKET_EVENTS.SEND_MESSAGE)
  async handleMessage(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() data: { caseId: string; content: string; type?: string; metadata?: any }) {
    if (!client.userId) throw new WsException('Not authenticated');
    const message = await this.prisma.caseMessage.create({
      data: { caseId: data.caseId, senderId: client.userId, content: data.content },
      include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
    });
    this.server.to(SOCKET_ROOMS.case(data.caseId)).emit(SOCKET_EVENTS.NEW_MESSAGE, message);
    return message;
  }

  @SubscribeMessage(SOCKET_EVENTS.TYPING)
  handleTyping(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() data: { caseId: string }) {
    client.to(SOCKET_ROOMS.case(data.caseId)).emit(SOCKET_EVENTS.USER_TYPING, { userId: client.userId, caseId: data.caseId });
  }

  @SubscribeMessage(SOCKET_EVENTS.STOP_TYPING)
  handleStopTyping(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() data: { caseId: string }) {
    client.to(SOCKET_ROOMS.case(data.caseId)).emit(SOCKET_EVENTS.USER_STOP_TYPING, { userId: client.userId, caseId: data.caseId });
  }

  sendToUser(userId: string, event: string, data: any) { this.server.to(SOCKET_ROOMS.user(userId)).emit(event, data); }
  sendToOrg(orgId: string, event: string, data: any) { this.server.to(SOCKET_ROOMS.org(orgId)).emit(event, data); }
  sendToCase(caseId: string, event: string, data: any) { this.server.to(SOCKET_ROOMS.case(caseId)).emit(event, data); }
  getOnlineUsers(): string[] { return Array.from(this.onlineUsers.keys()); }
}
