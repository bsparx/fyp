-- CreateEnum
CREATE TYPE "RagSubtype" AS ENUM ('MEDICINE', 'DISEASE');

-- CreateEnum
CREATE TYPE "PatientDataType" AS ENUM ('REPORT', 'COMMENT');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "patientDataType" "PatientDataType",
ADD COLUMN     "ragSubtype" "RagSubtype";

-- CreateTable
CREATE TABLE "MedicalReport" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3),
    "hospitalName" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalReportValue" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalReportValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MedicalReportValue_reportId_idx" ON "MedicalReportValue"("reportId");

-- CreateIndex
CREATE INDEX "MedicalReportValue_key_idx" ON "MedicalReportValue"("key");

-- AddForeignKey
ALTER TABLE "MedicalReport" ADD CONSTRAINT "MedicalReport_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalReport" ADD CONSTRAINT "MedicalReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalReportValue" ADD CONSTRAINT "MedicalReportValue_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "MedicalReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
