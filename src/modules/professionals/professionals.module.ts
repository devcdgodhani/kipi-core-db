import { Module } from '@nestjs/common';
import { ProfessionalsService } from './services/professionals.service';
import { ProfessionalsController } from './controllers/professionals.controller';
import { ProfessionalsRepository } from './repositories/professionals.repository';

@Module({
  controllers: [ProfessionalsController],
  providers: [ProfessionalsService, ProfessionalsRepository],
  exports: [ProfessionalsService],
})
export class ProfessionalsModule {}
