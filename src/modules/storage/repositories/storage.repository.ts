import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { FileStorage, FileDirectory, FileType } from '@prisma/client';

@Injectable()
export class StorageRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── File Storage ───────────────────────────────────────────

  async createFile(data: {
    orgId: string;
    userId: string;
    originalFileName: string;
    storageFileName: string;
    storageDirPath: string;
    storageDir: string;
    fileSize: number;
    fileExtension: string;
    fileType: FileType;
  }): Promise<FileStorage> {
    return this.prisma.fileStorage.create({ data });
  }

  async findFilesByPath(orgId: string, storageDirPath: string): Promise<FileStorage[]> {
    return this.prisma.fileStorage.findMany({
      where: { orgId, storageDirPath, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findFileById(id: string, orgId: string): Promise<FileStorage | null> {
    return this.prisma.fileStorage.findFirst({ where: { id, orgId } });
  }

  async moveFile(
    id: string,
    orgId: string,
    targetDirPath: string,
    targetDir: string,
  ): Promise<FileStorage> {
    return this.prisma.fileStorage.update({
      where: { id },
      data: { storageDirPath: targetDirPath, storageDir: targetDir },
    });
  }

  async softDeleteFile(id: string, orgId: string): Promise<FileStorage> {
    return this.prisma.fileStorage.update({
      where: { id },
      data: { status: 'DELETED' },
    });
  }

  async updateFileStoragePath(
    id: string,
    storageFileName: string,
    storageDirPath: string,
    storageDir: string,
  ): Promise<FileStorage> {
    return this.prisma.fileStorage.update({
      where: { id },
      data: { storageFileName, storageDirPath, storageDir },
    });
  }

  async createFileCopy(
    source: FileStorage,
    newStorageFileName: string,
    newDirPath: string,
    newDir: string,
  ): Promise<FileStorage> {
    return this.prisma.fileStorage.create({
      data: {
        orgId: source.orgId,
        userId: source.userId,
        originalFileName: source.originalFileName,
        storageFileName: newStorageFileName,
        storageDirPath: newDirPath,
        storageDir: newDir,
        fileSize: source.fileSize,
        fileExtension: source.fileExtension,
        fileType: source.fileType,
        status: 'ACTIVE',
      },
    });
  }

  // ─── File Directory ─────────────────────────────────────────

  async createDirectory(data: {
    orgId: string;
    userId: string;
    name: string;
    path: string;
    parentPath?: string | null;
  }): Promise<FileDirectory> {
    return this.prisma.fileDirectory.create({ data });
  }

  async upsertDirectory(data: {
    orgId: string;
    userId: string;
    name: string;
    path: string;
    parentPath?: string | null;
  }): Promise<FileDirectory> {
    return this.prisma.fileDirectory.upsert({
      where: { orgId_path: { orgId: data.orgId, path: data.path } },
      update: {},
      create: data,
    });
  }

  async findDirectoriesByParent(
    orgId: string,
    parentPath: string | null,
  ): Promise<FileDirectory[]> {
    return this.prisma.fileDirectory.findMany({
      where: { orgId, parentPath: parentPath ?? null },
      orderBy: { name: 'asc' },
    });
  }

  async findDirectoryByPath(orgId: string, path: string): Promise<FileDirectory | null> {
    return this.prisma.fileDirectory.findFirst({ where: { orgId, path } });
  }

  async deleteDirectory(id: string, orgId: string): Promise<FileDirectory> {
    return this.prisma.fileDirectory.delete({ where: { id } });
  }
}
