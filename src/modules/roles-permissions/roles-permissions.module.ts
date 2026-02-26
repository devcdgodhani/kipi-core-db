import { Module, Global } from '@nestjs/common';
import { RolesPermissionsService } from './services/roles-permissions.service';
import { RolesPermissionsController } from './controllers/roles-permissions.controller';
import { AdminRolesController } from './controllers/admin-roles.controller';
import { RolesPermissionsRepository } from './repositories/roles-permissions.repository';
import { AuditModule } from '../audit/audit.module';

@Global()
@Module({
  imports: [AuditModule],
  controllers: [RolesPermissionsController, AdminRolesController],
  providers: [RolesPermissionsService, RolesPermissionsRepository],
  exports: [RolesPermissionsService],
})
export class RolesPermissionsModule {}
