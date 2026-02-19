/**
 * Socket.IO event names for JusticeLynk real-time features.
 * Use these constants everywhere — never hardcode event strings.
 */
export const SOCKET_EVENTS = {
  // ── Connection ─────────────────────────────────────────────
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  AUTHENTICATED: 'authenticated',
  UNAUTHORIZED: 'unauthorized',

  // ── Room management ────────────────────────────────────────
  JOIN_ROOM: 'room.join',
  LEAVE_ROOM: 'room.leave',
  ROOM_JOINED: 'room.joined',
  ROOM_LEFT: 'room.left',
  JOINED: 'joined',

  // ── Chat messages ──────────────────────────────────────────
  MESSAGE_SEND: 'message.send',
  SEND_MESSAGE: 'send_message',
  MESSAGE_RECEIVE: 'message.receive',
  NEW_MESSAGE: 'new_message',
  MESSAGE_DELIVERED: 'message.delivered',
  MESSAGE_READ: 'message.read',
  MESSAGE_DELETED: 'message.deleted',

  // ── Typing indicators ─────────────────────────────────────
  TYPING: 'typing',
  STOP_TYPING: 'stop_typing',
  TYPING_START: 'typing.start',
  TYPING_STOP: 'typing.stop',
  USER_TYPING: 'user_typing',
  USER_STOP_TYPING: 'user_stop_typing',

  // ── Presence ──────────────────────────────────────────────
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',

  // ── Case events ────────────────────────────────────────────
  CASE_CREATED: 'case.created',
  CASE_UPDATED: 'case.updated',
  CASE_ASSIGNED: 'case.assigned',
  CASE_STATUS_CHANGED: 'case.status_changed',
  CASE_DOCUMENT_ADDED: 'case.document_added',
  CASE_NOTE_ADDED: 'case.note_added',

  // ── Notifications ──────────────────────────────────────────
  NOTIFICATION_NEW: 'notification.new',
  NOTIFICATION_READ: 'notification.read',
  NOTIFICATION_CLEAR_ALL: 'notification.clear_all',

  // ── Errors ────────────────────────────────────────────────
  ERROR: 'error',
  VALIDATION_ERROR: 'validation.error',
} as const;

/**
 * Socket room helpers (callable as SOCKET_ROOMS.user(id) or SOCKET_ROOMS.USER(id))
 */
export const SOCKET_ROOMS = {
  case: (caseId: string) => `case:${caseId}`,
  org: (orgId: string) => `org:${orgId}`,
  user: (userId: string) => `user:${userId}`,
  // Uppercase aliases for backward compatibility
  CASE: (caseId: string) => `case:${caseId}`,
  ORG: (orgId: string) => `org:${orgId}`,
  USER: (userId: string) => `user:${userId}`,
};

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
