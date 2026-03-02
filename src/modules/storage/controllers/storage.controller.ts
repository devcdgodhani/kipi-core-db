import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Query,
  Param,
  UploadedFiles,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiHeader } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { StorageService } from '../services/storage.service';
import {
  CreateDirectoryDto,
  ListFilesQueryDto,
  MoveFileDto,
  CopyFileDto,
} from '../dto/storage.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OrgId } from '../../../common/decorators/org-id.decorator';
import { Audit } from '../../../common/decorators/audit.decorator';
import { MODULE_KEYS } from '../../../common/constants/modules.constants';
import { ACTION_KEYS } from '../../../common/constants/action-keys.constants';
import { successResponse } from '../../../common/utils/response.util';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { PlanAccessGuard } from '../../../common/guards/plan-access.guard';
import { RequiresPlanAccess } from '../../../common/decorators/plan-access.decorator';

@ApiTags('Storage')
@ApiBearerAuth('accessToken')
@ApiHeader({
  name: 'x-org-id',
  required: false,
  description: 'Organization ID (optional – scopes upload to org directory)',
})
@UseGuards(PlanAccessGuard)
@RequiresPlanAccess({ moduleKey: MODULE_KEYS.STORAGE })
@Controller({ path: 'storage', version: '1' })
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  // ─── Directory Management ───────────────────────────────────

  @Post('directories')
  @Audit({ action: ACTION_KEYS.CREATE, module: MODULE_KEYS.STORAGE })
  @ApiOperation({ summary: 'Create a new directory' })
  async createDirectory(
    @CurrentUser() user: JwtPayload,
    @OrgId() orgId: string,
    @Body() dto: CreateDirectoryDto,
  ) {
    const result = await this.storageService.createDirectory(orgId, user.sub, dto);
    return successResponse(result, 'Directory created successfully');
  }

  @Delete('directories/:id')
  @Audit({ action: ACTION_KEYS.DELETE, module: MODULE_KEYS.STORAGE })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a directory' })
  async deleteDirectory(@OrgId() orgId: string, @Param('id') id: string) {
    await this.storageService.deleteDirectory(orgId, id);
    return successResponse(null, 'Directory deleted successfully');
  }

  // ─── File Listing ────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List files and folders at a given path' })
  async listFilesAndFolders(@OrgId() orgId: string, @Query() query: ListFilesQueryDto) {
    const result = await this.storageService.getFilesAndFolders(orgId, query.path ?? '');
    return successResponse(result, 'Files and folders retrieved');
  }

  // ─── File Upload ─────────────────────────────────────────────

  @Post('upload')
  @Audit({ action: ACTION_KEYS.UPLOAD, module: MODULE_KEYS.STORAGE })
  @ApiOperation({
    summary:
      'Upload files – auto-creates user root dir (email) and org sub-dir when x-org-id header is present',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 20, { storage: memoryStorage() }))
  async uploadFiles(
    @CurrentUser() user: JwtPayload,
    @OrgId() orgId: string | undefined,
    @UploadedFiles() files: Express.Multer.File[],
    @Query('path') extraPath: string = '',
  ) {
    const result = await this.storageService.uploadFiles(
      user,
      orgId,
      files,
      extraPath || undefined,
    );
    return successResponse(result, `${result.length} file(s) uploaded successfully`);
  }

  // ─── File Move ───────────────────────────────────────────────

  @Patch('move')
  @Audit({ action: ACTION_KEYS.UPDATE, module: MODULE_KEYS.STORAGE })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Move a file to a different directory (S3 copy + delete source)' })
  async moveFile(@OrgId() orgId: string, @Body() dto: MoveFileDto) {
    const result = await this.storageService.moveFile(orgId, dto);
    return successResponse(result, 'File moved successfully');
  }

  // ─── File Copy ───────────────────────────────────────────────

  @Post('copy')
  @Audit({ action: ACTION_KEYS.CREATE, module: MODULE_KEYS.STORAGE })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Copy a file to a directory (S3 copy + new DB record, source preserved)',
  })
  async copyFile(@OrgId() orgId: string, @Body() dto: CopyFileDto) {
    const result = await this.storageService.copyFileRecord(orgId, dto);
    return successResponse(result, 'File copied successfully');
  }

  // ─── File Delete ─────────────────────────────────────────────

  @Delete(':id')
  @Audit({ action: ACTION_KEYS.DELETE, module: MODULE_KEYS.STORAGE })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a file (soft + S3 removal)' })
  async deleteFile(@OrgId() orgId: string, @Param('id') id: string) {
    await this.storageService.deleteFile(orgId, id);
    return successResponse(null, 'File deleted successfully');
  }

  // ─── Signed URL ──────────────────────────────────────────────

  @Get(':id/signed-url')
  @ApiOperation({ summary: 'Get a pre-signed 24-hour download URL for a file' })
  async getSignedUrl(@OrgId() orgId: string, @Param('id') id: string) {
    const url = await this.storageService.getFileSignedUrl(orgId, id);
    return successResponse({ url }, 'Signed URL generated');
  }
}
