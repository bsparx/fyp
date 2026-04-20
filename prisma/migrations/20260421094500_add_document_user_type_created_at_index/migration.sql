CREATE INDEX "Document_userId_type_createdAt_idx"
ON "Document"("userId", "type", "createdAt" DESC);
