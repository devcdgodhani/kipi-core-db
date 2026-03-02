-- DropForeignKey
ALTER TABLE "plan_modules" DROP CONSTRAINT "plan_modules_moduleId_fkey";

-- AddForeignKey
ALTER TABLE "plan_modules" ADD CONSTRAINT "plan_modules_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
