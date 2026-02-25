/*
  Warnings:

  - A unique constraint covering the columns `[screenId,key]` on the table `actions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AppType" AS ENUM ('ADMIN_WEB', 'MAIN_WEB');

-- AlterTable
ALTER TABLE "actions" ADD COLUMN     "screenId" TEXT,
ALTER COLUMN "featureId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "appType" "AppType" NOT NULL DEFAULT 'MAIN_WEB';

-- AlterTable
ALTER TABLE "modules" ADD COLUMN     "appType" "AppType" NOT NULL DEFAULT 'MAIN_WEB';

-- CreateTable
CREATE TABLE "screens" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "path" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "screens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "orgId" TEXT,
    "appType" "AppType" NOT NULL,
    "eventName" TEXT NOT NULL,
    "pagePath" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "screens_key_key" ON "screens"("key");

-- CreateIndex
CREATE INDEX "screens_moduleId_idx" ON "screens"("moduleId");

-- CreateIndex
CREATE INDEX "analytics_events_userId_idx" ON "analytics_events"("userId");

-- CreateIndex
CREATE INDEX "analytics_events_orgId_idx" ON "analytics_events"("orgId");

-- CreateIndex
CREATE INDEX "analytics_events_appType_idx" ON "analytics_events"("appType");

-- CreateIndex
CREATE INDEX "analytics_events_eventName_idx" ON "analytics_events"("eventName");

-- CreateIndex
CREATE INDEX "analytics_events_createdAt_idx" ON "analytics_events"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "actions_screenId_key_key" ON "actions"("screenId", "key");

-- CreateIndex
CREATE INDEX "audit_logs_appType_idx" ON "audit_logs"("appType");

-- CreateIndex
CREATE INDEX "modules_appType_idx" ON "modules"("appType");

-- AddForeignKey
ALTER TABLE "screens" ADD CONSTRAINT "screens_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions" ADD CONSTRAINT "actions_screenId_fkey" FOREIGN KEY ("screenId") REFERENCES "screens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
