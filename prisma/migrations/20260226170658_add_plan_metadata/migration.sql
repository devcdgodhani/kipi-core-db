-- AlterTable
ALTER TABLE "subscription_plans" ADD COLUMN     "features" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "maxCases" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "maxUsers" INTEGER NOT NULL DEFAULT 1;
