import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect, MessageBody,
  ConnectedSocket, WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';
import { SOCKET_EVENTS, SOCKET_ROOMS } from '../../../common/constants/socket-events.constants';
import { ChatService } from '../services/chat.service';
import { WsJwtGuard } from '../../../common/guards/ws-jwt.guard';
import { AuditService } from '../../audit/services/audit.service';
import { MODULE_KEYS } from '../../../common/constants/modules.constants';
import { ACTION_KEYS } from '../../../common/constants/permissions.constants';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  orgId?: string;
}

@WebSocketGateway({
  cors: { origin: true, credentials: true }, // 'true' inherits from main app or handles dynamically
  namespace: '/chat'
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);
  private onlineUsers = new Map<string, string>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private chatService: ChatService,
  ) {
    this.logger.log('✅ ChatGateway initialized on namespace: /chat');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '') ||
        client.handshake.query?.token;

      if (!token || typeof token !== 'string') throw new WsException('Missing auth token');

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('jwt.secret')
      });

      client.userId = payload.sub;
      client.orgId = payload.orgId || (client.handshake.query?.orgId as string);

      this.onlineUsers.set(client.userId, client.id);

      // Join standard rooms
      client.join(SOCKET_ROOMS.user(client.userId));
      if (client.orgId) {
        client.join(SOCKET_ROOMS.org(client.orgId));
      }

      this.server.emit(SOCKET_EVENTS.USER_ONLINE, { userId: client.userId });

      // Send initial presence list to the new client
      client.emit('initial_presence', Array.from(this.onlineUsers.keys()));

      this.logger.log(`WS Connected: ${client.userId} (Org: ${client.orgId})`);
    } catch (error) {
      this.logger.warn(`WS Unauthorized: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.onlineUsers.delete(client.userId);
      this.server.emit(SOCKET_EVENTS.USER_OFFLINE, { userId: client.userId });
      this.logger.log(`WS Disconnected: ${client.userId}`);
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.JOIN_ROOM)
  async handleJoinRoom(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() data: { caseId: string }) {
    client.join(SOCKET_ROOMS.case(data.caseId));
    this.logger.log(`User ${client.userId} joined case room: ${data.caseId}`);
    client.emit(SOCKET_EVENTS.ROOM_JOINED, { room: data.caseId });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage(SOCKET_EVENTS.LEAVE_ROOM)
  async handleLeaveRoom(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() data: { caseId: string }) {
    client.leave(SOCKET_ROOMS.case(data.caseId));
    this.logger.log(`User ${client.userId} left case room: ${data.caseId}`);
    client.emit(SOCKET_EVENTS.ROOM_LEFT, { room: data.caseId });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage(SOCKET_EVENTS.SEND_MESSAGE)
  async handleMessage(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() data: { caseId: string; content: string }) {
    const message = await this.chatService.sendMessage(client.userId, client.orgId, data);
    this.server.to(SOCKET_ROOMS.case(data.caseId)).emit(SOCKET_EVENTS.NEW_MESSAGE, message);
    return message;
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage(SOCKET_EVENTS.MESSAGE_READ)
  async handleMessageRead(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() data: { messageId: string }) {
    const updated = await this.chatService.markAsRead(client.userId, client.orgId, data.messageId);
    this.server.to(SOCKET_ROOMS.case(updated.caseId)).emit(SOCKET_EVENTS.MESSAGE_READ, { messageId: updated.id, userId: client.userId });
    return updated;
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage(SOCKET_EVENTS.MESSAGE_DELETED)
  async handleMessageDelete(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() data: { messageId: string }) {
    const deleted = await this.chatService.deleteMessage(client.userId, client.orgId, data.messageId);
    this.server.to(SOCKET_ROOMS.case(deleted.caseId)).emit(SOCKET_EVENTS.MESSAGE_DELETED, { messageId: deleted.id });
    return { success: true };
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
