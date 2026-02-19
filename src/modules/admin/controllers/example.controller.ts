import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permission } from '../../../common/decorators/permission.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { Audit } from '../../../common/decorators/audit.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionGuard } from '../../../common/guards/permissions.guard';
import { SubscriptionGuard } from '../../../common/guards/subscription.guard';
import { LimitGuard } from '../../../common/guards/limit.guard';
import { MfaGuard } from '../../../common/guards/mfa.guard';
import { SYSTEM_ROLES } from '../../../common/constants/roles.constants';
import { FEATURE_KEYS } from '../../../common/constants/permissions.constants';
import { MODULE_KEYS } from '../../../common/constants/modules.constants';

@Controller('examples')
@UseGuards(RolesGuard, PermissionGuard, SubscriptionGuard)
export class ExampleController {
    @Get('public')
    @Public()
    getPublic() {
        return { message: 'This is a public route' };
    }

    @Get('profile')
    getProfile(@CurrentUser() user: any) {
        return user;
    }

    @Post('cases')
    @Permission(FEATURE_KEYS.CASES_CREATE)
    @UseGuards(LimitGuard)
    @Audit({ action: 'create', module: MODULE_KEYS.CASES })
    createCase(@Body() data: any) {
        return { id: 'case-123', ...data };
    }

    @Patch('billing/:id')
    @Permission(FEATURE_KEYS.BILLING_MANAGE)
    @UseGuards(MfaGuard)
    @Audit({ action: 'update', module: MODULE_KEYS.BILLING })
    updateBilling(@Param('id') id: string, @Body() data: any) {
        return { id, ...data };
    }

    @Delete('admin/purge')
    @Roles(SYSTEM_ROLES.SUPER_ADMIN)
    purgeData() {
        return { message: 'Data purged' };
    }
}
