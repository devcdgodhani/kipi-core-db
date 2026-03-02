import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay = require('razorpay');
import * as crypto from 'crypto';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/services/audit.service';
import { SubscriptionPlansService } from '../../subscriptions/services/subscription-plans.service';
import { UserSubscriptionsService } from '../../subscriptions/services/user-subscriptions.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { buildPaginatedResponse, getPaginationParams } from '../../../common/utils/pagination.util';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private razorpay: Razorpay;
  private webhookSecret: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private auditService: AuditService,
    private planService: SubscriptionPlansService,
    private userSubscriptionService: UserSubscriptionsService,
    private notificationsService: NotificationsService,
  ) {
    this.razorpay = new Razorpay({
      key_id: this.configService.get<string>('payment.razorpay.keyId'),
      key_secret: this.configService.get<string>('payment.razorpay.keySecret'),
    });
    this.webhookSecret = this.configService.get<string>('payment.razorpay.webhookSecret');
  }

  async createOrder(planId: string, userId: string, billingInterval: 'monthly' | 'yearly') {
    const plan = await this.planService.getPlanById(planId);
    const price = billingInterval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
    const amountInPaise = Math.round(Number(price) * 100);
    const order = await this.razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      notes: { planId, userId, billingInterval },
    });
    await this.prisma.payment.create({
      data: {
        userId,
        amount: price,
        currency: 'INR',
        status: 'pending',
        orderId: order.id as string,
        metadata: { planId, billingInterval },
      },
    });
    await this.auditService.log({
      userId,
      module: 'payments',
      action: 'create_order',
      entityType: 'payment',
      newData: { planId, amount: price, billingInterval },
    });
    return {
      orderId: order.id,
      amount: amountInPaise,
      currency: 'INR',
      keyId: this.configService.get<string>('payment.razorpayKeyId'),
    };
  }

  async verifyAndActivate(
    userId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    signature: string,
  ) {
    const expectedSig = crypto
      .createHmac('sha256', this.configService.get<string>('payment.razorpayKeySecret'))
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');
    if (expectedSig !== signature)
      throw new BadRequestException('Payment signature verification failed');

    const payment = await this.prisma.payment.findFirst({ where: { orderId: razorpayOrderId } });
    if (!payment) throw new NotFoundException('Payment record not found');

    const planId = (payment.metadata as any)?.planId;
    const billingInterval = (payment.metadata as any)?.billingInterval || 'monthly';
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'completed', externalId: razorpayPaymentId },
    });
    await this.userSubscriptionService.subscribe(userId, planId, billingInterval);
    await this.notificationsService.send({
      userId,
      type: 'system',
      title: 'Subscription Activated',
      body: 'Your subscription has been successfully activated.',
      entityType: 'payment',
      entityId: payment.id,
    });
    await this.auditService.log({
      userId,
      module: 'payments',
      action: 'payment_success',
      entityType: 'payment',
      entityId: payment.id,
    });
    return { message: 'Payment verified and subscription activated' };
  }

  async handleWebhook(payload: string, signature: string) {
    const expectedSig = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');
    if (expectedSig !== signature) throw new BadRequestException('Webhook signature mismatch');
    const event = JSON.parse(payload);
    this.logger.log(`Razorpay webhook: ${event.event}`);
    if (event.event === 'payment.failed') {
      const orderId = event.payload?.payment?.entity?.order_id;
      if (orderId)
        await this.prisma.payment.updateMany({ where: { orderId }, data: { status: 'failed' } });
    }
    return { received: true };
  }

  async getHistory(userId: string, page = 1, limit = 20) {
    const { skip, take } = getPaginationParams({ page, limit });
    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where: { userId } }),
    ]);
    return buildPaginatedResponse(items, total, { page, limit });
  }
}
