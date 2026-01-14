/*
  Warnings:

  - Added the required column `parentChunkId` to the `RagChunk` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RagChunk" ADD COLUMN     "parentChunkId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "ParentChunk" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "parentIndex" INTEGER NOT NULL,
    "parentText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParentChunk_documentId_parentIndex_key" ON "ParentChunk"("documentId", "parentIndex");

-- AddForeignKey
ALTER TABLE "ParentChunk" ADD CONSTRAINT "ParentChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RagChunk" ADD CONSTRAINT "RagChunk_parentChunkId_fkey" FOREIGN KEY ("parentChunkId") REFERENCES "ParentChunk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
