import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { OrganizationsRepository } from '../repositories/organizations.repository';
import { AuditService } from '../../audit/services/audit.service';
import { buildPaginatedResponse, getPaginationParams } from '../../../common/utils/pagination.util';
import { generateSecureToken } from '../../../common/utils/crypto.util';

@Injectable()
export class OrganizationsService {
  constructor(
    private orgsRepository: OrganizationsRepository,
    private auditService: AuditService,
  ) {}

  async create(data: any, userId: string) {
    const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const org = await this.orgsRepository.create({ ...data, slug, ownerId: userId });
    await this.orgsRepository.addMember(org.id, userId, 'owner');
    await this.auditService.log({ userId, orgId: org.id, module: 'organizations', action: 'create', entityType: 'organization', entityId: org.id, newData: data });
    return org;
  }

  async findById(id: string) {
    const org = await this.orgsRepository.findById(id);
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async findByUser(userId: string) {
    return this.orgsRepository.findByUser(userId);
  }

  async update(id: string, data: any, userId: string) {
    await this.findById(id);
    const updated = await this.orgsRepository.update(id, data);
    await this.auditService.log({ userId, orgId: id, module: 'organizations', action: 'update', entityType: 'organization', entityId: id, newData: data });
    return updated;
  }

  async getMembers(orgId: string, page: number, limit: number) {
    const dto = { page, limit };
    const { skip, take } = getPaginationParams(dto);
    const { items, total } = await this.orgsRepository.getMembers(orgId, skip, take);
    return buildPaginatedResponse(items, total, dto);
  }

  async invite(orgId: string, email: string, role = 'member', invitedBy: string) {
    await this.findById(orgId);
    const token = generateSecureToken(32);
    const invite = await this.orgsRepository.createInvite({
      orgId, email, role, invitedBy, token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    // TODO: send invite email with token
    return invite;
  }

  async acceptInvite(token: string, userId: string) {
    const invite = await this.orgsRepository.findInviteByToken(token);
    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      throw new ForbiddenException('Invalid or expired invite');
    }
    await this.orgsRepository.addMember(invite.orgId, userId, invite.role);
    await this.orgsRepository.updateInviteStatus(invite.id, true);
    return { message: 'Joined organization successfully' };
  }

  async removeMember(orgId: string, userId: string, actorId: string) {
    if (userId === actorId) throw new ForbiddenException('Cannot remove yourself');
    await this.orgsRepository.removeMember(orgId, userId);
    return { message: 'Member removed' };
  }
}
