"use server";

import prisma from "@/utils/db";
import {
  deleteDocumentVectors,
  querySimilarDocuments,
  getParentTexts,
  rerankDocuments,
} from "@/utils/embeddings";
import {
  deleteDocumentGraph,
  getFullDocumentGraphFromNeo4j,
  getFullDomainGraphFromNeo4j,
  searchGraphContextInNeo4j,
  type FullGraphPayload,
} from "@/utils/graphRag";
import { revalidatePath } from "next/cache";

export interface DocumentWithStats {
  id: string;
  title: string;
  content: string;
  pdfUrl: string | null;
  isIngested: boolean;
  ragSubtype: "MEDICINE" | "DISEASE" | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    ragChunks: number;
    parentChunks: number;
  };
}

export interface DatabaseStats {
  totalDocuments: number;
  ingestedDocuments: number;
  totalParentChunks: number;
  totalRagChunks: number;
  documentsPerDay: { date: string; count: number }[];
  chunksPerDocument: {
    title: string;
    parentChunks: number;
    ragChunks: number;
  }[];
  ingestionRate: number;
  avgChunksPerDocument: number;
  recentDocuments: {
    id: string;
    title: string;
    createdAt: Date;
    isIngested: boolean;
  }[];
}

export interface ParentSearchResult {
  parentChunkId: string;
  parentText: string;
  documentId: string;
  documentTitle: string;
  score: number;
}

export interface HybridGraphNode {
  id: string;
  type: string;
  label: string;
  properties: Record<string, string | null>;
}

export interface HybridGraphEdge {
  source: string;
  target: string;
  type: string;
  sourceDocumentId?: string | null;
  reportDate?: string | null;
  properties?: Record<string, string | null>;
}

export interface HybridGraphEvidence {
  id: string;
  patientId: string;
  patientName: string | null;
  reportId: string;
  documentTitle: string | null;
  reportDate: string | null;
  hospitalName: string | null;
  key: string;
  keyNormalized: string | null;
  value: string;
  unit: string | null;
  observedAt: string | null;
}

export interface HybridGraphContext {
  queryTerms: string[];
  nodes: HybridGraphNode[];
  edges: HybridGraphEdge[];
  evidence: HybridGraphEvidence[];
  stats: {
    patients: number;
    reports: number;
    observations: number;
    metrics: number;
    totalNodes: number;
    totalEdges: number;
  };
}

export interface HybridSearchResult {
  vectorResults: ParentSearchResult[];
  graphContext: HybridGraphContext;
}

export type DatabaseFullGraph = FullGraphPayload;

const EMPTY_HYBRID_GRAPH_CONTEXT: HybridGraphContext = {
  queryTerms: [],
  nodes: [],
  edges: [],
  evidence: [],
  stats: {
    patients: 0,
    reports: 0,
    observations: 0,
    metrics: 0,
    totalNodes: 0,
    totalEdges: 0,
  },
};

function extractQueryTerms(query: string): string[] {
  const stopWords = new Set([
    "the",
    "and",
    "for",
    "with",
    "from",
    "that",
    "this",
    "are",
    "was",
    "were",
    "what",
    "when",
    "where",
    "which",
    "show",
    "over",
    "last",
    "about",
    "into",
    "have",
    "has",
    "had",
    "patient",
    "report",
  ]);

  return Array.from(
    new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .map((term) => term.trim())
        .filter((term) => term.length >= 3 && !stopWords.has(term)),
    ),
  ).slice(0, 6);
}

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function toMetricSlug(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || "unknown_metric";
}

async function buildPrivateGraphContext(
  query: string,
  maxRows: number = 60,
): Promise<HybridGraphContext> {
  try {
    const queryTerms = extractQueryTerms(query);

    const rows = await prisma.medicalReportValue.findMany({
      where:
        queryTerms.length > 0
          ? {
              OR: queryTerms.flatMap((term) => [
                { key: { contains: term, mode: "insensitive" } },
                { keyNormalized: { contains: term, mode: "insensitive" } },
                { value: { contains: term, mode: "insensitive" } },
                {
                  report: {
                    hospitalName: { contains: term, mode: "insensitive" },
                  },
                },
                {
                  report: {
                    user: {
                      OR: [
                        { name: { contains: term, mode: "insensitive" } },
                        { email: { contains: term, mode: "insensitive" } },
                      ],
                    },
                  },
                },
              ]),
            }
          : undefined,
      include: {
        report: {
          select: {
            id: true,
            reportDate: true,
            hospitalName: true,
            document: {
              select: {
                id: true,
                title: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: [{ observedAt: "desc" }, { createdAt: "desc" }],
      take: maxRows,
    });

    const nodeMap = new Map<string, HybridGraphNode>();
    const edgeMap = new Map<string, HybridGraphEdge>();
    const evidence: HybridGraphEvidence[] = [];

    for (const row of rows) {
      const patientNodeId = `patient:${row.report.user.id}`;
      const reportNodeId = `report:${row.reportId}`;
      const observationNodeId = `observation:${row.id}`;
      const metricSlug = toMetricSlug(row.keyNormalized ?? row.key);
      const metricNodeId = `metric:${metricSlug}`;

      const patientLabel = row.report.user.name ?? row.report.user.email;
      const reportLabel =
        row.report.document?.title ??
        row.report.hospitalName ??
        `Report ${row.report.id}`;
      const observationLabel = `${row.key}: ${row.value}${
        row.unit ? ` ${row.unit}` : ""
      }`;

      if (!nodeMap.has(patientNodeId)) {
        nodeMap.set(patientNodeId, {
          id: patientNodeId,
          type: "Patient",
          label: patientLabel,
          properties: {
            patientId: row.report.user.id,
            name: row.report.user.name,
            email: row.report.user.email,
          },
        });
      }

      if (!nodeMap.has(reportNodeId)) {
        nodeMap.set(reportNodeId, {
          id: reportNodeId,
          type: "Report",
          label: reportLabel,
          properties: {
            reportId: row.report.id,
            reportDate: toIso(row.report.reportDate),
            hospitalName: row.report.hospitalName,
          },
        });
      }

      if (!nodeMap.has(observationNodeId)) {
        nodeMap.set(observationNodeId, {
          id: observationNodeId,
          type: "Observation",
          label: observationLabel,
          properties: {
            key: row.key,
            value: row.value,
            unit: row.unit,
            observedAt: toIso(row.observedAt),
          },
        });
      }

      if (!nodeMap.has(metricNodeId)) {
        nodeMap.set(metricNodeId, {
          id: metricNodeId,
          type: "Metric",
          label: row.keyNormalized ?? row.key,
          properties: {
            key: row.key,
            keyNormalized: row.keyNormalized,
          },
        });
      }

      const hasReportKey = `${patientNodeId}|HAS_REPORT|${reportNodeId}`;
      const hasObservationKey = `${reportNodeId}|HAS_OBSERVATION|${observationNodeId}`;
      const ofMetricKey = `${observationNodeId}|OF_METRIC|${metricNodeId}`;
      const rowDocId = row.report.document?.id ?? null;
      const rowReportDate = toIso(row.report.reportDate);

      if (!edgeMap.has(hasReportKey)) {
        edgeMap.set(hasReportKey, {
          source: patientNodeId,
          target: reportNodeId,
          type: "HAS_REPORT",
          sourceDocumentId: rowDocId,
          reportDate: rowReportDate,
        });
      }

      if (!edgeMap.has(hasObservationKey)) {
        edgeMap.set(hasObservationKey, {
          source: reportNodeId,
          target: observationNodeId,
          type: "HAS_OBSERVATION",
          sourceDocumentId: rowDocId,
          reportDate: rowReportDate,
        });
      }

      if (!edgeMap.has(ofMetricKey)) {
        edgeMap.set(ofMetricKey, {
          source: observationNodeId,
          target: metricNodeId,
          type: "OF_METRIC",
          sourceDocumentId: rowDocId,
          reportDate: rowReportDate,
        });
      }

      evidence.push({
        id: row.id,
        patientId: row.report.user.id,
        patientName: null,
        reportId: row.report.id,
        documentTitle: row.report.document?.title ?? null,
        reportDate: toIso(row.report.reportDate),
        hospitalName: row.report.hospitalName,
        key: row.key,
        keyNormalized: row.keyNormalized,
        value: row.value,
        unit: row.unit,
        observedAt: toIso(row.observedAt),
      });
    }

    const nodes = Array.from(nodeMap.values());
    const edges = Array.from(edgeMap.values());

    const stats = {
      patients: nodes.filter((n) => n.type === "Patient").length,
      reports: nodes.filter((n) => n.type === "Report").length,
      observations: nodes.filter((n) => n.type === "Observation").length,
      metrics: nodes.filter((n) => n.type === "Metric").length,
      totalNodes: nodes.length,
      totalEdges: edges.length,
    };

    return {
      queryTerms,
      nodes: nodes.slice(0, 200),
      edges: edges.slice(0, 300),
      evidence: evidence.slice(0, 30),
      stats,
    };
  } catch (error) {
    console.error("Error building private graph context:", error);
    return EMPTY_HYBRID_GRAPH_CONTEXT;
  }
}

/**
 * Get all documents with their chunk counts
 */
export async function getDocuments(): Promise<DocumentWithStats[]> {
  const documents = await prisma.document.findMany({
    where: {
      type: "RAG",
    },
    include: {
      _count: {
        select: {
          ragChunks: true,
          parentChunks: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return documents;
}

export async function getDocumentFullGraph(
  documentId: string,
): Promise<DatabaseFullGraph> {
  return getFullDocumentGraphFromNeo4j(documentId);
}

export async function getDomainFullGraph(
  domain: "medicine" | "disease",
): Promise<DatabaseFullGraph> {
  return getFullDomainGraphFromNeo4j(domain);
}

/**
 * Delete a document and all its vectors
 */
export async function deleteDocument(
  documentId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // First delete vectors from Pinecone.
    const vectorsDeleted = await deleteDocumentVectors(documentId);
    if (!vectorsDeleted) {
      return { success: false, error: "Failed to delete document embeddings" };
    }

    // Delete graph subgraph for this document.
    await deleteDocumentGraph(documentId);

    // Remove SQL source records (parent chunks + document).
    await prisma.$transaction(async (tx) => {
      await tx.parentChunk.deleteMany({
        where: { documentId },
      });

      await tx.document.delete({
        where: { id: documentId },
      });
    });

    revalidatePath("/dashboard/database");
    return { success: true };
  } catch (error) {
    console.error("Error deleting document:", error);
    return { success: false, error: "Failed to delete document" };
  }
}

/**
 * Get database statistics for the stats page
 */
export async function getDatabaseStats(): Promise<DatabaseStats> {
  // Get total counts (only RAG documents, exclude PATIENT)
  const [totalDocuments, ingestedDocuments, totalParentChunks, totalRagChunks] =
    await Promise.all([
      prisma.document.count({ where: { type: "RAG" } }),
      prisma.document.count({ where: { type: "RAG", isIngested: true } }),
      prisma.parentChunk.count(),
      prisma.ragChunk.count(),
    ]);

  // Get documents per day (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const documentsPerDayRaw = await prisma.document.groupBy({
    by: ["createdAt"],
    _count: { id: true },
    where: {
      type: "RAG", // Only RAG documents
      createdAt: { gte: thirtyDaysAgo },
    },
    orderBy: { createdAt: "asc" },
  });

  // Aggregate by date
  const documentsPerDayMap = new Map<string, number>();
  documentsPerDayRaw.forEach((item) => {
    const date = item.createdAt.toISOString().split("T")[0];
    documentsPerDayMap.set(
      date,
      (documentsPerDayMap.get(date) || 0) + item._count.id,
    );
  });

  const documentsPerDay = Array.from(documentsPerDayMap.entries()).map(
    ([date, count]) => ({
      date,
      count,
    }),
  );

  // Get chunks per document (top 10)
  const chunksPerDocumentRaw = await prisma.document.findMany({
    select: {
      title: true,
      _count: {
        select: {
          parentChunks: true,
          ragChunks: true,
        },
      },
    },
    where: { type: "RAG", isIngested: true }, // Only RAG documents
    orderBy: {
      ragChunks: { _count: "desc" },
    },
    take: 10,
  });

  const chunksPerDocument = chunksPerDocumentRaw.map((doc) => ({
    title:
      doc.title.length > 30 ? doc.title.substring(0, 30) + "..." : doc.title,
    parentChunks: doc._count.parentChunks,
    ragChunks: doc._count.ragChunks,
  }));

  // Get recent documents (only RAG documents)
  const recentDocuments = await prisma.document.findMany({
    select: {
      id: true,
      title: true,
      createdAt: true,
      isIngested: true,
    },
    where: { type: "RAG" }, // Only RAG documents
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // Calculate averages
  const ingestionRate =
    totalDocuments > 0 ? (ingestedDocuments / totalDocuments) * 100 : 0;
  const avgChunksPerDocument =
    ingestedDocuments > 0 ? totalRagChunks / ingestedDocuments : 0;

  return {
    totalDocuments,
    ingestedDocuments,
    totalParentChunks,
    totalRagChunks,
    documentsPerDay,
    chunksPerDocument,
    ingestionRate,
    avgChunksPerDocument,
    recentDocuments,
  };
}

/**
 * Search the vector database and return top parent chunks with scores
 * Uses parent document RAG to aggregate child chunk scores by parent
 * @param query - Search query
 * @param topK - Number of child results to fetch before aggregating
 * @param typeFilter - Filter by document type: "medicine", "disease", or "all" (default: "all")
 */
export async function searchVectorDatabase(
  query: string,
  topK: number = 50,
  typeFilter: "medicine" | "disease" | "all" = "all",
): Promise<ParentSearchResult[]> {
  if (!query.trim()) {
    return [];
  }

  try {
    // Build filter - ALWAYS exclude patient documents
    let filter: Record<string, unknown>;

    if (typeFilter === "all") {
      // Query both medicine and disease, but NEVER patient
      filter = {
        type: { $in: ["medicine", "disease"] },
      };
    } else {
      // Query specific type (medicine or disease)
      filter = {
        type: typeFilter,
      };
    }

    // Query for more results to aggregate by parent
    const childResults = await querySimilarDocuments(query, topK, filter);

    if (childResults.length === 0) {
      return [];
    }

    // Aggregate scores by parent chunk using reciprocal rank fusion
    const parentScores = new Map<
      string,
      {
        totalScore: number;
        maxScore: number;
        documentId: string;
        documentTitle: string;
      }
    >();

    childResults.forEach((result, index) => {
      // Skip results with missing parentChunkId
      if (!result.parentChunkId) {
        return;
      }

      const existing = parentScores.get(result.parentChunkId);
      // Reciprocal rank contribution
      const rrfScore = 1 / (index + 60); // k=60 is common for RRF

      if (existing) {
        existing.totalScore += rrfScore;
        existing.maxScore = Math.max(existing.maxScore, result.score);
      } else {
        parentScores.set(result.parentChunkId, {
          totalScore: rrfScore,
          maxScore: result.score,
          documentId: result.documentId,
          documentTitle: result.documentTitle,
        });
      }
    });

    // Sort parents by their aggregated score
    const sortedParents = Array.from(parentScores.entries())
      .sort((a, b) => {
        // Primary: total RRF score, Secondary: max similarity score
        const scoreDiff = b[1].totalScore - a[1].totalScore;
        if (Math.abs(scoreDiff) > 0.001) return scoreDiff;
        return b[1].maxScore - a[1].maxScore;
      })
      .slice(0, 10);

    // Fetch parent texts
    const parentChunkIds = sortedParents.map(([id]) => id);
    const parentTexts = await getParentTexts(parentChunkIds);

    // Build intermediate results with parent text
    const intermediateResults = sortedParents.map(([parentChunkId, data]) => ({
      parentChunkId,
      parentText: parentTexts.get(parentChunkId) || "",
      documentId: data.documentId,
      documentTitle: data.documentTitle,
      score: data.maxScore,
    }));

    // Filter to only unique parent texts
    const seenTexts = new Set<string>();
    const uniqueResults = intermediateResults.filter((result) => {
      if (!result.parentText || seenTexts.has(result.parentText)) {
        return false;
      }
      seenTexts.add(result.parentText);
      return true;
    });

    if (uniqueResults.length === 0) {
      return [];
    }

    // Rerank unique parent texts using VoyageAI
    const documentsToRerank = uniqueResults.map((r) => r.parentText);
    const rerankedDocs = await rerankDocuments(query, documentsToRerank);

    if (rerankedDocs.length === 0) {
      // If reranking failed, return original results
      return uniqueResults;
    }

    // Map reranked results back to ParentSearchResult format, preserving rerank order
    const results: ParentSearchResult[] = rerankedDocs.map((reranked) => {
      const original = uniqueResults[reranked.index];
      return {
        parentChunkId: original.parentChunkId,
        parentText: original.parentText,
        documentId: original.documentId,
        documentTitle: original.documentTitle,
        score: reranked.relevanceScore,
      };
    });

    return results;
  } catch (error) {
    console.error("Error searching vector database:", error);
    return [];
  }
}

/**
 * Hybrid search for admin use-cases.
 * Combines vector retrieval with a private graph context built from structured report data.
 */
export async function searchHybridDatabase(
  query: string,
  topK: number = 50,
  typeFilter: "medicine" | "disease" | "all" = "all",
  patientId: string = "",
): Promise<HybridSearchResult> {
  if (!query.trim()) {
    return {
      vectorResults: [],
      graphContext: EMPTY_HYBRID_GRAPH_CONTEXT,
    };
  }

  try {
    const [vectorResults, neo4jGraphContext] = await Promise.all([
      searchVectorDatabase(query, topK, typeFilter),
      searchGraphContextInNeo4j(query, patientId),
    ]);

    const graphContext =
      neo4jGraphContext ?? (await buildPrivateGraphContext(query));

    return {
      vectorResults,
      graphContext,
    };
  } catch (error) {
    console.error("Error performing hybrid search:", error);
    return {
      vectorResults: [],
      graphContext: EMPTY_HYBRID_GRAPH_CONTEXT,
    };
  }
}
