/*
  Warnings:

  - You are about to drop the column `discountPercent` on the `subscription_plans` table. All the data in the column will be lost.
  - You are about to drop the column `offerPrice` on the `subscription_plans` table. All the data in the column will be lost.
  - You are about to drop the `advocate_profiles` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "advocate_profiles" DROP CONSTRAINT "advocate_profiles_userId_fkey";

-- AlterTable
ALTER TABLE "subscription_plans" DROP COLUMN "discountPercent",
DROP COLUMN "offerPrice",
ADD COLUMN     "monthlyDiscount" INTEGER DEFAULT 0,
ADD COLUMN     "monthlyOfferPrice" DECIMAL(10,2),
ADD COLUMN     "yearlyDiscount" INTEGER DEFAULT 0,
ADD COLUMN     "yearlyOfferPrice" DECIMAL(10,2);

-- DropTable
DROP TABLE "advocate_profiles";

-- CreateTable
CREATE TABLE "professionals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "barRegistration" TEXT,
    "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "experienceYears" INTEGER NOT NULL DEFAULT 0,
    "bio" TEXT,
    "hourlyRate" DECIMAL(10,2),
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "documents" JSONB,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "practiceAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "location" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professionals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "professionals_userId_key" ON "professionals"("userId");

-- CreateIndex
CREATE INDEX "professionals_userId_idx" ON "professionals"("userId");

-- CreateIndex
CREATE INDEX "professionals_status_idx" ON "professionals"("status");

-- CreateIndex
CREATE INDEX "professionals_rating_idx" ON "professionals"("rating");

-- AddForeignKey
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
