export interface JwtPayload {
  sub: string; // userId
  email: string;
  role: string; // system role
  userType: string;
  approvalStatus: string;
  hasPlan: boolean;
  sid?: string; // sessionId
  currentOrgId?: string; // org context
  mfaVerified?: boolean;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload extends JwtPayload {
  refreshToken?: string;
}
