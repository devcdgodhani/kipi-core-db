/*
  Warnings:

  - You are about to drop the column `orgId` on the `payments` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_orgId_fkey";

-- DropIndex
DROP INDEX "payments_orgId_idx";

-- AlterTable
ALTER TABLE "features" ADD COLUMN     "targetUserTypes" "UserType"[];

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "orgId";
