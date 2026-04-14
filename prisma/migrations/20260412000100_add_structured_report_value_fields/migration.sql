-- Add structured retrieval fields for report-level SQL ingestion.
ALTER TABLE "MedicalReport"
ADD COLUMN "extractedJson" JSONB;

ALTER TABLE "MedicalReportValue"
ADD COLUMN "keyNormalized" TEXT,
ADD COLUMN "valueNumeric" DOUBLE PRECISION,
ADD COLUMN "unitNormalized" TEXT,
ADD COLUMN "observedAt" TIMESTAMP(3),
ADD COLUMN "sequence" INTEGER;

CREATE INDEX "MedicalReportValue_keyNormalized_idx"
ON "MedicalReportValue"("keyNormalized");

CREATE INDEX "MedicalReportValue_userId_keyNormalized_idx"
ON "MedicalReportValue"("userId", "keyNormalized");

CREATE INDEX "MedicalReportValue_userId_keyNormalized_observedAt_idx"
ON "MedicalReportValue"("userId", "keyNormalized", "observedAt");

CREATE INDEX "MedicalReportValue_reportId_keyNormalized_idx"
ON "MedicalReportValue"("reportId", "keyNormalized");
