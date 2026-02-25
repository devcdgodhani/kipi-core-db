/*
  Warnings:

  - A unique constraint covering the columns `[roleId,screenId,actionId]` on the table `role_permissions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "role_permissions" ADD COLUMN     "screenId" TEXT,
ALTER COLUMN "featureId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_screenId_actionId_key" ON "role_permissions"("roleId", "screenId", "actionId");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_screenId_fkey" FOREIGN KEY ("screenId") REFERENCES "screens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
