import { Module, Global } from '@nestjs/common';
import { ModulesController } from './controllers/modules.controller';
import { ModulesService } from './services/modules.service';
import { ModulesRepository } from './repositories/modules.repository';

@Global()
@Module({
    controllers: [ModulesController],
    providers: [ModulesService, ModulesRepository],
    exports: [ModulesService, ModulesRepository],
})
export class ModulesModule { }
