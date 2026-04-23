"use server";

import prisma from "@/utils/db";
import { revalidatePath } from "next/cache";
import { processSingleUserDataFile } from "@/utils/userDataProcessing";
import { embedAndStorePatientDocument } from "@/utils/embeddings";
import { extractReportDataWithAI } from "@/utils/reportExtractor";
import cloudinary from "@/utils/cloudinary";
import { clerkClient } from "@clerk/nextjs/server";
import { Role } from "@/app/generated/prisma/enums";
import type { Prisma } from "@/app/generated/prisma/client";
import { Pinecone } from "@pinecone-database/pinecone";
import {
  buildMedicalReportExtractedJson,
  buildStructuredMetricRows,
  parseExtractedReportDate,
} from "@/utils/structuredReportIngestion";
import { parseReportText } from "@/utils/reportParser";
import {
  deleteDocumentGraph,
  getDocumentKnowledgeGraphFromNeo4j,
  syncDocumentGraphFromSql,
} from "@/utils/graphRag";

// Initialize Pinecone
let pc: Pinecone;
let index: ReturnType<Pinecone["index"]> | undefined;
if (
  process.env.PINECONE_API_KEY &&
  process.env.PINECONE_INDEX_NAME &&
  process.env.PINECONE_INDEX_HOST
) {
  pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
  index = pc.index(
    process.env.PINECONE_INDEX_NAME,
    process.env.PINECONE_INDEX_HOST,
  );
}

export interface UploadUserDocumentResult {
  success: boolean;
  message: string;
  documentId?: string;
  documentsCreated?: number;
}

export interface CreateUserResult {
  success: boolean;
  message: string;
  user?: {
    id: string;
    clerkId: string;
    email: string;
    name: string | null;
    role: Role;
  };
}

/**
 * Create a new user in both Clerk and the database
 */

export async function createUser(
  username: string,
  email: string,
  password: string,
  role: string,
): Promise<CreateUserResult> {
  // Validate required fields
  if (!username || !email || !password || !role) {
    return { success: false, message: "Missing required fields" };
  }

  // Validate role
  if (!["ADMIN", "DOCTOR", "PATIENT"].includes(role)) {
    return {
      success: false,
      message: "Invalid role. Must be ADMIN, DOCTOR, or PATIENT",
    };
  }

  try {
    // Create user in Clerk
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.createUser({
      emailAddress: [email],
      password: password,
      username: username,
      publicMetadata: {
        role: role,
      },
    });

    // Create user in database
    const dbUser = await prisma.user.create({
      data: {
        clerkId: clerkUser.id,
        email: email,
        name: username,
        role: role as Role,
      },
    });

    revalidatePath("/dashboard/users");

    return {
      success: true,
      message: "User created successfully",
      user: {
        id: dbUser.id,
        clerkId: dbUser.clerkId,
        email: dbUser.email,
        name: dbUser.name ?? username,
        role: dbUser.role,
      },
    };
  } catch (error: unknown) {
    console.error("Error creating user:", error);

    // Handle Clerk-specific errors
    if (error && typeof error === "object" && "errors" in error) {
      const clerkError = error as {
        errors: Array<{ message: string; code: string }>;
      };
      const firstError = clerkError.errors[0];

      if (firstError?.code === "form_identifier_exists") {
        return {
          success: false,
          message: "A user with this email or username already exists",
        };
      }

      return {
        success: false,
        message: firstError?.message || "Failed to create user in Clerk",
      };
    }

    // Handle Prisma unique constraint errors
    if (error && typeof error === "object" && "code" in error) {
      const prismaError = error as { code: string };
      if (prismaError.code === "P2002") {
        return {
          success: false,
          message: "A user with this email already exists in the database",
        };
      }
    }

    return { success: false, message: "Internal server error" };
  }
}

interface FileData {
  base64: string;
  type: "pdf" | "image";
  name: string;
}

async function persistStructuredMedicalReport(args: {
  documentId: string;
  userId: string;
  extractedText: string;
  extractedData: Awaited<ReturnType<typeof extractReportDataWithAI>>;
  reportDate: Date | null;
  reportURL: string | null;
}) {
  const observedAt = args.reportDate ?? new Date();
  const metricBuildResult = buildStructuredMetricRows(
    args.extractedData.testValues,
    args.userId,
    observedAt,
  );

  const medicalReport = await prisma.$transaction(
    async (tx) => {
      const createdReport = await tx.medicalReport.create({
        data: {
          documentId: args.documentId,
          userId: args.userId,
          hospitalName: args.extractedData.hospitalName,
          markdown: args.extractedText,
          extractedJson: buildMedicalReportExtractedJson(
            args.extractedData,
            metricBuildResult,
          ) as Prisma.InputJsonValue,
          reportDate: args.reportDate,
          reportURL: args.reportURL,
          passed: args.extractedData.passed,
          fidelityScore: args.extractedData.fidelityScore,
          conclusion: args.extractedData.conclusion,
        },
      });

      if (metricBuildResult.rows.length > 0) {
        await tx.medicalReportValue.createMany({
          data: metricBuildResult.rows.map((row) => ({
            ...row,
            reportId: createdReport.id,
          })),
        });
      }

      return createdReport;
    },
    {
      maxWait: 15_000,
      timeout: 30_000,
    },
  );

  return {
    medicalReport,
    metricBuildResult,
  };
}

function enrichExtractionWithTextFallback(
  extractedData: Awaited<ReturnType<typeof extractReportDataWithAI>>,
  extractedText: string,
): Awaited<ReturnType<typeof extractReportDataWithAI>> {
  if (extractedData.testValues.length > 0) {
    return extractedData;
  }

  const parsed = parseReportText(extractedText);
  if (parsed.keyValues.length === 0) {
    return extractedData;
  }

  return {
    ...extractedData,
    hospitalName: extractedData.hospitalName ?? parsed.hospitalName,
    reportDate:
      extractedData.reportDate ??
      (parsed.reportDate
        ? parsed.reportDate.toISOString().split("T")[0]
        : null),
    testValues: parsed.keyValues,
    conclusion:
      extractedData.conclusion ??
      "Fallback parser extracted report values from OCR text.",
  };
}

function canUploadToCloudinary(): boolean {
  return Boolean(
    process.env.CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
  );
}

async function uploadReportFileToCloudinary(args: {
  dataUri: string;
  fileType: "pdf" | "image";
  userId: string;
  documentId: string;
}): Promise<string | null> {
  if (!canUploadToCloudinary()) {
    console.warn(
      "Cloudinary environment variables are not fully configured. Skipping report upload.",
    );
    return null;
  }

  try {
    const uploadResult = await cloudinary.uploader.upload(args.dataUri, {
      resource_type: args.fileType === "pdf" ? "raw" : "image",
      folder: `medical_reports/${args.userId}`,
      public_id: `report_${args.documentId}_${Date.now()}${
        args.fileType === "pdf" ? ".pdf" : ""
      }`,
    });

    console.log(`Uploaded file to Cloudinary: ${uploadResult.secure_url}`);
    return uploadResult.secure_url;
  } catch (error) {
    console.error(
      "Cloudinary upload failed. Continuing without reportURL.",
      error,
    );
    return null;
  }
}

export type PatientDataType = "REPORT" | "COMMENT";

/**
 * Upload and process PDF/Image documents for a user.
 * Stores documents in the database with PATIENT type.
 * Supports two data types:
 * - COMMENT: Semantic ingestion into vector database + graph sync
 * - REPORT: Extract key-value pairs into SQL + semantic ingestion (no graph sync)
 */
export async function uploadUserDocument(
  formData: FormData,
): Promise<UploadUserDocumentResult> {
  try {
    const title = formData.get("title") as string;
    const userId = formData.get("userId") as string;
    const filesJson = formData.get("files") as string;
    const dataType = (formData.get("dataType") as PatientDataType) || "COMMENT";
    console.log(dataType, "dataType");

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
      `Processing ${files.length} file(s) for user ${userId} as ${dataType}...`,
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

    // Process each file separately as its own document — all in parallel
    const totalFiles = files.length;

    const processFile = async (
      file: FileData,
      index: number,
    ): Promise<{ success: boolean; testValues: number; error?: string }> => {
      const fileTitle = totalFiles === 1 ? title : `${title}-${index + 1}`;

      console.log(
        `Processing file ${index + 1}/${totalFiles}: ${
          file.name
        } as "${fileTitle}" (${dataType})`,
      );

      try {
        // Parse each uploaded file independently so COMMENT uploads never merge.
        const extractedText = await processSingleUserDataFile(file);

        if (!extractedText) {
          console.error(`Failed to extract text from file: ${file.name}`);
          return {
            success: false,
            testValues: 0,
            error: `Failed to extract text from ${file.name}.`,
          };
        }

        console.log(
          `File ${file.name}: Extracted ${extractedText.length} characters of text.`,
        );

        // Store the single file's data
        const content = JSON.stringify({
          files: [
            {
              name: file.name,
              type: file.type,
              data: file.base64,
            },
          ],
          extractedText,
        });

        if (dataType === "COMMENT") {
          // COMMENT type: OCR and embed each file separately
          const document = await prisma.document.create({
            data: {
              title: fileTitle,
              content,
              type: "PATIENT",
              patientDataType: dataType,
              isIngested: false,
              userId: verifiedUserId,
            },
          });

          console.log(
            `Created comment document record: ${document.id} for file ${file.name}`,
          );

          const graphSynced = await syncDocumentGraphFromSql(document.id);
          if (!graphSynced) {
            console.warn(
              `Neo4j sync skipped/failed for comment document ${document.id}`,
            );
          }

          // Embed and store in Pinecone with patient metadata (run in background)
          embedAndStorePatientDocument(
            document.id,
            extractedText,
            fileTitle,
            verifiedUserId,
          )
            .then((success) => {
              if (success) {
                console.log(
                  `Successfully embedded patient document: ${document.id}`,
                );
              } else {
                console.error(
                  `Failed to embed patient document: ${document.id}`,
                );
              }
            })
            .catch((error) => {
              console.error(
                `Error embedding patient document: ${document.id}`,
                error,
              );
            });

          return { success: true, testValues: 0 };
        } else {
          // REPORT type: AI extraction for each file separately
          // Determine file type based on MIME type
          const fileType: "pdf" | "image" = file.type.includes("pdf")
            ? "pdf"
            : "image";
          const extractedData = await extractReportDataWithAI(
            extractedText,
            file.base64,
            fileType,
          );
          const enrichedExtractedData = enrichExtractionWithTextFallback(
            extractedData,
            extractedText,
          );

          // Phase 1: Parse canonical report metadata for SQL storage.
          const reportDate = parseExtractedReportDate(
            enrichedExtractedData.reportDate,
          );

          const document = await prisma.document.create({
            data: {
              title: fileTitle,
              content,
              type: "PATIENT",
              patientDataType: dataType,
              isIngested: false,
              userId: verifiedUserId,
            },
          });

          console.log(
            `Created report document record: ${document.id} for file ${file.name}`,
          );

          // Upload the file to Cloudinary
          const mimeType =
            file.type === "pdf" ? "application/pdf" : "image/png";
          const dataUri = `data:${mimeType};base64,${file.base64}`;

          const reportURL = await uploadReportFileToCloudinary({
            dataUri,
            fileType,
            userId: verifiedUserId,
            documentId: document.id,
          });

          // Phase 2: Persist report envelope + structured metric rows in one transaction.
          const { medicalReport, metricBuildResult } =
            await persistStructuredMedicalReport({
              documentId: document.id,
              userId: verifiedUserId,
              extractedText,
              extractedData: enrichedExtractedData,
              reportDate,
              reportURL,
            });

          // Embed and store stringified report data in vector database (run in background)
          embedAndStorePatientDocument(
            document.id,
            JSON.stringify(enrichedExtractedData),
            fileTitle,
            verifiedUserId,
          )
            .then((success) => {
              if (success) {
                console.log(
                  `Successfully embedded medical report: ${document.id}`,
                );
              } else {
                console.error(`Failed to embed medical report: ${document.id}`);
              }
            })
            .catch((error) => {
              console.error(
                `Error embedding medical report: ${document.id}`,
                error,
              );
            });

          console.log(
            `Created medical report: ${medicalReport.id} with ${metricBuildResult.rows.length} values for file ${file.name} (numeric parsed: ${metricBuildResult.numericParsedCount}, alias mapped: ${metricBuildResult.aliasMappedCount}, composite expanded: ${metricBuildResult.compositeExpandedCount}, unmapped: ${metricBuildResult.unmappedMetricCount}, skipped: ${metricBuildResult.skippedCount})`,
          );

          return { success: true, testValues: extractedData.testValues.length };
        }
      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError);
        return {
          success: false,
          testValues: 0,
          error: `Error processing ${file.name}.`,
        };
      }
    };

    // Run all file processing in parallel
    const results = await Promise.all(
      files.map((file, index) => processFile(file, index)),
    );

    const successCount = results.filter((r) => r.success).length;
    const totalTestValues = results.reduce((sum, r) => sum + r.testValues, 0);
    const errors = results.filter((r) => r.error).map((r) => r.error as string);

    revalidatePath("/dashboard/users/data");

    if (successCount === 0) {
      return {
        success: false,
        message: `Failed to process any files. ${errors.join(" ")}`,
      };
    }

    if (dataType === "COMMENT") {
      const errorSuffix =
        errors.length > 0
          ? ` (${errors.length} file(s) failed: ${errors.join(" ")})`
          : "";
      return {
        success: true,
        message: `${successCount}/${totalFiles} comment(s) uploaded successfully! Processing embeddings in the background.${errorSuffix}`,
      };
    } else {
      const errorSuffix =
        errors.length > 0
          ? ` (${errors.length} file(s) failed: ${errors.join(" ")})`
          : "";
      return {
        success: true,
        message: `${successCount}/${totalFiles} report(s) uploaded successfully! Extracted ${totalTestValues} total test values.${errorSuffix}`,
      };
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
 * Get user details by ID.
 */
export async function getUserById(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as "ADMIN" | "DOCTOR" | "PATIENT",
      createdAt: user.createdAt.toISOString(),
    };
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

export interface UserFidelitySummary {
  averageFidelityScore: number | null;
  scoredReports: number;
  totalReports: number;
}

/**
 * Get average fidelity score summary for a patient's medical reports.
 */
export async function getUserAverageFidelitySummary(
  userId: string,
): Promise<UserFidelitySummary> {
  try {
    const [scoredAggregate, totalReports] = await Promise.all([
      prisma.medicalReport.aggregate({
        where: {
          userId,
          fidelityScore: {
            gt: 0,
          },
        },
        _avg: {
          fidelityScore: true,
        },
        _count: {
          _all: true,
        },
      }),
      prisma.medicalReport.count({
        where: {
          userId,
        },
      }),
    ]);

    return {
      averageFidelityScore: scoredAggregate._avg.fidelityScore ?? null,
      scoredReports: scoredAggregate._count._all,
      totalReports,
    };
  } catch (error) {
    console.error("Error fetching user average fidelity summary:", error);
    return {
      averageFidelityScore: null,
      scoredReports: 0,
      totalReports: 0,
    };
  }
}

/**
 * Get documents for a specific user with pagination.
 */
export async function getUserDocuments(
  userId: string,
  page: number = 1,
  limit: number = 6,
) {
  try {
    const whereClause = {
      userId,
      type: "PATIENT" as const,
    };

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where: whereClause,
        select: {
          id: true,
          title: true,
          type: true,
          patientDataType: true,
          createdAt: true,
          isIngested: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.document.count({
        where: whereClause,
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
export async function getAllUsersWithDocumentCount() {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: ["PATIENT", "DOCTOR"],
        },
      },
      select: {
        id: true,
        clerkId: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            documents: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return users.map((user) => ({
      id: user.id,
      clerkId: user.clerkId,
      name: user.name,
      email: user.email,
      role: user.role as "ADMIN" | "DOCTOR" | "PATIENT",
      createdAt: user.createdAt.toISOString(),
      _count: {
        documents: user._count.documents,
      },
    }));
  } catch (error) {
    console.error("Error fetching users with document count:", error);
    return [];
  }
}

export interface EditUserResult {
  success: boolean;
  message: string;
  user?: {
    id: string;
    clerkId: string;
    email: string;
    name: string | null;
    role: Role;
  };
}

export async function editUser(
  userId: string,
  clerkId: string,
  name: string,
  email: string,
  role: string,
): Promise<EditUserResult> {
  if (!userId || !clerkId || !name || !email || !role) {
    return { success: false, message: "Missing required fields" };
  }

  if (!["ADMIN", "DOCTOR", "PATIENT"].includes(role)) {
    return {
      success: false,
      message: "Invalid role. Must be ADMIN, DOCTOR, or PATIENT",
    };
  }

  try {
    const clerk = await clerkClient();

    await clerk.users.updateUser(clerkId, {
      username: name,
      publicMetadata: {
        role: role,
      },
    });

    const dbUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        role: role as Role,
      },
    });

    revalidatePath("/dashboard/users");

    return {
      success: true,
      message: "User updated successfully",
      user: {
        id: dbUser.id,
        clerkId: dbUser.clerkId,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
      },
    };
  } catch (error: unknown) {
    console.error("Error editing user:", error);

    if (error && typeof error === "object" && "errors" in error) {
      const clerkError = error as {
        errors: Array<{ message: string; code: string }>;
      };
      return {
        success: false,
        message:
          clerkError.errors[0]?.message || "Failed to update user in Clerk",
      };
    }

    if (error && typeof error === "object" && "code" in error) {
      const prismaError = error as { code: string };
      if (prismaError.code === "P2002") {
        return {
          success: false,
          message: "A user with this email already exists",
        };
      }
    }

    return { success: false, message: "Internal server error" };
  }
}

export interface DeleteUserResult {
  success: boolean;
  message: string;
}

export async function deleteUser(
  userId: string,
  clerkId: string,
): Promise<DeleteUserResult> {
  if (!userId || !clerkId) {
    return { success: false, message: "Missing required fields" };
  }

  try {
    const clerk = await clerkClient();
    await clerk.users.deleteUser(clerkId);

    await prisma.user.delete({
      where: { id: userId },
    });

    revalidatePath("/dashboard/users");

    return {
      success: true,
      message: "User deleted successfully",
    };
  } catch (error: unknown) {
    console.error("Error deleting user:", error);

    if (error && typeof error === "object" && "errors" in error) {
      const clerkError = error as {
        errors: Array<{ message: string; code: string }>;
      };
      return {
        success: false,
        message:
          clerkError.errors[0]?.message || "Failed to delete user from Clerk",
      };
    }

    return { success: false, message: "Internal server error" };
  }
}

/**
 * Delete a user document.
 */
export async function deleteUserDocument(
  documentId: string,
): Promise<UploadUserDocumentResult> {
  try {
    await deleteDocumentGraph(documentId);

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

    const extractedJson = medicalReport.extractedJson as Record<
      string,
      unknown
    > | null;
    const structuredIngestion =
      extractedJson && typeof extractedJson === "object"
        ? (extractedJson["structuredIngestion"] as
            | Record<string, unknown>
            | undefined)
        : undefined;

    return {
      id: medicalReport.id,
      documentId: medicalReport.documentId,
      hospitalName: medicalReport.hospitalName,
      reportDate: medicalReport.reportDate?.toISOString() || null,
      reportURL: medicalReport.reportURL,
      createdAt: medicalReport.createdAt.toISOString(),
      markdown: medicalReport.markdown,
      passed: medicalReport.passed,
      fidelityScore: medicalReport.fidelityScore,
      conclusion: medicalReport.conclusion,
      dictionaryExpansion:
        (structuredIngestion?.["dictionaryExpansion"] as
          | Record<string, unknown>
          | null
          | undefined) ?? null,
      values: medicalReport.reportValues.map((v) => ({
        id: v.id,
        key: v.key,
        value: v.value,
        unit: v.unit,
        keyNormalized: v.keyNormalized,
        valueNumeric: v.valueNumeric,
        unitNormalized: v.unitNormalized,
        observedAt: v.observedAt?.toISOString() ?? null,
        sequence: v.sequence,
      })),
    };
  } catch (error) {
    console.error("Error fetching medical report details:", error);
    return null;
  }
}

export interface DocumentDetails {
  parentChunks: number;
  childChunks: number;
  files: Array<{
    name: string;
    type: string;
    url: string;
  }>;
}

/**
 * Get document details including parent/child chunks count and files
 */
export async function getDocumentDetails(
  documentId: string,
): Promise<DocumentDetails | null> {
  try {
    const [document, parentChunksCount, childChunksCount] = await Promise.all([
      prisma.document.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          content: true,
        },
      }),
      prisma.parentChunk.count({
        where: { documentId },
      }),
      prisma.ragChunk.count({
        where: { documentId },
      }),
    ]);

    if (!document) {
      return null;
    }

    // Parse content to get files
    const files: Array<{ name: string; type: string; url: string }> = [];
    try {
      const content = document.content || "";
      if (typeof content === "string") {
        const parsedContent = JSON.parse(content);
        if (parsedContent.files && Array.isArray(parsedContent.files)) {
          files.push(...parsedContent.files);
        }
      }
    } catch (e) {
      console.error("Error parsing document content:", e);
    }

    return {
      parentChunks: parentChunksCount,
      childChunks: childChunksCount,
      files,
    };
  } catch (error) {
    console.error("Error fetching document details:", error);
    return null;
  }
}

export async function getDocumentKnowledgeGraph(documentId: string) {
  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        type: true,
        patientDataType: true,
      },
    });

    if (!document) {
      return null;
    }

    // Patient graph is only supported for COMMENT/notes documents.
    if (document.type === "PATIENT" && document.patientDataType !== "COMMENT") {
      return null;
    }

    return await getDocumentKnowledgeGraphFromNeo4j(documentId);
  } catch (error) {
    console.error("Error fetching document knowledge graph details:", error);
    return null;
  }
}

/**
 * Delete a document and all its associated data
 */
export async function deleteDocument(documentId: string) {
  try {
    // First, get the document to verify it exists
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return {
        success: false,
        message: "Document not found.",
      };
    }

    if (index) {
      try {
        await Promise.all([
          index.deleteMany({
            documentId: { $eq: Number(documentId) },
          }),
          index.deleteMany({
            documentId: { $eq: String(documentId) },
          }),
        ]);
        console.log(`Deleted vector embeddings for documentId: ${documentId}`);
      } catch (pineconeError) {
        console.error("Failed to delete from Pinecone:", pineconeError);
      }
    }

    await deleteDocumentGraph(documentId);

    // Delete all associated data in the correct order due to foreign key constraints

    // 1. Delete medical report values (if any)
    await prisma.medicalReportValue.deleteMany({
      where: {
        report: {
          documentId,
        },
      },
    });

    // 2. Delete medical reports (if any)
    await prisma.medicalReport.deleteMany({
      where: { documentId },
    });

    // 3. Delete RAG chunks
    await prisma.ragChunk.deleteMany({
      where: { documentId },
    });

    // 4. Delete parent chunks
    await prisma.parentChunk.deleteMany({
      where: { documentId },
    });

    // 5. Finally, delete the document itself
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
      message: "Failed to delete document.",
    };
  }
}

/**
 * Delete all documents and their associated data for a specific user
 */
export async function deleteAllDocuments(userId: string) {
  try {
    const userDocumentIds = await prisma.document.findMany({
      where: { userId },
      select: { id: true },
    });

    if (index) {
      try {
        await Promise.all([
          index.deleteMany({
            patientId: { $eq: Number(userId) },
          }),
          index.deleteMany({
            patientId: { $eq: String(userId) },
          }),
        ]);
        console.log(`Deleted vector embeddings for patientId: ${userId}`);
      } catch (pineconeError) {
        console.error("Failed to delete from Pinecone:", pineconeError);
      }
    }

    if (userDocumentIds.length > 0) {
      await Promise.allSettled(
        userDocumentIds.map((doc) => deleteDocumentGraph(doc.id)),
      );
    }

    // We need to delete in the correct order to respect foreign key constraints
    await prisma.medicalReportValue.deleteMany({
      where: {
        userId: userId,
      },
    });

    await prisma.medicalReport.deleteMany({
      where: {
        document: {
          userId: userId,
        },
      },
    });

    await prisma.ragChunk.deleteMany({
      where: {
        document: {
          userId: userId,
        },
      },
    });

    await prisma.parentChunk.deleteMany({
      where: {
        document: {
          userId: userId,
        },
      },
    });

    await prisma.document.deleteMany({
      where: { userId },
    });

    revalidatePath("/dashboard/users/data");
    revalidatePath(`/dashboard/users/${userId}/data`);

    return {
      success: true,
      message: "All documents deleted successfully.",
    };
  } catch (error) {
    console.error("Error deleting all documents:", error);
    return {
      success: false,
      message: "Failed to delete documents.",
    };
  }
}
