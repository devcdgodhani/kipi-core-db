import { FileType } from '@prisma/client';

export interface IFileStorage {
  id: string;
  orgId: string;
  userId: string;
  originalFileName: string;
  storageFileName: string;
  storageDirPath: string;
  storageDir: string;
  fileSize: number | null;
  fileExtension: string | null;
  fileType: FileType;
  status: string;
  signedUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFileDirectory {
  id: string;
  orgId: string;
  userId: string;
  name: string;
  path: string;
  parentPath: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStorageListResult {
  directories: IFileDirectory[];
  files: IFileStorage[];
}

export interface IUploadResult {
  originalFileName: string;
  storageFileName: string;
  fileSize: number;
  fileExtension: string;
  fileType: FileType;
  storageDirPath: string;
  storageDir: string;
}
