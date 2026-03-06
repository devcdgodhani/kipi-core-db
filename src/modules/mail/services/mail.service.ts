import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { SendMailOptions, MailTemplate } from '../interfaces/mail.interface';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;
  private readonly templateCache = new Map<MailTemplate, HandlebarsTemplateDelegate>();

  constructor(private configService: ConfigService) {
    const port = this.configService.get<number>('mail.port') ?? 587;
    const secure = this.configService.get<boolean>('mail.secure') ?? false;

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('mail.host'),
      port,
      secure, // true → implicit TLS (port 465); false → STARTTLS (port 587)
      auth: {
        user: this.configService.get<string>('mail.user'),
        pass: this.configService.get<string>('mail.password'),
      },
      tls: {
        // Allow self-signed certs in dev; in prod set to true
        rejectUnauthorized: false,
      },
    });

    // Verify SMTP connection on startup (non-blocking)
    this.transporter
      .verify()
      .then(() => {
        this.logger.log('✅ SMTP transporter connected successfully');
      })
      .catch((err) => {
        this.logger.error(`❌ SMTP transporter connection failed: ${err.message}`);
        this.logger.warn('Emails will NOT be sent until SMTP is configured correctly.');
      });
  }

  /**
   * Compile and cache a Handlebars template from disk.
   */
  private getTemplate(name: MailTemplate): HandlebarsTemplateDelegate {
    if (this.templateCache.has(name)) {
      return this.templateCache.get(name)!;
    }

    // Try src/templates first (dev), then dist/templates (prod)
    const possiblePaths = [
      path.join(process.cwd(), 'src', 'templates', `${name}.hbs`),
      path.join(process.cwd(), 'dist', 'templates', `${name}.hbs`),
      path.join(__dirname, '..', '..', '..', 'templates', `${name}.hbs`),
    ];

    let templateSource: string | null = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        templateSource = fs.readFileSync(p, 'utf8');
        break;
      }
    }

    if (!templateSource) {
      throw new Error(`Email template "${name}" not found`);
    }

    const compiled = Handlebars.compile(templateSource);
    this.templateCache.set(name, compiled);
    return compiled;
  }

  /**
   * Send a templated email.
   */
  async sendMail(options: SendMailOptions): Promise<void> {
    try {
      const template = this.getTemplate(options.template);
      const html = template(options.context);

      await this.transporter.sendMail({
        from: this.configService.get<string>('mail.from'),
        to: options.to,
        subject: options.subject,
        html,
      });

      this.logger.log(`Email [${options.template}] sent to ${options.to}`);
    } catch (err) {
      this.logger.error(
        `Failed to send email [${options.template}] to ${options.to}: ${err.message}`,
      );
      // Do NOT re-throw — email failures should not break auth flow
    }
  }

  // ─── Convenience Methods ─────────────────────────────────────────────────

  async sendEmailVerificationOtp(to: string, firstName: string, otp: string): Promise<void> {
    const appName = this.configService.get<string>('mail.appName', 'JusticeLynk');
    await this.sendMail({
      to,
      subject: `${otp} is your ${appName} verification code`,
      template: 'email-verification',
      context: { firstName, otp, expiresInMinutes: 10, appName, year: new Date().getFullYear() },
    });
  }

  async sendLoginOtp(to: string, firstName: string, otp: string): Promise<void> {
    const appName = this.configService.get<string>('mail.appName', 'JusticeLynk');
    await this.sendMail({
      to,
      subject: `${otp} is your ${appName} login verification code`,
      template: 'login-otp',
      context: { firstName, otp, expiresInMinutes: 10, appName, year: new Date().getFullYear() },
    });
  }

  async sendForgotPasswordOtp(to: string, firstName: string, otp: string): Promise<void> {
    const appName = this.configService.get<string>('mail.appName', 'JusticeLynk');
    await this.sendMail({
      to,
      subject: `${otp} — Reset your ${appName} password`,
      template: 'forgot-password',
      context: { firstName, otp, expiresInMinutes: 15, appName, year: new Date().getFullYear() },
    });
  }

  async sendPasswordChangedConfirmation(to: string, firstName: string): Promise<void> {
    const appName = this.configService.get<string>('mail.appName', 'JusticeLynk');
    const appUrl = this.configService.get<string>('mail.appUrl', 'http://localhost:3000');
    await this.sendMail({
      to,
      subject: `Your ${appName} password has been changed`,
      template: 'password-changed',
      context: { firstName, appName, appUrl, year: new Date().getFullYear() },
    });
  }

  async sendWelcomeEmail(to: string, firstName: string, userType: string): Promise<void> {
    const appName = this.configService.get<string>('mail.appName', 'JusticeLynk');
    const appUrl = this.configService.get<string>('mail.appUrl', 'http://localhost:3000');
    await this.sendMail({
      to,
      subject: `Welcome to ${appName} — Your account is ready!`,
      template: 'welcome',
      context: { firstName, userType, appName, appUrl, year: new Date().getFullYear() },
    });
  }

  async sendAccountRejectedEmail(to: string, firstName: string, userType: string, note?: string): Promise<void> {
    const appName = this.configService.get<string>('mail.appName', 'JusticeLynk');
    const appUrl = this.configService.get<string>('mail.appUrl', 'http://localhost:3000');
    await this.sendMail({
      to,
      subject: `Application Update from ${appName}`,
      template: 'account-rejected',
      context: { firstName, userType, note, appName, appUrl, year: new Date().getFullYear() },
    });
  }

  async sendAccountSuspendedEmail(to: string, firstName: string, note?: string): Promise<void> {
    const appName = this.configService.get<string>('mail.appName', 'JusticeLynk');
    const appUrl = this.configService.get<string>('mail.appUrl', 'http://localhost:3000');
    await this.sendMail({
      to,
      subject: `Action Required: Account Suspended — ${appName}`,
      template: 'account-suspended',
      context: { firstName, note, appName, appUrl, year: new Date().getFullYear() },
    });
  }
}
