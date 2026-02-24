/*
  Warnings:

  - The values [advocate,detective] on the enum `UserType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'OTHER', 'DIRECTORY');

-- AlterEnum
BEGIN;
CREATE TYPE "UserType_new" AS ENUM ('client', 'professional', 'super_admin');
ALTER TABLE "users" ALTER COLUMN "userType" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "userType" TYPE "UserType_new" USING ("userType"::text::"UserType_new");
ALTER TYPE "UserType" RENAME TO "UserType_old";
ALTER TYPE "UserType_new" RENAME TO "UserType";
DROP TYPE "UserType_old";
ALTER TABLE "users" ALTER COLUMN "userType" SET DEFAULT 'client';
COMMIT;

-- DropIndex
DROP INDEX "users_phone_key";

-- CreateTable
CREATE TABLE "file_storage" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "storageFileName" TEXT NOT NULL,
    "storageDirPath" TEXT NOT NULL DEFAULT '',
    "storageDir" TEXT NOT NULL DEFAULT '',
    "fileSize" INTEGER,
    "fileExtension" TEXT,
    "fileType" "FileType" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isInUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_storage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_directories" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "parentPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_directories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "file_storage_storageFileName_key" ON "file_storage"("storageFileName");

-- CreateIndex
CREATE INDEX "file_storage_orgId_idx" ON "file_storage"("orgId");

-- CreateIndex
CREATE INDEX "file_storage_storageDirPath_idx" ON "file_storage"("storageDirPath");

-- CreateIndex
CREATE INDEX "file_directories_orgId_idx" ON "file_directories"("orgId");

-- CreateIndex
CREATE INDEX "file_directories_parentPath_idx" ON "file_directories"("parentPath");

-- CreateIndex
CREATE UNIQUE INDEX "file_directories_orgId_path_key" ON "file_directories"("orgId", "path");

-- AddForeignKey
ALTER TABLE "file_storage" ADD CONSTRAINT "file_storage_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_directories" ADD CONSTRAINT "file_directories_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
