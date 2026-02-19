import { Module } from '@nestjs/common';
import { RolesPermissionsService } from './services/roles-permissions.service';
import { RolesPermissionsController } from './controllers/roles-permissions.controller';
import { RolesPermissionsRepository } from './repositories/roles-permissions.repository';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [RolesPermissionsController],
  providers: [RolesPermissionsService, RolesPermissionsRepository],
  exports: [RolesPermissionsService],
})
export class RolesPermissionsModule {}
