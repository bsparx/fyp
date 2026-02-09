"use server";

import prisma from "@/utils/db";
import { revalidatePath } from "next/cache";
import { processUserDataFiles } from "@/utils/userDataProcessing";
import { embedAndStorePatientDocument } from "@/utils/embeddings";
import { extractReportDataWithAI } from "@/utils/reportExtractor";

export interface UploadUserDocumentResult {
  success: boolean;
  message: string;
  documentId?: string;
}

interface FileData {
  base64: string;
  type: "pdf" | "image";
  name: string;
}

export type PatientDataType = "REPORT" | "COMMENT";

/**
 * Upload and process PDF/Image documents for a user.
 * Stores documents in the database with PATIENT type.
 * Supports two data types:
 * - COMMENT: Semantic ingestion into vector database
 * - REPORT: Extract key-value pairs from medical reports
 */
export async function uploadUserDocument(
  formData: FormData
): Promise<UploadUserDocumentResult> {
  try {
    const title = formData.get("title") as string;
    const userId = formData.get("userId") as string;
    const filesJson = formData.get("files") as string;
    const dataType = (formData.get("dataType") as PatientDataType) || "COMMENT";

    if (!title) {
      return { success: false, message: "Document title is required." };
    }

    if (!userId) {
      return { success: false, message: "User ID is required." };
    }

    if (!filesJson) {
      return { success: false, message: "No files provided." };
    }

    const files: FileData[] = JSON.parse(filesJson);

    if (files.length === 0) {
      return { success: false, message: "No files provided." };
    }

    console.log(
      `Processing ${files.length} file(s) for user ${userId} as ${dataType}...`
    );

    // Verify user exists before proceeding
    console.log(`Looking up user with ID: "${userId}"`);
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    console.log(`User lookup result:`, userExists);

    if (!userExists) {
      console.error(`User not found with ID: ${userId}`);
      return {
        success: false,
        message: "User not found. Please refresh the page and try again.",
      };
    }

    // Use the verified user ID from the database
    const verifiedUserId = userExists.id;
    console.log(`Using verified user ID: "${verifiedUserId}"`);

    // Process files and extract text
    const extractedText = await processUserDataFiles(files);

    // Log the OCR result for debugging
    console.log("=== OCR RESULT START ===");
    console.log(extractedText);
    console.log("=== OCR RESULT END ===");

    if (!extractedText) {
      return {
        success: false,
        message: "Failed to extract text from files. Please try again.",
      };
    }

    console.log(`Extracted ${extractedText.length} characters of text.`);

    // Create document record in database with PATIENT type
    // Store both extracted text and original file data
    const content = JSON.stringify({
      files: files.map((f) => ({
        name: f.name,
        type: f.type,
        data: f.base64,
      })),
      extractedText,
    });

    const document = await prisma.document.create({
      data: {
        title,
        content,
        type: "PATIENT",
        patientDataType: dataType,
        isIngested: false, // Will be marked as ingested after embedding (comments only)
        userId: verifiedUserId,
      },
    });

    console.log(`Created document record: ${document.id}`);

    if (dataType === "COMMENT") {
      // Embed and store in Pinecone with patient metadata (run in background)
      embedAndStorePatientDocument(
        document.id,
        extractedText,
        title,
        verifiedUserId
      )
        .then((success) => {
          if (success) {
            console.log(
              `Successfully embedded patient document: ${document.id}`
            );
          } else {
            console.error(`Failed to embed patient document: ${document.id}`);
          }
        })
        .catch((error) => {
          console.error(
            `Error embedding patient document: ${document.id}`,
            error
          );
        });

      revalidatePath("/dashboard/users/data");

      return {
        success: true,
        message:
          "Comment uploaded successfully! Processing embeddings in the background.",
        documentId: document.id,
      };
    } else {
      // REPORT type: Use AI to extract structured key-value pairs
      try {
        // Step 1: Use AI to extract structured data from the OCR text
        console.log("Starting AI extraction for medical report...");
        const extractedData = await extractReportDataWithAI(extractedText);

        // Parse the report date if provided
        let reportDate: Date | null = null;
        if (extractedData.reportDate) {
          try {
            reportDate = new Date(extractedData.reportDate);
            if (isNaN(reportDate.getTime())) {
              reportDate = null;
            }
          } catch {
            reportDate = null;
          }
        }

        // Create medical report record with key-value pairs
        const medicalReport = await prisma.medicalReport.create({
          data: {
            documentId: document.id,
            userId: verifiedUserId,
            hospitalName: extractedData.hospitalName,
            reportDate: reportDate,
            reportValues: {
              create: extractedData.testValues.map((tv) => ({
                key: tv.key,
                value: tv.value,
                unit: tv.unit,
                userId: verifiedUserId,
              })),
            },
          },
        });

        console.log(
          `Created medical report: ${medicalReport.id} with ${extractedData.testValues.length} values`
        );

        // Step 2: Also embed the full OCR text in vector database (same as comments)
        // This allows semantic search across all patient documents
        embedAndStorePatientDocument(
          document.id,
          extractedText,
          title,
          verifiedUserId
        )
          .then((success) => {
            if (success) {
              console.log(
                `Successfully embedded report document: ${document.id}`
              );
              // Mark document as ingested after embedding completes
              prisma.document
                .update({
                  where: { id: document.id },
                  data: { isIngested: true },
                })
                .catch((err) =>
                  console.error("Error updating isIngested:", err)
                );
            } else {
              console.error(`Failed to embed report document: ${document.id}`);
            }
          })
          .catch((error) => {
            console.error(
              `Error embedding report document: ${document.id}`,
              error
            );
          });

        revalidatePath("/dashboard/users/data");

        return {
          success: true,
          message: `Report uploaded successfully! Extracted ${extractedData.testValues.length} test values. Processing embeddings in the background.`,
          documentId: document.id,
        };
      } catch (parseError) {
        console.error("Error extracting report data:", parseError);
        return {
          success: true,
          message:
            "Report uploaded but failed to extract structured data. The raw text has been saved.",
          documentId: document.id,
        };
      }
    }
  } catch (error) {
    console.error("Error uploading user document:", error);
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
 * Get documents for a specific user with pagination.
 */
export async function getUserDocuments(
  userId: string,
  page: number = 1,
  limit: number = 6
) {
  try {
    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where: {
          userId,
          type: "PATIENT",
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.document.count({
        where: {
          userId,
          type: "PATIENT",
        },
      }),
    ]);

    return {
      documents,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("Error fetching user documents:", error);
    return {
      documents: [],
      total: 0,
      page,
      totalPages: 0,
    };
  }
}

/**
 * Delete a user document.
 */
export async function deleteUserDocument(
  documentId: string
): Promise<UploadUserDocumentResult> {
  try {
    await prisma.document.delete({
      where: { id: documentId },
    });

    revalidatePath("/dashboard/users/data");

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
 * Get medical report details including extracted key-value pairs
 */
export async function getMedicalReportDetails(documentId: string) {
  try {
    const medicalReport = await prisma.medicalReport.findFirst({
      where: { documentId },
      include: {
        reportValues: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!medicalReport) {
      return null;
    }

    return {
      id: medicalReport.id,
      documentId: medicalReport.documentId,
      hospitalName: medicalReport.hospitalName,
      reportDate: medicalReport.reportDate?.toISOString() || null,
      createdAt: medicalReport.createdAt.toISOString(),
      values: medicalReport.reportValues.map((v) => ({
        id: v.id,
        key: v.key,
        value: v.value,
        unit: v.unit,
      })),
    };
  } catch (error) {
    console.error("Error fetching medical report details:", error);
    return null;
  }
}
