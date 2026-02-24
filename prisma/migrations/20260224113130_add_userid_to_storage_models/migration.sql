/*
  Warnings:

  - You are about to drop the column `isInUsed` on the `file_storage` table. All the data in the column will be lost.
  - Added the required column `userId` to the `file_directories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `file_storage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "case_documents" ADD COLUMN     "fileStorageId" TEXT;

-- AlterTable
ALTER TABLE "file_directories" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "file_storage" DROP COLUMN "isInUsed",
ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "file_directories_userId_idx" ON "file_directories"("userId");

-- CreateIndex
CREATE INDEX "file_storage_userId_idx" ON "file_storage"("userId");

-- AddForeignKey
ALTER TABLE "case_documents" ADD CONSTRAINT "case_documents_fileStorageId_fkey" FOREIGN KEY ("fileStorageId") REFERENCES "file_storage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_storage" ADD CONSTRAINT "file_storage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_directories" ADD CONSTRAINT "file_directories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
