/*
  Warnings:

  - Added the required column `userId` to the `MedicalReportValue` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MedicalReportValue" ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "MedicalReportValue_userId_idx" ON "MedicalReportValue"("userId");

-- AddForeignKey
ALTER TABLE "MedicalReportValue" ADD CONSTRAINT "MedicalReportValue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
