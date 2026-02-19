import { Module } from '@nestjs/common';
import { CasesService } from './services/cases.service';
import { CasesController } from './controllers/cases.controller';
import { CasesRepository } from './repositories/cases.repository';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [CasesController],
  providers: [CasesService, CasesRepository],
  exports: [CasesService],
})
export class CasesModule {}
