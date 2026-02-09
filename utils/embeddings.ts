"use server";

import { Pinecone } from "@pinecone-database/pinecone";
import { VoyageAIClient } from "voyageai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import prisma from "./db";
import textSplitterForRag from "./textSplitterForRag";

// Initialize Pinecone
let pc: Pinecone;
if (process.env.PINECONE_API_KEY) {
  pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
} else {
  throw new Error("PINECONE_API_KEY is not set");
}

// Initialize Voyage AI client
const voyageClient = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY });

// Child chunk splitter for contextual embeddings
const childSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 201,
  chunkOverlap: 0,
});

if (!process.env.PINECONE_INDEX_NAME) {
  throw new Error("PINECONE_INDEX_NAME environment variable is not set.");
}

const index = pc.index(
  process.env.PINECONE_INDEX_NAME,
  process.env.PINECONE_INDEX_HOST
);

/**
 * Embeds document content and stores it in Pinecone with metadata.
 * Parent text is stored in the database (ParentChunk table) to avoid redundancy.
 * Only the parentChunkId is stored in Pinecone metadata.
 */
export async function embedAndStoreDocument(
  documentId: string,
  content: string,
  documentTitle: string
): Promise<boolean> {
  try {
    // Check if document is already ingested and get ragSubtype
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { isIngested: true, ragSubtype: true },
    });

    if (document?.isIngested) {
      console.log("Document already ingested, skipping embedding process.");
      return true;
    }

    // Split content into parent chunks using header-based splitter
    const parentChunks = textSplitterForRag(content);

    if (parentChunks.length === 0) {
      console.log("No chunks to process.");
      return true;
    }

    console.log(
      `Processing ${parentChunks.length} parent chunks for document: ${documentTitle}`
    );

    // Delete any existing chunks for this document
    await prisma.ragChunk.deleteMany({
      where: { documentId },
    });
    await prisma.parentChunk.deleteMany({
      where: { documentId },
    });

    // Process each parent chunk
    const processSingleParent = async (
      parentContent: string,
      parentIndex: number
    ) => {
      console.log(`Processing parent chunk index: ${parentIndex}`);

      try {
        // Create parent chunk in database first
        const parentChunk = await prisma.parentChunk.create({
          data: {
            documentId,
            parentIndex,
            parentText: parentContent,
          },
        });

        // Split parent into child chunks for embedding
        const childChunks = await childSplitter.splitText(parentContent);

        if (childChunks.length === 0) {
          console.log(`No child chunks for parent index ${parentIndex}`);
          return;
        }

        // Generate contextualized embeddings
        const voyageEmbeddings = await voyageClient.embed({
          input: childChunks,
          model: "voyage-3-large",
          inputType: "document",
          outputDimension: 2048,
        });

        // Prepare vectors for Pinecone - store parentChunkId instead of parentText
        const vectors = voyageEmbeddings.data?.map(
          (embeddingResult, childIdx) => {
            const pineconeId = `${documentId}_parent${parentIndex}_child${childIdx}`;
            return {
              id: pineconeId,
              values: embeddingResult.embedding as number[],
              metadata: {
                documentId,
                documentTitle,
                parentChunkId: parentChunk.id, // Reference to parent chunk in DB
                childText: childChunks[childIdx],
                parentIndex,
                childIndex: childIdx,
                type: document?.ragSubtype?.toLowerCase() ?? "medicine", // "medicine" or "disease"
              },
            };
          }
        );

        if (vectors && vectors.length > 0) {
          // Upsert to Pinecone
          await index.upsert(vectors);
          console.log(
            `Upserted ${vectors.length} vectors for parent index ${parentIndex}`
          );

          // Store chunk references in database
          await prisma.ragChunk.createMany({
            data: vectors.map((v, idx) => ({
              documentId,
              parentChunkId: parentChunk.id,
              chunkIndex: parentIndex * 1000 + idx, // Composite index
              chunkText: childChunks[idx],
              pineconeId: v.id,
            })),
          });
        }
      } catch (e) {
        console.error(`Error processing parent index ${parentIndex}:`, e);
      }
    };

    // Process first chunk sequentially to warm up
    await processSingleParent(parentChunks[0], 0);

    // Process remaining chunks in parallel
    if (parentChunks.length > 1) {
      const remainingPromises = parentChunks
        .slice(1)
        .map((chunk, idx) => processSingleParent(chunk, idx + 1));
      await Promise.all(remainingPromises);
    }

    // Mark document as ingested
    await prisma.document.update({
      where: { id: documentId },
      data: { isIngested: true },
    });

    console.log(`Successfully ingested document: ${documentTitle}`);
    return true;
  } catch (error) {
    console.error("Error embedding and storing document:", error);
    return false;
  }
}

/**
 * Embeds patient document content and stores it in Pinecone with patient metadata.
 * Parent text is stored in the database (ParentChunk table) to avoid redundancy.
 * Only the parentChunkId is stored in Pinecone metadata.
 * Metadata includes patient: true and patientId for filtering.
 */
export async function embedAndStorePatientDocument(
  documentId: string,
  content: string,
  documentTitle: string,
  patientId: string
): Promise<boolean> {
  try {
    // Check if document is already ingested
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { isIngested: true },
    });

    if (document?.isIngested) {
      console.log("Document already ingested, skipping embedding process.");
      return true;
    }

    // Split content into parent chunks using header-based splitter
    const parentChunks = textSplitterForRag(content);

    if (parentChunks.length === 0) {
      console.log("No chunks to process.");
      return true;
    }

    console.log(
      `Processing ${parentChunks.length} parent chunks for patient document: ${documentTitle}`
    );

    // Delete any existing chunks for this document
    await prisma.ragChunk.deleteMany({
      where: { documentId },
    });
    await prisma.parentChunk.deleteMany({
      where: { documentId },
    });

    // Process each parent chunk
    const processSingleParent = async (
      parentContent: string,
      parentIndex: number
    ) => {
      console.log(`Processing parent chunk index: ${parentIndex}`);

      try {
        // Create parent chunk in database first
        const parentChunk = await prisma.parentChunk.create({
          data: {
            documentId,
            parentIndex,
            parentText: parentContent,
          },
        });

        // Split parent into child chunks for embedding
        const childChunks = await childSplitter.splitText(parentContent);

        if (childChunks.length === 0) {
          console.log(`No child chunks for parent index ${parentIndex}`);
          return;
        }

        // Generate contextualized embeddings
        const voyageEmbeddings = await voyageClient.embed({
          input: childChunks,
          model: "voyage-3-large",
          inputType: "document",
          outputDimension: 2048,
        });

        // Prepare vectors for Pinecone - store parentChunkId instead of parentText
        const vectors = voyageEmbeddings.data?.map(
          (embeddingResult, childIdx) => {
            const pineconeId = `${documentId}_parent${parentIndex}_child${childIdx}`;
            return {
              id: pineconeId,
              values: embeddingResult.embedding as number[],
              metadata: {
                documentId,
                documentTitle,
                parentChunkId: parentChunk.id, // Reference to parent chunk in DB
                childText: childChunks[childIdx],
                parentIndex,
                childIndex: childIdx,
                patient: true,
                patientId,
                type: "patient", // "patient" for patient documents
              },
            };
          }
        );

        if (vectors && vectors.length > 0) {
          // Upsert to Pinecone
          await index.upsert(vectors);
          console.log(
            `Upserted ${vectors.length} vectors for parent index ${parentIndex}`
          );

          // Store chunk references in database
          await prisma.ragChunk.createMany({
            data: vectors.map((v, idx) => ({
              documentId,
              parentChunkId: parentChunk.id,
              chunkIndex: parentIndex * 1000 + idx, // Composite index
              chunkText: childChunks[idx],
              pineconeId: v.id,
            })),
          });
        }
      } catch (e) {
        console.error(`Error processing parent index ${parentIndex}:`, e);
      }
    };

    // Process first chunk sequentially to warm up
    await processSingleParent(parentChunks[0], 0);

    // Process remaining chunks in parallel
    if (parentChunks.length > 1) {
      const remainingPromises = parentChunks
        .slice(1)
        .map((chunk, idx) => processSingleParent(chunk, idx + 1));
      await Promise.all(remainingPromises);
    }

    // Mark document as ingested
    await prisma.document.update({
      where: { id: documentId },
      data: { isIngested: true },
    });

    console.log(`Successfully ingested patient document: ${documentTitle}`);
    return true;
  } catch (error) {
    console.error("Error embedding and storing patient document:", error);
    return false;
  }
}

/**
 * Deletes all vectors for a document from Pinecone and removes chunk records.
 */
export async function deleteDocumentVectors(
  documentId: string
): Promise<boolean> {
  try {
    // Get all chunk IDs for this document
    const chunks = await prisma.ragChunk.findMany({
      where: { documentId },
      select: { pineconeId: true },
    });

    if (chunks.length > 0) {
      // Delete from Pinecone
      const pineconeIds = chunks.map((c) => c.pineconeId);
      await index.deleteMany(pineconeIds);
      console.log(`Deleted ${pineconeIds.length} vectors from Pinecone`);
    }

    // Delete chunk records from database (parent chunks will cascade delete rag chunks)
    await prisma.parentChunk.deleteMany({
      where: { documentId },
    });

    // Update document status
    await prisma.document.update({
      where: { id: documentId },
      data: { isIngested: false },
    });

    return true;
  } catch (error) {
    console.error("Error deleting document vectors:", error);
    return false;
  }
}

/**
 * Fetches the parent text for a given parentChunkId.
 */
export async function getParentText(
  parentChunkId: string
): Promise<string | null> {
  try {
    const parentChunk = await prisma.parentChunk.findUnique({
      where: { id: parentChunkId },
      select: { parentText: true },
    });
    return parentChunk?.parentText ?? null;
  } catch (error) {
    console.error("Error fetching parent text:", error);
    return null;
  }
}

/**
 * Fetches multiple parent texts by their IDs.
 */
export async function getParentTexts(
  parentChunkIds: string[]
): Promise<Map<string, string>> {
  try {
    // Filter out undefined/null values
    const validIds = parentChunkIds.filter(
      (id): id is string => id != null && id !== undefined
    );

    if (validIds.length === 0) {
      return new Map();
    }

    const parentChunks = await prisma.parentChunk.findMany({
      where: { id: { in: validIds } },
      select: { id: true, parentText: true },
    });

    const map = new Map<string, string>();
    parentChunks.forEach((chunk) => {
      map.set(chunk.id, chunk.parentText);
    });
    return map;
  } catch (error) {
    console.error("Error fetching parent texts:", error);
    return new Map();
  }
}

/**
 * Query similar documents from Pinecone.
 * Returns results with parentChunkId - use getParentText to fetch the full parent text.
 */
export async function querySimilarDocuments(
  query: string,
  topK: number = 5,
  filter?: Record<string, unknown>
): Promise<
  Array<{
    documentId: string;
    documentTitle: string;
    childText: string;
    parentChunkId: string;
    score: number;
  }>
> {
  try {
    // Generate embedding for query
    const queryEmbedding = await voyageClient.embed({
      input: [query],
      model: "voyage-3-large",
      inputType: "query",
      outputDimension: 2048,
    });

    const queryVector = queryEmbedding.data?.[0]?.embedding as number[];

    if (!queryVector) {
      console.error("Failed to generate query embedding");
      return [];
    }

    // Query Pinecone
    const results = await index.query({
      vector: queryVector,
      topK,
      includeMetadata: true,
      filter,
    });

    return (
      results.matches
        ?.map((match) => ({
          documentId: match.metadata?.documentId as string,
          documentTitle: match.metadata?.documentTitle as string,
          childText: match.metadata?.childText as string,
          parentChunkId: match.metadata?.parentChunkId as string,
          score: match.score ?? 0,
        }))
        .filter((result) => result.parentChunkId != null) ?? []
    );
  } catch (error) {
    console.error("Error querying similar documents:", error);
    return [];
  }
}

/**
 * Query similar documents and automatically fetch parent texts.
 * This is a convenience function that combines query + parent text fetching.
 */
export async function querySimilarDocumentsWithParentText(
  query: string,
  topK: number = 5,
  filter?: Record<string, unknown>
): Promise<
  Array<{
    documentId: string;
    documentTitle: string;
    childText: string;
    parentText: string;
    score: number;
  }>
> {
  const results = await querySimilarDocuments(query, topK, filter);

  if (results.length === 0) {
    return [];
  }

  // Get unique parent chunk IDs
  const parentChunkIds = [...new Set(results.map((r) => r.parentChunkId))];

  // Fetch all parent texts in one query
  const parentTexts = await getParentTexts(parentChunkIds);

  return results.map((result) => ({
    documentId: result.documentId,
    documentTitle: result.documentTitle,
    childText: result.childText,
    parentText: parentTexts.get(result.parentChunkId) ?? "",
    score: result.score,
  }));
}

/**
 * Rerank documents using VoyageAI's reranker model.
 * Returns reranked results filtered by a relevance threshold.
 */
export async function rerankDocuments(
  query: string,
  documents: string[],
  topK?: number
): Promise<
  Array<{
    document: string;
    relevanceScore: number;
    index: number;
  }>
> {
  try {
    if (documents.length === 0) {
      return [];
    }

    console.log(`Reranking ${documents.length} documents with Voyage...`);
    const rerankedResult = await voyageClient.rerank({
      query,
      documents,
      model: "rerank-2.5",
      topK: topK ?? documents.length,
      returnDocuments: true,
    });

    if (
      !rerankedResult ||
      !rerankedResult.data ||
      rerankedResult.data.length === 0
    ) {
      console.log("Voyage rerank returned no results.");
      return [];
    }

    console.log(`Reranked ${rerankedResult.data.length} documents.`);

    // Return all reranked documents in order (already sorted by relevance)
    return rerankedResult.data.map((doc) => ({
      document: doc.document ?? "",
      relevanceScore: doc.relevanceScore ?? 0,
      index: doc.index ?? 0,
    }));
  } catch (error) {
    console.error("Error reranking documents:", error);
    return [];
  }
}
