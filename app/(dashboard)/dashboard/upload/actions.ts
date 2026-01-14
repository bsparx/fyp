"use server";

import prisma from "@/utils/db";
import { processPdfAndConvertToText } from "@/utils/pdfProcessing";
import {
  embedAndStoreDocument,
  deleteDocumentVectors,
} from "@/utils/embeddings";
import { revalidatePath } from "next/cache";
import type { DocumentType, Prisma } from "@/app/generated/prisma/client";

export interface UploadDocumentResult {
  success: boolean;
  message: string;
  documentId?: string;
}

/**
 * Upload and process PDF documents for RAG knowledge base.
 * Converts PDFs to text, stores in database, and embeds in vector store.
 */
export async function uploadDocument(
  formData: FormData
): Promise<UploadDocumentResult> {
  try {
    const title = formData.get("title") as string;
    const pdfFilesJson = formData.get("pdfFiles") as string;

    if (!title) {
      return { success: false, message: "Document title is required." };
    }

    if (!pdfFilesJson) {
      return { success: false, message: "No PDF files provided." };
    }

    // Parse the base64 PDF data
    const pdfBase64Array: string[] = JSON.parse(pdfFilesJson);

    if (pdfBase64Array.length === 0) {
      return { success: false, message: "No PDF files provided." };
    }

    console.log(`Processing ${pdfBase64Array.length} PDF file(s)...`);

    // Convert PDFs to text
    const extractedText = await processPdfAndConvertToText(pdfBase64Array);

    if (!extractedText) {
      return {
        success: false,
        message: "Failed to extract text from PDFs. Please try again.",
      };
    }

    console.log(`Extracted ${extractedText.length} characters of text.`);

    // Create document record in database (always RAG type for this page)
    const document = await prisma.document.create({
      data: {
        title,
        content: extractedText,
        type: "RAG",
        isIngested: false,
      },
    });

    console.log(`Created document record: ${document.id}`);

    // Embed and store in Pinecone (run in background)
    embedAndStoreDocument(document.id, extractedText, title)
      .then((success) => {
        if (success) {
          console.log(`Successfully embedded document: ${document.id}`);
        } else {
          console.error(`Failed to embed document: ${document.id}`);
        }
      })
      .catch((error) => {
        console.error(`Error embedding document: ${document.id}`, error);
      });

    revalidatePath("/dashboard/upload");

    return {
      success: true,
      message:
        "Document uploaded successfully! Processing embeddings in the background.",
      documentId: document.id,
    };
  } catch (error) {
    console.error("Error uploading document:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
    };
  }
}

/**
 * Delete a document and its associated vectors.
 */
export async function deleteDocument(
  documentId: string
): Promise<UploadDocumentResult> {
  try {
    // Delete vectors from Pinecone
    await deleteDocumentVectors(documentId);

    // Delete document from database
    await prisma.document.delete({
      where: { id: documentId },
    });

    revalidatePath("/dashboard/upload");

    return {
      success: true,
      message: "Document deleted successfully.",
    };
  } catch (error) {
    console.error("Error deleting document:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to delete document.",
    };
  }
}

/**
 * Get all documents with optional filtering.
 */
export async function getDocuments(options?: {
  type?: DocumentType;
  userId?: string;
  page?: number;
  limit?: number;
}) {
  const { type, userId, page = 1, limit = 10 } = options || {};

  const where: Prisma.DocumentWhereInput = {
    ...(type && { type }),
    ...(userId && { userId }),
  };

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: { ragChunks: true },
        },
      },
    }),
    prisma.document.count({ where }),
  ]);

  return {
    documents,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get a single document by ID.
 */
export async function getDocument(documentId: string) {
  return prisma.document.findUnique({
    where: { id: documentId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: { ragChunks: true },
      },
    },
  });
}

/**
 * Re-embed an existing document (useful after content updates).
 */
export async function reembedDocument(
  documentId: string
): Promise<UploadDocumentResult> {
  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return { success: false, message: "Document not found." };
    }

    // Delete existing vectors
    await deleteDocumentVectors(documentId);

    // Re-embed
    const success = await embedAndStoreDocument(
      documentId,
      document.content,
      document.title
    );

    if (success) {
      return { success: true, message: "Document re-embedded successfully." };
    } else {
      return { success: false, message: "Failed to re-embed document." };
    }
  } catch (error) {
    console.error("Error re-embedding document:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
    };
  }
}
