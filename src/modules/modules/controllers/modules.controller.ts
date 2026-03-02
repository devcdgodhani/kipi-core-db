import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ModulesService } from '../services/modules.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { successResponse } from '../../../common/utils/response.util';
import { UserType } from '@prisma/client';

@ApiTags('Modules')
@ApiBearerAuth('accessToken')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'modules', version: '1' })
export class ModulesController {
    constructor(private service: ModulesService) { }

    @Get('user-modules')
    @ApiOperation({ summary: 'Get list of modules and features with plan-based access info' })
    async getUserModules(@CurrentUser() user: JwtPayload) {
        const modules = await this.service.getUserModules(user.sub, user.userType as UserType);
        return successResponse(modules);
    }

    @Get('all')
    @ApiOperation({ summary: 'List all modules and features (Admin/System use)' })
    async getAllModules(@Query('userType') userType?: UserType) {
        const modules = await this.service.getAllModules(userType);
        return successResponse(modules);
    }
}
