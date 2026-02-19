import {
  Injectable, BadRequestException, NotFoundException, Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/services/audit.service';
import { SubscriptionService } from '../../subscription/services/subscription.service';
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
    private subscriptionService: SubscriptionService,
    private notificationsService: NotificationsService,
  ) {
    this.razorpay = new Razorpay({
      key_id: this.configService.get<string>('payment.razorpayKeyId'),
      key_secret: this.configService.get<string>('payment.razorpayKeySecret'),
    });
    this.webhookSecret = this.configService.get<string>('payment.razorpayWebhookSecret');
  }

  async createOrder(orgId: string, planId: string, userId: string) {
    const plan = await this.subscriptionService.getPlanById(planId);
    const amountInPaise = Math.round(Number(plan.price) * 100);
    const order = await this.razorpay.orders.create({ amount: amountInPaise, currency: 'INR', notes: { orgId, planId, userId } });
    await this.prisma.payment.create({
      data: { orgId, userId, amount: plan.price, currency: 'INR', status: 'pending', orderId: order.id as string, metadata: { planId } },
    });
    await this.auditService.log({ userId, orgId, module: 'payments', action: 'create_order', entityType: 'payment', newData: { planId, amount: plan.price } });
    return { orderId: order.id, amount: amountInPaise, currency: 'INR', keyId: this.configService.get<string>('payment.razorpayKeyId') };
  }

  async verifyAndActivate(orgId: string, userId: string, razorpayOrderId: string, razorpayPaymentId: string, signature: string) {
    const expectedSig = crypto.createHmac('sha256', this.configService.get<string>('payment.razorpayKeySecret'))
      .update(`${razorpayOrderId}|${razorpayPaymentId}`).digest('hex');
    if (expectedSig !== signature) throw new BadRequestException('Payment signature verification failed');

    const payment = await this.prisma.payment.findFirst({ where: { orderId: razorpayOrderId } });
    if (!payment) throw new NotFoundException('Payment record not found');

    const planId = (payment.metadata as any)?.planId;
    await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'completed', externalId: razorpayPaymentId } });
    await this.subscriptionService.subscribe(orgId, planId, userId);
    await this.notificationsService.send({ userId, type: 'system', title: 'Subscription Activated', body: 'Your subscription has been successfully activated.', entityType: 'payment', entityId: payment.id });
    await this.auditService.log({ userId, orgId, module: 'payments', action: 'payment_success', entityType: 'payment', entityId: payment.id });
    return { message: 'Payment verified and subscription activated' };
  }

  async handleWebhook(payload: string, signature: string) {
    const expectedSig = crypto.createHmac('sha256', this.webhookSecret).update(payload).digest('hex');
    if (expectedSig !== signature) throw new BadRequestException('Webhook signature mismatch');
    const event = JSON.parse(payload);
    this.logger.log(`Razorpay webhook: ${event.event}`);
    if (event.event === 'payment.failed') {
      const orderId = event.payload?.payment?.entity?.order_id;
      if (orderId) await this.prisma.payment.updateMany({ where: { orderId }, data: { status: 'failed' } });
    }
    return { received: true };
  }

  async getHistory(orgId: string, page = 1, limit = 20) {
    const { skip, take } = getPaginationParams({ page, limit });
    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({ where: { orgId }, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.payment.count({ where: { orgId } }),
    ]);
    return buildPaginatedResponse(items, total, { page, limit });
  }
}
