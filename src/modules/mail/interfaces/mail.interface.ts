export type MailTemplate =
  | 'email-verification'
  | 'login-otp'
  | 'forgot-password'
  | 'password-changed'
  | 'welcome'
  | 'account-rejected'
  | 'account-suspended';

export interface SendMailOptions {
  to: string;
  subject: string;
  template: MailTemplate;
  context: Record<string, unknown>;
}

export interface EmailVerificationContext {
  firstName: string;
  otp: string;
  expiresInMinutes: number;
  appName: string;
  year: number;
}

export interface LoginOtpContext {
  firstName: string;
  otp: string;
  expiresInMinutes: number;
  appName: string;
  year: number;
}

export interface ForgotPasswordContext {
  firstName: string;
  otp: string;
  expiresInMinutes: number;
  appName: string;
  year: number;
}

export interface PasswordChangedContext {
  firstName: string;
  appName: string;
  appUrl: string;
  year: number;
}

export interface WelcomeContext {
  firstName: string;
  userType: string;
  appName: string;
  appUrl: string;
  year: number;
}

export interface AccountStatusContext {
  firstName: string;
  userType?: string;
  note?: string;
  appName: string;
  appUrl: string;
  year: number;
}
