import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';
import { FileType } from '@prisma/client';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { StorageRepository } from '../repositories/storage.repository';
import {
  getSignedUrlHelper,
  uploadFileToS3,
  deleteFileFromS3,
  createFolder,
  copyFile as s3CopyFile,
} from '../../../common/utils/s3.util';
import { IStorageListResult, IFileStorage, IFileDirectory } from '../interfaces/storage.interface';
import { CreateDirectoryDto, MoveFileDto, CopyFileDto } from '../dto/storage.dto';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class StorageService {
  private readonly bucket: string;

  constructor(
    private readonly storageRepository: StorageRepository,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.bucket = this.configService.get<string>('aws.s3Bucket', process.env.AWS_S3_BUCKET || '');
  }

  // ─── Directory Management ────────────────────────────────────

  async createDirectory(orgId: string, userId: string, dto: CreateDirectoryDto): Promise<object> {
    const parentPath = dto.parentPath ?? '';
    const dirPath = parentPath ? `${parentPath}/${this.slugify(dto.name)}` : this.slugify(dto.name);

    const existing = await this.storageRepository.findDirectoryByPath(orgId, dirPath);
    if (existing) {
      throw new ConflictException(`Directory '${dto.name}' already exists at this path`);
    }

    await createFolder(dirPath, this.bucket);

    return this.storageRepository.createDirectory({
      orgId,
      userId,
      name: dto.name,
      path: dirPath,
      parentPath: parentPath || null,
    });
  }

  async deleteDirectory(orgId: string, id: string): Promise<void> {
    const dir = await this.storageRepository.findDirectoryByPath(orgId, id);
    if (!dir) throw new NotFoundException('Directory not found');
    await this.storageRepository.deleteDirectory(dir.id, orgId);
  }

  // ─── File Listing ────────────────────────────────────────────

  async getFilesAndFolders(orgId: string, dirPath: string): Promise<IStorageListResult> {
    const normalizedPath = dirPath ?? '';
    const [directories, files] = await Promise.all([
      this.storageRepository.findDirectoriesByParent(orgId, normalizedPath || null),
      this.storageRepository.findFilesByPath(orgId, normalizedPath),
    ]);
    const filesWithUrls = await this.attachSignedUrls(files as unknown as IFileStorage[]);
    return {
      directories:
        directories as unknown as import('../interfaces/storage.interface').IFileDirectory[],
      files: filesWithUrls,
    };
  }

  // ─── File Upload (with auto-directory) ──────────────────────

  /**
   * Upload files under the following S3 path hierarchy:
   *   - Without orgId  → {userEmailSlug}/
   *   - With orgId     → {ownerEmailSlug}/{orgNameSlug}/
   *
   * Directories are auto-created (idempotent) as S3 folder markers
   * and as FileDirectory DB records.
   */
  async uploadFiles(
    user: JwtPayload,
    orgId: string | undefined,
    files: Express.Multer.File[],
    extraDirPath?: string,
  ): Promise<IFileStorage[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const { rootPath, effectiveOrgId } = await this.resolveUploadDirectory(user, orgId);
    const finalDirPath = extraDirPath ? `${rootPath}/${extraDirPath}` : rootPath;

    // Ensure the resolved directory exists as a DB record
    await this.ensureDirectoryExists(effectiveOrgId, user.sub, finalDirPath);

    const uploaded: IFileStorage[] = [];

    for (const file of files) {
      const ext = path.extname(file.originalname).replace('.', '').toLowerCase();
      const storageFileName = `${uuidv4()}.${ext}`;
      const s3Key = `${finalDirPath}/${storageFileName}`;

      await uploadFileToS3(s3Key, this.bucket, file.buffer, file.mimetype);

      const record = await this.storageRepository.createFile({
        orgId: effectiveOrgId,
        userId: user.sub,
        originalFileName: file.originalname,
        storageFileName: s3Key,
        storageDirPath: finalDirPath,
        storageDir: finalDirPath.split('/').pop() || '',
        fileSize: file.size,
        fileExtension: ext,
        fileType: this.detectFileType(file.mimetype),
      });

      const signedUrl = await getSignedUrlHelper(s3Key, this.bucket);
      uploaded.push({ ...(record as unknown as IFileStorage), signedUrl });
    }

    return uploaded;
  }

  // ─── File Move (S3 copy + delete source) ────────────────────

  /**
   * Move a file:
   * 1. Copy S3 object from old key → new key (preserving filename)
   * 2. Delete original S3 object
   * 3. Update DB record with new S3 key and dir path
   */
  async moveFile(orgId: string, dto: MoveFileDto): Promise<IFileStorage> {
    const file = await this.storageRepository.findFileById(dto.fileId, orgId);
    if (!file) throw new NotFoundException('File not found');

    const fileName = path.basename(file.storageFileName);
    const newS3Key = dto.targetDirPath ? `${dto.targetDirPath}/${fileName}` : fileName;
    const targetDir = dto.targetDirPath ? dto.targetDirPath.split('/').pop() || '' : '';

    // 1. Copy on S3
    await s3CopyFile(file.storageFileName, newS3Key, this.bucket);
    // 2. Delete original on S3
    await deleteFileFromS3(file.storageFileName, this.bucket);
    // 3. Update DB record
    const updated = await this.storageRepository.updateFileStoragePath(
      file.id,
      newS3Key,
      dto.targetDirPath,
      targetDir,
    );

    const signedUrl = await getSignedUrlHelper(newS3Key, this.bucket);
    return { ...(updated as unknown as IFileStorage), signedUrl };
  }

  // ─── File Copy (S3 copy + new DB record) ────────────────────

  /**
   * Copy a file:
   * 1. Copy S3 object from old key → new key with new UUID filename
   * 2. Create a new FileStorage DB record for the copy
   * Source file is preserved in both S3 and DB.
   */
  async copyFileRecord(orgId: string, dto: CopyFileDto): Promise<IFileStorage> {
    const file = await this.storageRepository.findFileById(dto.fileId, orgId);
    if (!file) throw new NotFoundException('File not found');

    const ext = file.fileExtension ? `.${file.fileExtension}` : '';
    const newFileName = `${uuidv4()}${ext}`;
    const newS3Key = dto.targetDirPath ? `${dto.targetDirPath}/${newFileName}` : newFileName;
    const targetDir = dto.targetDirPath ? dto.targetDirPath.split('/').pop() || '' : '';

    // 1. Copy on S3
    await s3CopyFile(file.storageFileName, newS3Key, this.bucket);
    // 2. Create new DB record
    const copy = await this.storageRepository.createFileCopy(
      file,
      newS3Key,
      dto.targetDirPath,
      targetDir,
    );

    const signedUrl = await getSignedUrlHelper(newS3Key, this.bucket);
    return { ...(copy as unknown as IFileStorage), signedUrl };
  }

  // ─── File Delete ─────────────────────────────────────────────

  async deleteFile(orgId: string, fileId: string): Promise<void> {
    const file = await this.storageRepository.findFileById(fileId, orgId);
    if (!file) throw new NotFoundException('File not found');
    await deleteFileFromS3(file.storageFileName, this.bucket);
    await this.storageRepository.softDeleteFile(fileId, orgId);
  }

  // ─── Get Signed URL ──────────────────────────────────────────

  async getFileSignedUrl(orgId: string, fileId: string): Promise<string> {
    const file = await this.storageRepository.findFileById(fileId, orgId);
    if (!file) throw new NotFoundException('File not found');
    return getSignedUrlHelper(file.storageFileName, this.bucket);
  }

  // ─── Private: Directory Resolution ──────────────────────────

  /**
   * Resolves the effective S3 root path and orgId for an upload.
   *
   * Logic:
   *  1. Always start from the uploading user's email-based root dir.
   *  2. If orgId is provided, find the org owner's email and create
   *     an org-name subdirectory inside the owner's root.
   *  3. Return the resolved path and the orgId to use for DB records.
   */
  private async resolveUploadDirectory(
    user: JwtPayload,
    orgId?: string,
  ): Promise<{ rootPath: string; effectiveOrgId: string }> {
    const userEmailSlug = this.slugify(user.email);
    const userRootPath = userEmailSlug;
    await this.ensureS3FolderExists(userRootPath);

    if (!orgId) {
      return { rootPath: userRootPath, effectiveOrgId: user.sub };
    }

    // Fetch org to get name and owner
    const org = await this.prisma.organization.findFirst({
      where: { id: orgId },
      include: {
        members: {
          where: { role: 'owner' },
          include: { user: { select: { email: true } } },
          take: 1,
        },
      },
    });

    if (!org) throw new NotFoundException('Organization not found');

    const ownerEmail = org.members[0]?.user?.email ?? user.email;
    const ownerEmailSlug = this.slugify(ownerEmail);
    const orgNameSlug = this.slugify(org.name);

    await this.ensureS3FolderExists(ownerEmailSlug);
    const orgPath = `${ownerEmailSlug}/${orgNameSlug}`;
    await this.ensureS3FolderExists(orgPath);

    return { rootPath: orgPath, effectiveOrgId: orgId };
  }

  private async ensureS3FolderExists(folderPath: string): Promise<void> {
    await createFolder(folderPath, this.bucket);
  }

  private async ensureDirectoryExists(
    orgId: string,
    userId: string,
    dirPath: string,
  ): Promise<void> {
    const parts = dirPath.split('/');
    let current = '';
    for (const part of parts) {
      const parent = current || null;
      current = current ? `${current}/${part}` : part;
      await this.storageRepository.upsertDirectory({
        orgId,
        userId,
        name: part,
        path: current,
        parentPath: parent,
      });
    }
  }

  // ─── Private Helpers ─────────────────────────────────────────

  private async attachSignedUrls(files: IFileStorage[]): Promise<IFileStorage[]> {
    return Promise.all(
      files.map(async (f) => ({
        ...f,
        signedUrl: await getSignedUrlHelper(f.storageFileName, this.bucket),
      })),
    );
  }

  private detectFileType(mimeType: string): FileType {
    if (mimeType.startsWith('image/')) return FileType.IMAGE;
    if (mimeType.startsWith('video/')) return FileType.VIDEO;
    if (mimeType.startsWith('audio/')) return FileType.AUDIO;
    if (
      mimeType === 'application/pdf' ||
      mimeType.includes('document') ||
      mimeType.includes('text') ||
      mimeType.includes('spreadsheet') ||
      mimeType.includes('presentation')
    ) {
      return FileType.DOCUMENT;
    }
    return FileType.OTHER;
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/@/g, '-at-')
      .replace(/\./g, '-')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '');
  }
}
