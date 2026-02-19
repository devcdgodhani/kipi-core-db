import { Module } from '@nestjs/common';
import { SecurityService } from './services/security.service';
import { SecurityController } from './controllers/security.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [SecurityController],
  providers: [SecurityService],
})
export class SecurityModule {}
