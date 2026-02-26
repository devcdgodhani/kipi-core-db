-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "targetUserType" "UserType";
