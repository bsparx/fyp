"use server";

import neo4j, { type Driver, type Session } from "neo4j-driver";
import OpenAI from "openai";
import prisma from "@/utils/db";

export interface GraphNodePayload {
  id: string;
  type: string;
  label: string;
  properties: Record<string, string | null>;
}

export interface GraphEdgePayload {
  source: string;
  target: string;
  type: string;
}

export interface GraphEvidencePayload {
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

export interface GraphContextPayload {
  queryTerms: string[];
  nodes: GraphNodePayload[];
  edges: GraphEdgePayload[];
  evidence: GraphEvidencePayload[];
  stats: {
    patients: number;
    reports: number;
    observations: number;
    metrics: number;
    totalNodes: number;
    totalEdges: number;
  };
}

export interface DocumentGraphNodeSample {
  id: string;
  type: string;
  label: string;
}

export interface DocumentGraphEdgeSample {
  source: string;
  target: string;
  type: string;
}

export interface DocumentKnowledgeGraphPayload {
  enabled: boolean;
  documentPresent: boolean;
  summary: {
    parentChunks: number;
    childChunks: number;
    reports: number;
    observations: number;
    metrics: number;
    totalNodes: number;
    totalEdges: number;
  };
  sampleNodes: DocumentGraphNodeSample[];
  sampleEdges: DocumentGraphEdgeSample[];
  message: string | null;
}

export interface FullGraphNodePayload {
  id: string;
  type: string;
  label: string;
  properties: Record<string, string | null>;
}

export interface FullGraphEdgePayload {
  source: string;
  target: string;
  type: string;
}

export interface FullGraphPayload {
  enabled: boolean;
  graphPresent: boolean;
  scope: "document" | "domain";
  key: string;
  nodeTypeCounts: Array<{
    type: string;
    count: number;
  }>;
  nodes: FullGraphNodePayload[];
  edges: FullGraphEdgePayload[];
  message: string | null;
}

const NEO4J_URI = process.env.NEO4J_URI;
const NEO4J_USER = process.env.NEO4J_USER || process.env.NEO4J_USERNAME;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;
const NEO4J_DATABASE = process.env.NEO4J_DATABASE || "neo4j";
const KG_EXTRACTOR_BASE_URL =
  process.env.KG_EXTRACTOR_BASE_URL ??
  "https://bsparx128--example-qwen3-6-35b-a3b-awq-inference-vllmser-088df8.modal.run/v1";
const KG_EXTRACTOR_MODEL =
  process.env.KG_EXTRACTOR_MODEL ?? "cyankiwi/Qwen3.6-35B-A3B-AWQ-4bit";
const KG_EXTRACTOR_API_KEY =
  process.env.KG_EXTRACTOR_API_KEY ??
  process.env.OPENAI_API_KEY ??
  "placeholder-key";

const KG_SOURCE_TEXT_MAX_CHARS = 12_000;
const KG_FALLBACK_SOURCE_TEXT_MAX_CHARS = 7_000;

const kgExtractorClient = new OpenAI({
  baseURL: KG_EXTRACTOR_BASE_URL,
  apiKey: KG_EXTRACTOR_API_KEY,
  maxRetries: 1,
  timeout: 180_000,
});

let graphDriver: Driver | null = null;
let warnedMissingConfig = false;
let constraintsReady = false;
let constraintsPromise: Promise<void> | null = null;

interface GraphEntityRow {
  key: string;
  name: string;
  type: string;
  canonicalName: string | null;
  description: string | null;
  evidence: string | null;
  confidence: number;
}

interface GraphRelationRow {
  sourceKey: string;
  targetKey: string;
  relationType: string;
  evidence: string | null;
  confidence: number;
}

function hasGraphConfig(): boolean {
  return Boolean(NEO4J_URI && NEO4J_USER && NEO4J_PASSWORD);
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

function clampConfidence(value: unknown, fallback: number = 0.7): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  if (parsed < 0) return 0;
  if (parsed > 1) return 1;
  return parsed;
}

function normalizeGraphType(value: string, fallback: string): string {
  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  return normalized || fallback;
}

function toEntityKey(type: string, name: string): string {
  return `${normalizeGraphType(type, "CONCEPT")}:${toMetricSlug(name)}`;
}

function extractMarkdownFromDocumentContent(content: string): string {
  if (!content) {
    return "";
  }

  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const extractedText = parsed.extractedText;
    if (typeof extractedText === "string" && extractedText.trim().length > 0) {
      return extractedText;
    }
  } catch {
    // Content may already be plain OCR markdown/text.
  }

  return content;
}

function parseJsonObject(text: string): unknown {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : text.trim();

  try {
    return JSON.parse(candidate);
  } catch {
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error("No JSON object found in model response.");
    }

    return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
  }
}

function normalizeExtractedGraph(payload: unknown): {
  entities: GraphEntityRow[];
  relations: GraphRelationRow[];
} {
  const raw = payload as Record<string, unknown>;
  const entitiesInput = Array.isArray(raw?.entities)
    ? (raw.entities as Array<Record<string, unknown>>)
    : [];
  const relationsInput = Array.isArray(raw?.relations)
    ? (raw.relations as Array<Record<string, unknown>>)
    : [];

  const entityRows = new Map<string, GraphEntityRow>();
  const aliasToKey = new Map<string, string>();

  for (const entity of entitiesInput) {
    const idRaw = toNullableString(entity.id);
    const nameRaw =
      toNullableString(entity.name) ??
      toNullableString(entity.canonicalName) ??
      idRaw;
    if (!nameRaw) {
      continue;
    }

    const type = normalizeGraphType(
      toNullableString(entity.type) ?? "CONCEPT",
      "CONCEPT",
    );
    const key = toEntityKey(type, nameRaw);
    const row: GraphEntityRow = {
      key,
      name: nameRaw,
      type,
      canonicalName: toNullableString(entity.canonicalName),
      description: toNullableString(entity.description),
      evidence: toNullableString(entity.evidence),
      confidence: clampConfidence(entity.confidence, 0.7),
    };

    if (!entityRows.has(key)) {
      entityRows.set(key, row);
    }

    const aliases = [idRaw, nameRaw, row.canonicalName]
      .map((value) => (value ? toMetricSlug(value) : null))
      .filter((value): value is string => Boolean(value));

    for (const alias of aliases) {
      aliasToKey.set(alias, key);
    }
  }

  const relationRows = new Map<string, GraphRelationRow>();
  for (const relation of relationsInput) {
    const sourceAlias = toNullableString(relation.sourceId);
    const targetAlias = toNullableString(relation.targetId);
    if (!sourceAlias || !targetAlias) {
      continue;
    }

    const sourceKey = aliasToKey.get(toMetricSlug(sourceAlias));
    const targetKey = aliasToKey.get(toMetricSlug(targetAlias));
    if (!sourceKey || !targetKey || sourceKey === targetKey) {
      continue;
    }

    const relationType = normalizeGraphType(
      toNullableString(relation.type) ?? "RELATED_TO",
      "RELATED_TO",
    );

    const row: GraphRelationRow = {
      sourceKey,
      targetKey,
      relationType,
      evidence: toNullableString(relation.evidence),
      confidence: clampConfidence(relation.confidence, 0.7),
    };

    const rowKey = `${row.sourceKey}|${row.relationType}|${row.targetKey}`;
    if (!relationRows.has(rowKey)) {
      relationRows.set(rowKey, row);
    }
  }

  return {
    entities: Array.from(entityRows.values()).slice(0, 120),
    relations: Array.from(relationRows.values()).slice(0, 240),
  };
}

async function extractGraphFromTextWithLlm(args: {
  documentId: string;
  documentTitle: string;
  domain: string | null;
  sourceText: string;
}): Promise<{ entities: GraphEntityRow[]; relations: GraphRelationRow[] }> {
  const textSnippet = args.sourceText.slice(0, KG_SOURCE_TEXT_MAX_CHARS);

  if (!textSnippet.trim()) {
    return { entities: [], relations: [] };
  }

  const extractionPrompt = `Extract a clinically meaningful knowledge graph from this medical context.
Return ONLY JSON with this shape:
{
  "entities": [
    {
      "id": "short-id",
      "name": "entity name",
      "type": "DISEASE|DRUG|SYMPTOM|TEST|BIOMARKER|PROCEDURE|ANATOMY|RISK_FACTOR|DIAGNOSIS|TREATMENT|CONCEPT",
      "canonicalName": "optional canonical text or null",
      "description": "optional short description or null",
      "evidence": "short evidence snippet from source or null",
      "confidence": 0.0
    }
  ],
  "relations": [
    {
      "sourceId": "entity id",
      "targetId": "entity id",
      "type": "TREATS|CAUSES|INDICATES|ASSOCIATED_WITH|CONTRAINDICATED_WITH|MEASURES|AFFECTS|PART_OF|RISK_FOR|INTERACTS_WITH|RELATED_TO",
      "evidence": "short evidence snippet or null",
      "confidence": 0.0
    }
  ]
}

Rules:
- Focus on graph-RAG useful semantics only.
- Do not create parent/child chunk entities.
- Do not output storage ids (chunk ids, document ids, vector ids) as entities.
- Keep entities deduplicated and clinically meaningful.
- Keep output compact for speed: at most 40 entities and 80 relations.
- Use confidence in [0,1].`;

  const userPayload = {
    documentId: args.documentId,
    title: args.documentTitle,
    domain: args.domain,
    sourceText: textSnippet,
  };

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      entities: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            type: { type: "string" },
            canonicalName: { type: ["string", "null"] },
            description: { type: ["string", "null"] },
            evidence: { type: ["string", "null"] },
            confidence: { type: "number" },
          },
          required: [
            "id",
            "name",
            "type",
            "canonicalName",
            "description",
            "evidence",
            "confidence",
          ],
        },
      },
      relations: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            sourceId: { type: "string" },
            targetId: { type: "string" },
            type: { type: "string" },
            evidence: { type: ["string", "null"] },
            confidence: { type: "number" },
          },
          required: ["sourceId", "targetId", "type", "evidence", "confidence"],
        },
      },
    },
    required: ["entities", "relations"],
  };

  const responseFormat = {
    type: "json_schema" as const,
    json_schema: {
      name: "clinical_graph_extraction",
      strict: true,
      schema,
    },
  };

  try {
    const completion = await kgExtractorClient.chat.completions.create({
      model: KG_EXTRACTOR_MODEL,
      temperature: 0,
      messages: [
        { role: "system", content: extractionPrompt },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
      response_format: responseFormat,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return { entities: [], relations: [] };
    }

    return normalizeExtractedGraph(parseJsonObject(content));
  } catch (error) {
    console.error(
      "Primary KG extraction failed, trying fallback parse:",
      error,
    );

    const fallbackPayload = {
      ...userPayload,
      sourceText: textSnippet.slice(0, KG_FALLBACK_SOURCE_TEXT_MAX_CHARS),
    };

    try {
      const fallback = await kgExtractorClient.chat.completions.create({
        model: KG_EXTRACTOR_MODEL,
        temperature: 0,
        messages: [
          {
            role: "system",
            content: `${extractionPrompt}\nReturn strict JSON only.`,
          },
          { role: "user", content: JSON.stringify(fallbackPayload) },
        ],
        response_format: responseFormat,
      });

      const fallbackContent = fallback.choices[0]?.message?.content;
      if (!fallbackContent) {
        return { entities: [], relations: [] };
      }

      return normalizeExtractedGraph(parseJsonObject(fallbackContent));
    } catch (fallbackError) {
      console.error("Fallback KG extraction failed:", fallbackError);
      return { entities: [], relations: [] };
    }
  }
}

function getDriver(): Driver | null {
  if (!hasGraphConfig()) {
    if (!warnedMissingConfig) {
      console.warn(
        "Neo4j env vars are missing (NEO4J_URI/(NEO4J_USER or NEO4J_USERNAME)/NEO4J_PASSWORD). Graph sync is disabled.",
      );
      warnedMissingConfig = true;
    }
    return null;
  }

  if (!graphDriver) {
    graphDriver = neo4j.driver(
      NEO4J_URI as string,
      neo4j.auth.basic(NEO4J_USER as string, NEO4J_PASSWORD as string),
    );
  }

  return graphDriver;
}

function getSession(mode: "READ" | "WRITE"): Session | null {
  const driver = getDriver();
  if (!driver) {
    return null;
  }

  return driver.session({
    database: NEO4J_DATABASE,
    defaultAccessMode:
      mode === "READ" ? neo4j.session.READ : neo4j.session.WRITE,
  });
}

async function ensureConstraints(): Promise<void> {
  if (constraintsReady) {
    return;
  }

  if (constraintsPromise) {
    await constraintsPromise;
    return;
  }

  constraintsPromise = (async () => {
    const session = getSession("WRITE");
    if (!session) {
      return;
    }

    try {
      await session.executeWrite(async (tx) => {
        await tx.run(
          "CREATE CONSTRAINT document_id IF NOT EXISTS FOR (d:Document) REQUIRE d.id IS UNIQUE",
        );
        await tx.run(
          "CREATE CONSTRAINT patient_id IF NOT EXISTS FOR (p:Patient) REQUIRE p.id IS UNIQUE",
        );
        await tx.run(
          "CREATE CONSTRAINT parent_chunk_id IF NOT EXISTS FOR (pc:ParentChunk) REQUIRE pc.id IS UNIQUE",
        );
        await tx.run(
          "CREATE CONSTRAINT child_chunk_id IF NOT EXISTS FOR (cc:ChildChunk) REQUIRE cc.id IS UNIQUE",
        );
        await tx.run(
          "CREATE CONSTRAINT report_id IF NOT EXISTS FOR (r:MedicalReport) REQUIRE r.id IS UNIQUE",
        );
        await tx.run(
          "CREATE CONSTRAINT observation_id IF NOT EXISTS FOR (o:Observation) REQUIRE o.id IS UNIQUE",
        );
        await tx.run(
          "CREATE CONSTRAINT metric_slug IF NOT EXISTS FOR (m:Metric) REQUIRE m.slug IS UNIQUE",
        );
        await tx.run(
          "CREATE CONSTRAINT clinical_entity_key IF NOT EXISTS FOR (e:ClinicalEntity) REQUIRE e.key IS UNIQUE",
        );
      });

      constraintsReady = true;
    } finally {
      await session.close();
    }
  })();

  await constraintsPromise;
}

export async function syncDocumentGraphFromSql(
  documentId: string,
): Promise<boolean> {
  const session = getSession("WRITE");
  if (!session) {
    return false;
  }

  try {
    await ensureConstraints();

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        medicalReports: {
          orderBy: { createdAt: "desc" },
          include: {
            reportValues: {
              orderBy: [{ observedAt: "desc" }, { createdAt: "desc" }],
            },
          },
        },
      },
    });

    if (!document) {
      return false;
    }

    const reportMarkdownBlocks = document.medicalReports
      .map((report) => report.markdown?.trim() ?? "")
      .filter((text) => text.length > 0);

    const documentMarkdown = extractMarkdownFromDocumentContent(
      document.content,
    ).trim();

    const sourceText = [...reportMarkdownBlocks, documentMarkdown]
      .filter((text) => text.trim().length > 0)
      .join("\n\n---\n\n");

    const extractedGraph = await extractGraphFromTextWithLlm({
      documentId: document.id,
      documentTitle: document.title,
      domain: document.ragSubtype?.toLowerCase() ?? null,
      sourceText,
    });

    const reports = document.medicalReports.map((report) => ({
      id: report.id,
      patientId: report.userId,
      patientName: document.user?.name ?? null,
      patientEmail: document.user?.email ?? null,
      hospitalName: report.hospitalName,
      reportDate: toIso(report.reportDate),
      createdAt: toIso(report.createdAt),
      updatedAt: toIso(report.updatedAt),
    }));

    const observations = document.medicalReports.flatMap((report) =>
      report.reportValues.map((value) => ({
        id: value.id,
        reportId: report.id,
        key: value.key,
        keyNormalized: value.keyNormalized,
        value: value.value,
        unit: value.unit,
        valueNumeric:
          value.valueNumeric === null || value.valueNumeric === undefined
            ? null
            : String(value.valueNumeric),
        observedAt: toIso(value.observedAt),
        createdAt: toIso(value.createdAt),
        metricSlug: toMetricSlug(value.keyNormalized ?? value.key),
        metricDisplayName: value.keyNormalized ?? value.key,
      })),
    );

    const syncTimestamp = new Date().toISOString();

    await session.executeWrite(async (tx) => {
      await tx.run(
        `
        MERGE (d:Document {id: $documentId})
        SET d.title = $title,
            d.type = $type,
            d.ragSubtype = $ragSubtype,
            d.patientDataType = $patientDataType,
            d.userId = $userId,
            d.isIngested = $isIngested,
            d.createdAt = $createdAt,
            d.updatedAt = $updatedAt
        WITH d
        FOREACH (_ IN CASE WHEN $domainName IS NULL THEN [] ELSE [1] END |
          MERGE (domain:KnowledgeDomain {name: $domainName})
          MERGE (d)-[:IN_DOMAIN]->(domain)
        )
        FOREACH (_ IN CASE WHEN $patientId IS NULL THEN [] ELSE [1] END |
          MERGE (p:Patient {id: $patientId})
          SET p.name = coalesce($patientName, p.name),
              p.email = coalesce($patientEmail, p.email)
          MERGE (p)-[:OWNS_DOCUMENT]->(d)
        )
        `,
        {
          documentId: document.id,
          title: document.title,
          type: document.type,
          ragSubtype: document.ragSubtype,
          patientDataType: document.patientDataType,
          userId: document.userId,
          isIngested: document.isIngested,
          createdAt: toIso(document.createdAt),
          updatedAt: toIso(document.updatedAt),
          domainName: document.ragSubtype?.toLowerCase() ?? null,
          patientId: document.user?.id ?? null,
          patientName: document.user?.name ?? null,
          patientEmail: document.user?.email ?? null,
        },
      );

      await tx.run(
        `
        MATCH (d:Document {id: $documentId})
        OPTIONAL MATCH (d)-[:HAS_PARENT_CHUNK]->(oldParent:ParentChunk)
        OPTIONAL MATCH (oldParent)-[:HAS_CHILD_CHUNK]->(oldChild:ChildChunk)
        DETACH DELETE oldChild, oldParent
        `,
        { documentId: document.id },
      );

      await tx.run(
        `
        MATCH (d:Document {id: $documentId})
        OPTIONAL MATCH (d)-[:HAS_REPORT]->(oldReport:MedicalReport)
        OPTIONAL MATCH (oldReport)-[:HAS_OBSERVATION]->(oldObs:Observation)
        DETACH DELETE oldObs, oldReport
        `,
        { documentId: document.id },
      );

      await tx.run(
        `
        MATCH (d:Document {id: $documentId})-[oldMention:MENTIONS]->(:ClinicalEntity)
        DELETE oldMention
        `,
        { documentId: document.id },
      );

      if (reports.length > 0) {
        await tx.run(
          `
          UNWIND $reports AS report
          MATCH (d:Document {id: $documentId})
          MERGE (r:MedicalReport {id: report.id})
          SET r.hospitalName = report.hospitalName,
              r.reportDate = report.reportDate,
              r.createdAt = report.createdAt,
              r.updatedAt = report.updatedAt
          MERGE (d)-[:HAS_REPORT]->(r)
          FOREACH (_ IN CASE WHEN report.patientId IS NULL THEN [] ELSE [1] END |
            MERGE (p:Patient {id: report.patientId})
            SET p.name = coalesce(report.patientName, p.name),
                p.email = coalesce(report.patientEmail, p.email)
            MERGE (p)-[:HAS_REPORT]->(r)
          )
          `,
          {
            documentId: document.id,
            reports,
          },
        );
      }

      if (observations.length > 0) {
        await tx.run(
          `
          UNWIND $observations AS obs
          MATCH (r:MedicalReport {id: obs.reportId})
          MERGE (o:Observation {id: obs.id})
          SET o.key = obs.key,
              o.keyNormalized = obs.keyNormalized,
              o.value = obs.value,
              o.unit = obs.unit,
              o.valueNumeric = obs.valueNumeric,
              o.observedAt = obs.observedAt,
              o.createdAt = obs.createdAt
          MERGE (r)-[:HAS_OBSERVATION]->(o)
          MERGE (m:Metric {slug: obs.metricSlug})
          SET m.displayName = obs.metricDisplayName,
              m.keyNormalized = obs.keyNormalized,
              m.key = obs.key
          MERGE (o)-[:OF_METRIC]->(m)
          `,
          {
            observations,
          },
        );
      }

      if (extractedGraph.entities.length > 0) {
        await tx.run(
          `
          UNWIND $entities AS entity
          MATCH (d:Document {id: $documentId})
          MERGE (e:ClinicalEntity {key: entity.key})
          ON CREATE SET e.createdAt = $syncTimestamp
          SET e.name = entity.name,
              e.type = entity.type,
              e.canonicalName = entity.canonicalName,
              e.description = entity.description,
              e.updatedAt = $syncTimestamp
          MERGE (d)-[mention:MENTIONS]->(e)
          SET mention.evidence = entity.evidence,
              mention.confidence = entity.confidence,
              mention.updatedAt = $syncTimestamp
          `,
          {
            documentId: document.id,
            entities: extractedGraph.entities,
            syncTimestamp,
          },
        );
      }

      if (extractedGraph.relations.length > 0) {
        await tx.run(
          `
          UNWIND $relations AS relRow
          MATCH (source:ClinicalEntity {key: relRow.sourceKey})
          MATCH (target:ClinicalEntity {key: relRow.targetKey})
          MERGE (source)-[rel:RELATES_TO {relationType: relRow.relationType}]->(target)
          ON CREATE SET rel.createdAt = $syncTimestamp
          SET rel.evidence = relRow.evidence,
              rel.confidence = relRow.confidence,
              rel.updatedAt = $syncTimestamp
          `,
          {
            relations: extractedGraph.relations,
            syncTimestamp,
          },
        );
      }

      await tx.run(
        `
        MATCH (m:Metric)
        WHERE NOT (m)<-[:OF_METRIC]-()
        DETACH DELETE m
        `,
      );

      await tx.run(
        `
        MATCH (e:ClinicalEntity)
        WHERE COUNT { (e)<-[:MENTIONS]-(:Document) } = 0
        DETACH DELETE e
        `,
      );

      await tx.run(
        `
        MATCH (p:Patient)
        WHERE COUNT { (p)--() } = 0
        DETACH DELETE p
        `,
      );

      await tx.run(
        `
        MATCH (domain:KnowledgeDomain)
        WHERE COUNT { (domain)--() } = 0
        DETACH DELETE domain
        `,
      );
    });

    return true;
  } catch (error) {
    console.error(`Failed to sync graph for document ${documentId}:`, error);
    return false;
  } finally {
    await session.close();
  }
}

export async function deleteDocumentGraph(
  documentId: string,
): Promise<boolean> {
  const session = getSession("WRITE");
  if (!session) {
    return false;
  }

  try {
    await ensureConstraints();

    await session.executeWrite(async (tx) => {
      await tx.run(
        `
        MATCH (d:Document {id: $documentId})
        OPTIONAL MATCH (d)-[:HAS_PARENT_CHUNK]->(pc:ParentChunk)
        OPTIONAL MATCH (pc)-[:HAS_CHILD_CHUNK]->(cc:ChildChunk)
        DETACH DELETE cc, pc
        `,
        { documentId },
      );

      await tx.run(
        `
        MATCH (d:Document {id: $documentId})
        OPTIONAL MATCH (d)-[:HAS_REPORT]->(r:MedicalReport)
        OPTIONAL MATCH (r)-[:HAS_OBSERVATION]->(o:Observation)
        DETACH DELETE o, r
        `,
        { documentId },
      );

      await tx.run(
        `
        MATCH (d:Document {id: $documentId})
        DETACH DELETE d
        `,
        { documentId },
      );

      await tx.run(
        `
        MATCH (m:Metric)
        WHERE NOT (m)<-[:OF_METRIC]-()
        DETACH DELETE m
        `,
      );

      await tx.run(
        `
        MATCH (p:Patient)
        WHERE COUNT { (p)--() } = 0
        DETACH DELETE p
        `,
      );

      await tx.run(
        `
        MATCH (domain:KnowledgeDomain)
        WHERE COUNT { (domain)--() } = 0
        DETACH DELETE domain
        `,
      );
    });

    return true;
  } catch (error) {
    console.error(`Failed to delete graph for document ${documentId}:`, error);
    return false;
  } finally {
    await session.close();
  }
}

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
  ).slice(0, 8);
}

interface Neo4jNodeLike {
  labels?: string[];
  elementId?: string;
  properties: Record<string, unknown>;
}

function isNeo4jNode(value: unknown): value is Neo4jNodeLike {
  return Boolean(value && typeof value === "object" && "properties" in value);
}

function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toNumber" in value &&
    typeof (value as { toNumber: unknown }).toNumber === "function"
  ) {
    return String((value as { toNumber: () => number }).toNumber());
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    const result = value.toString();
    return result === "" ? null : result;
  }

  return null;
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toNumber" in value &&
    typeof (value as { toNumber: unknown }).toNumber === "function"
  ) {
    return (value as { toNumber: () => number }).toNumber();
  }

  const parsed = Number(toNullableString(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toNodeArray(value: unknown): Neo4jNodeLike[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isNeo4jNode);
}

function toEdgeArray(value: unknown): DocumentGraphEdgeSample[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const edges: DocumentGraphEdgeSample[] = [];
  for (const edgeLike of value) {
    if (!edgeLike || typeof edgeLike !== "object") {
      continue;
    }

    const source = toNullableString(
      (edgeLike as Record<string, unknown>).source,
    );
    const target = toNullableString(
      (edgeLike as Record<string, unknown>).target,
    );
    const type = toNullableString((edgeLike as Record<string, unknown>).type);

    if (!source || !target || !type) {
      continue;
    }

    if (source.endsWith("null") || target.endsWith("null")) {
      continue;
    }

    edges.push({ source, target, type });
  }

  return edges;
}

function getNodeProp(node: Neo4jNodeLike, key: string): string | null {
  return toNullableString(node.properties[key]);
}

function getNodeType(node: Neo4jNodeLike): string {
  if (
    Array.isArray(node.labels) &&
    node.labels.length > 0 &&
    typeof node.labels[0] === "string"
  ) {
    return node.labels[0];
  }

  return "Node";
}

function getNodeIdentity(node: Neo4jNodeLike): string {
  return (
    getNodeProp(node, "key") ??
    getNodeProp(node, "id") ??
    getNodeProp(node, "slug") ??
    getNodeProp(node, "name") ??
    toNullableString(node.elementId) ??
    "unknown"
  );
}

function getNodeLabel(
  node: Neo4jNodeLike,
  type: string,
  identity: string,
): string {
  if (type === "ParentChunk") {
    return `Parent Chunk #${getNodeProp(node, "parentIndex") ?? identity}`;
  }

  if (type === "ChildChunk") {
    return `Child Chunk #${getNodeProp(node, "chunkIndex") ?? identity}`;
  }

  if (type === "Observation") {
    const key = getNodeProp(node, "key") ?? getNodeProp(node, "keyNormalized");
    const value = getNodeProp(node, "value");
    const unit = getNodeProp(node, "unit");
    if (key && value) {
      return `${key}: ${value}${unit ? ` ${unit}` : ""}`;
    }
  }

  return (
    getNodeProp(node, "title") ??
    getNodeProp(node, "hospitalName") ??
    getNodeProp(node, "displayName") ??
    getNodeProp(node, "key") ??
    getNodeProp(node, "name") ??
    getNodeProp(node, "id") ??
    getNodeProp(node, "slug") ??
    `${type} ${identity}`
  );
}

function toNodeProperties(node: Neo4jNodeLike): Record<string, string | null> {
  const output: Record<string, string | null> = {};

  for (const [key, value] of Object.entries(node.properties)) {
    if (Array.isArray(value)) {
      const listValues = value
        .map((entry) => toNullableString(entry))
        .filter((entry): entry is string => Boolean(entry));
      output[key] = listValues.join(", ");
      continue;
    }

    output[key] = toNullableString(value);
  }

  return output;
}

function emptyFullGraph(
  scope: "document" | "domain",
  key: string,
  enabled: boolean,
  message: string | null,
): FullGraphPayload {
  return {
    enabled,
    graphPresent: false,
    scope,
    key,
    nodeTypeCounts: [],
    nodes: [],
    edges: [],
    message,
  };
}

function buildFullGraphPayload(args: {
  scope: "document" | "domain";
  key: string;
  nodesRaw: unknown;
  edgesRaw: unknown;
}): FullGraphPayload {
  const excludedNodeTypes = new Set(["ParentChunk", "ChildChunk"]);
  const nodeMap = new Map<string, FullGraphNodePayload>();
  for (const node of toNodeArray(args.nodesRaw)) {
    const type = getNodeType(node);
    if (excludedNodeTypes.has(type)) {
      continue;
    }

    const identity = getNodeIdentity(node);
    const nodeId = `${type}:${identity}`;

    nodeMap.set(nodeId, {
      id: nodeId,
      type,
      label: getNodeLabel(node, type, identity),
      properties: toNodeProperties(node),
    });
  }

  const nodeIds = new Set(nodeMap.keys());
  const edgeMap = new Map<string, FullGraphEdgePayload>();
  for (const edge of toEdgeArray(args.edgesRaw)) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      continue;
    }

    const edgeKey = `${edge.source}|${edge.type}|${edge.target}`;
    edgeMap.set(edgeKey, {
      source: edge.source,
      target: edge.target,
      type: edge.type,
    });
  }

  const nodes = Array.from(nodeMap.values());
  const edges = Array.from(edgeMap.values());

  const typeCountMap = new Map<string, number>();
  for (const node of nodes) {
    typeCountMap.set(node.type, (typeCountMap.get(node.type) ?? 0) + 1);
  }

  const nodeTypeCounts = Array.from(typeCountMap.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  return {
    enabled: true,
    graphPresent: nodes.length > 0,
    scope: args.scope,
    key: args.key,
    nodeTypeCounts,
    nodes,
    edges,
    message:
      nodes.length > 0 ? null : "No graph data available for this scope.",
  };
}

function emptyDocumentKnowledgeGraph(
  enabled: boolean,
  message: string | null,
): DocumentKnowledgeGraphPayload {
  return {
    enabled,
    documentPresent: false,
    summary: {
      parentChunks: 0,
      childChunks: 0,
      reports: 0,
      observations: 0,
      metrics: 0,
      totalNodes: 0,
      totalEdges: 0,
    },
    sampleNodes: [],
    sampleEdges: [],
    message,
  };
}

export async function getDocumentKnowledgeGraphFromNeo4j(
  documentId: string,
): Promise<DocumentKnowledgeGraphPayload> {
  const session = getSession("READ");
  if (!session) {
    return emptyDocumentKnowledgeGraph(
      false,
      "Neo4j is not configured for this environment.",
    );
  }

  try {
    await ensureConstraints();

    const summaryResult = await session.executeRead(async (tx) =>
      tx.run(
        `
        OPTIONAL MATCH (d:Document {id: $documentId})
        OPTIONAL MATCH (d)-[:HAS_PARENT_CHUNK]->(pc:ParentChunk)
        OPTIONAL MATCH (pc)-[:HAS_CHILD_CHUNK]->(cc:ChildChunk)
        OPTIONAL MATCH (d)-[:HAS_REPORT]->(r:MedicalReport)
        OPTIONAL MATCH (r)-[:HAS_OBSERVATION]->(o:Observation)
        OPTIONAL MATCH (o)-[:OF_METRIC]->(m:Metric)
        RETURN d IS NOT NULL AS found,
               count(DISTINCT pc) AS parentChunks,
               count(DISTINCT cc) AS childChunks,
               count(DISTINCT r) AS reports,
               count(DISTINCT o) AS observations,
               count(DISTINCT m) AS metrics
        `,
        { documentId },
      ),
    );

    const summaryRecord = summaryResult.records[0];
    if (!summaryRecord) {
      return emptyDocumentKnowledgeGraph(
        true,
        "No graph row returned for this document.",
      );
    }

    const documentPresent = Boolean(summaryRecord.get("found"));
    if (!documentPresent) {
      return emptyDocumentKnowledgeGraph(
        true,
        "This document has no graph data yet. Upload/re-ingest to sync graph.",
      );
    }

    const parentChunks = toNumber(summaryRecord.get("parentChunks"));
    const childChunks = toNumber(summaryRecord.get("childChunks"));
    const reports = toNumber(summaryRecord.get("reports"));
    const observations = toNumber(summaryRecord.get("observations"));
    const metrics = toNumber(summaryRecord.get("metrics"));

    const sampleResult = await session.executeRead(async (tx) =>
      tx.run(
        `
        MATCH (d:Document {id: $documentId})
        OPTIONAL MATCH (d)-[:HAS_PARENT_CHUNK]->(pc:ParentChunk)
        OPTIONAL MATCH (d)-[:HAS_PARENT_CHUNK]->(pc2:ParentChunk)-[:HAS_CHILD_CHUNK]->(cc:ChildChunk)
        OPTIONAL MATCH (d)-[:HAS_REPORT]->(r:MedicalReport)
        OPTIONAL MATCH (d)-[:HAS_REPORT]->(r2:MedicalReport)-[:HAS_OBSERVATION]->(o:Observation)
        OPTIONAL MATCH (d)-[:HAS_REPORT]->(:MedicalReport)-[:HAS_OBSERVATION]->(o2:Observation)-[:OF_METRIC]->(m:Metric)
        RETURN d,
               collect(DISTINCT pc)[0..3] AS parentChunkNodes,
               collect(DISTINCT cc)[0..5] AS childChunkNodes,
               collect(DISTINCT r)[0..3] AS reportNodes,
               collect(DISTINCT o)[0..5] AS observationNodes,
               collect(DISTINCT m)[0..5] AS metricNodes,
               collect(DISTINCT {source: 'document:' + d.id, target: 'parent:' + pc.id, type: 'HAS_PARENT_CHUNK'}) +
               collect(DISTINCT {source: 'parent:' + pc2.id, target: 'child:' + cc.id, type: 'HAS_CHILD_CHUNK'}) +
               collect(DISTINCT {source: 'document:' + d.id, target: 'report:' + r.id, type: 'HAS_REPORT'}) +
               collect(DISTINCT {source: 'report:' + r2.id, target: 'observation:' + o.id, type: 'HAS_OBSERVATION'}) +
               collect(DISTINCT {source: 'observation:' + o2.id, target: 'metric:' + m.slug, type: 'OF_METRIC'})
               AS sampleEdges
        `,
        { documentId },
      ),
    );

    const sampleRecord = sampleResult.records[0];
    const sampleNodes: DocumentGraphNodeSample[] = [];

    if (sampleRecord && isNeo4jNode(sampleRecord.get("d"))) {
      const documentNode = sampleRecord.get("d") as Neo4jNodeLike;
      sampleNodes.push({
        id: `document:${getNodeProp(documentNode, "id") ?? documentId}`,
        type: "Document",
        label:
          getNodeProp(documentNode, "title") ??
          `Document ${getNodeProp(documentNode, "id") ?? documentId}`,
      });

      for (const node of toNodeArray(sampleRecord.get("parentChunkNodes"))) {
        sampleNodes.push({
          id: `parent:${getNodeProp(node, "id") ?? "unknown"}`,
          type: "ParentChunk",
          label: `Parent Chunk #${getNodeProp(node, "parentIndex") ?? "?"}`,
        });
      }

      for (const node of toNodeArray(sampleRecord.get("childChunkNodes"))) {
        sampleNodes.push({
          id: `child:${getNodeProp(node, "id") ?? "unknown"}`,
          type: "ChildChunk",
          label: `Child Chunk #${getNodeProp(node, "chunkIndex") ?? "?"}`,
        });
      }

      for (const node of toNodeArray(sampleRecord.get("reportNodes"))) {
        sampleNodes.push({
          id: `report:${getNodeProp(node, "id") ?? "unknown"}`,
          type: "MedicalReport",
          label:
            getNodeProp(node, "hospitalName") ??
            `Report ${getNodeProp(node, "id") ?? "unknown"}`,
        });
      }

      for (const node of toNodeArray(sampleRecord.get("observationNodes"))) {
        const key = getNodeProp(node, "key") ?? "Observation";
        const value = getNodeProp(node, "value") ?? "";
        sampleNodes.push({
          id: `observation:${getNodeProp(node, "id") ?? "unknown"}`,
          type: "Observation",
          label: `${key}: ${value}`,
        });
      }

      for (const node of toNodeArray(sampleRecord.get("metricNodes"))) {
        sampleNodes.push({
          id: `metric:${getNodeProp(node, "slug") ?? "unknown"}`,
          type: "Metric",
          label:
            getNodeProp(node, "displayName") ??
            getNodeProp(node, "key") ??
            getNodeProp(node, "slug") ??
            "Metric",
        });
      }
    }

    const dedupedNodes = Array.from(
      new Map(sampleNodes.map((node) => [node.id, node])).values(),
    );

    const sampleEdges = sampleRecord
      ? Array.from(
          new Map(
            toEdgeArray(sampleRecord.get("sampleEdges")).map((edge) => [
              `${edge.source}|${edge.type}|${edge.target}`,
              edge,
            ]),
          ).values(),
        )
      : [];

    const totalNodes =
      1 + parentChunks + childChunks + reports + observations + metrics;
    const totalEdges =
      parentChunks + childChunks + reports + observations + observations;

    return {
      enabled: true,
      documentPresent: true,
      summary: {
        parentChunks,
        childChunks,
        reports,
        observations,
        metrics,
        totalNodes,
        totalEdges,
      },
      sampleNodes: dedupedNodes.slice(0, 18),
      sampleEdges: sampleEdges.slice(0, 20),
      message: null,
    };
  } catch (error) {
    console.error(
      `Failed to read Neo4j graph details for document ${documentId}:`,
      error,
    );
    return emptyDocumentKnowledgeGraph(
      true,
      "Failed to load graph details for this document.",
    );
  } finally {
    await session.close();
  }
}

export async function getFullDocumentGraphFromNeo4j(
  documentId: string,
): Promise<FullGraphPayload> {
  const session = getSession("READ");
  if (!session) {
    return emptyFullGraph(
      "document",
      documentId,
      false,
      "Neo4j is not configured for this environment.",
    );
  }

  try {
    await ensureConstraints();

    const result = await session.executeRead(async (tx) =>
      tx.run(
        `
        MATCH (d:Document {id: $documentId})
        OPTIONAL MATCH (d)-[:IN_DOMAIN]->(domain:KnowledgeDomain)
        OPTIONAL MATCH (p:Patient)-[:OWNS_DOCUMENT]->(d)
        OPTIONAL MATCH (d)-[:HAS_REPORT]->(r:MedicalReport)
        OPTIONAL MATCH (r)-[:HAS_OBSERVATION]->(o:Observation)
        OPTIONAL MATCH (o)-[:OF_METRIC]->(m:Metric)
        OPTIONAL MATCH (d)-[:MENTIONS]->(e:ClinicalEntity)
        OPTIONAL MATCH (e)-[entityRel:RELATES_TO]->(e2:ClinicalEntity)
        WHERE e2 IS NULL OR EXISTS {
          MATCH (d)-[:MENTIONS]->(e2)
        }
        WITH [node IN (
          collect(DISTINCT d) +
          collect(DISTINCT domain) +
          collect(DISTINCT p) +
          collect(DISTINCT r) +
          collect(DISTINCT o) +
          collect(DISTINCT m) +
          collect(DISTINCT e) +
          collect(DISTINCT e2)
        ) WHERE node IS NOT NULL] AS nodes,
        [edge IN (
          collect(DISTINCT CASE WHEN domain IS NULL THEN null ELSE {
            source: 'Document:' + coalesce(toString(d.id), elementId(d)),
            target: 'KnowledgeDomain:' + coalesce(toString(domain.name), elementId(domain)),
            type: 'IN_DOMAIN'
          } END) +
          collect(DISTINCT CASE WHEN p IS NULL THEN null ELSE {
            source: 'Patient:' + coalesce(toString(p.id), elementId(p)),
            target: 'Document:' + coalesce(toString(d.id), elementId(d)),
            type: 'OWNS_DOCUMENT'
          } END) +
          collect(DISTINCT CASE WHEN r IS NULL THEN null ELSE {
            source: 'Document:' + coalesce(toString(d.id), elementId(d)),
            target: 'MedicalReport:' + coalesce(toString(r.id), elementId(r)),
            type: 'HAS_REPORT'
          } END) +
          collect(DISTINCT CASE WHEN o IS NULL THEN null ELSE {
            source: 'MedicalReport:' + coalesce(toString(r.id), elementId(r)),
            target: 'Observation:' + coalesce(toString(o.id), elementId(o)),
            type: 'HAS_OBSERVATION'
          } END) +
          collect(DISTINCT CASE WHEN m IS NULL THEN null ELSE {
            source: 'Observation:' + coalesce(toString(o.id), elementId(o)),
            target: 'Metric:' + coalesce(toString(m.slug), elementId(m)),
            type: 'OF_METRIC'
          } END) +
          collect(DISTINCT CASE WHEN e IS NULL THEN null ELSE {
            source: 'Document:' + coalesce(toString(d.id), elementId(d)),
            target: 'ClinicalEntity:' + coalesce(toString(e.key), elementId(e)),
            type: 'MENTIONS'
          } END) +
          collect(DISTINCT CASE WHEN entityRel IS NULL OR e2 IS NULL THEN null ELSE {
            source: 'ClinicalEntity:' + coalesce(toString(e.key), elementId(e)),
            target: 'ClinicalEntity:' + coalesce(toString(e2.key), elementId(e2)),
            type: 'RELATES_TO:' + coalesce(toString(entityRel.relationType), 'RELATED_TO')
          } END)
        ) WHERE edge IS NOT NULL] AS edges
        RETURN nodes,
               edges
        `,
        { documentId },
      ),
    );

    const record = result.records[0];
    if (!record) {
      return emptyFullGraph(
        "document",
        documentId,
        true,
        "This document does not exist in the graph yet.",
      );
    }

    return buildFullGraphPayload({
      scope: "document",
      key: documentId,
      nodesRaw: record.get("nodes"),
      edgesRaw: record.get("edges"),
    });
  } catch (error) {
    console.error(
      `Failed to read full graph for document ${documentId}:`,
      error,
    );
    return emptyFullGraph(
      "document",
      documentId,
      true,
      "Failed to load full graph for this document.",
    );
  } finally {
    await session.close();
  }
}

export async function getFullDomainGraphFromNeo4j(
  domainName: "medicine" | "disease",
): Promise<FullGraphPayload> {
  const session = getSession("READ");
  if (!session) {
    return emptyFullGraph(
      "domain",
      domainName,
      false,
      "Neo4j is not configured for this environment.",
    );
  }

  const normalizedDomain = domainName.toLowerCase() as "medicine" | "disease";

  try {
    await ensureConstraints();

    const result = await session.executeRead(async (tx) =>
      tx.run(
        `
        MATCH (domain:KnowledgeDomain {name: $domainName})
        OPTIONAL MATCH (domain)<-[:IN_DOMAIN]-(d:Document)
        OPTIONAL MATCH (p:Patient)-[:OWNS_DOCUMENT]->(d)
        OPTIONAL MATCH (d)-[:HAS_REPORT]->(r:MedicalReport)
        OPTIONAL MATCH (r)-[:HAS_OBSERVATION]->(o:Observation)
        OPTIONAL MATCH (o)-[:OF_METRIC]->(m:Metric)
        OPTIONAL MATCH (d)-[:MENTIONS]->(e:ClinicalEntity)
        OPTIONAL MATCH (e)-[entityRel:RELATES_TO]->(e2:ClinicalEntity)
        WHERE e2 IS NULL OR EXISTS {
          MATCH (domain)<-[:IN_DOMAIN]-(:Document)-[:MENTIONS]->(e2)
        }
        WITH [node IN (
          collect(DISTINCT domain) +
          collect(DISTINCT d) +
          collect(DISTINCT p) +
          collect(DISTINCT r) +
          collect(DISTINCT o) +
          collect(DISTINCT m) +
          collect(DISTINCT e) +
          collect(DISTINCT e2)
        ) WHERE node IS NOT NULL] AS nodes,
        [edge IN (
          collect(DISTINCT CASE WHEN d IS NULL THEN null ELSE {
            source: 'Document:' + coalesce(toString(d.id), elementId(d)),
            target: 'KnowledgeDomain:' + coalesce(toString(domain.name), elementId(domain)),
            type: 'IN_DOMAIN'
          } END) +
          collect(DISTINCT CASE WHEN p IS NULL THEN null ELSE {
            source: 'Patient:' + coalesce(toString(p.id), elementId(p)),
            target: 'Document:' + coalesce(toString(d.id), elementId(d)),
            type: 'OWNS_DOCUMENT'
          } END) +
          collect(DISTINCT CASE WHEN r IS NULL THEN null ELSE {
            source: 'Document:' + coalesce(toString(d.id), elementId(d)),
            target: 'MedicalReport:' + coalesce(toString(r.id), elementId(r)),
            type: 'HAS_REPORT'
          } END) +
          collect(DISTINCT CASE WHEN o IS NULL THEN null ELSE {
            source: 'MedicalReport:' + coalesce(toString(r.id), elementId(r)),
            target: 'Observation:' + coalesce(toString(o.id), elementId(o)),
            type: 'HAS_OBSERVATION'
          } END) +
          collect(DISTINCT CASE WHEN m IS NULL THEN null ELSE {
            source: 'Observation:' + coalesce(toString(o.id), elementId(o)),
            target: 'Metric:' + coalesce(toString(m.slug), elementId(m)),
            type: 'OF_METRIC'
          } END) +
          collect(DISTINCT CASE WHEN e IS NULL THEN null ELSE {
            source: 'Document:' + coalesce(toString(d.id), elementId(d)),
            target: 'ClinicalEntity:' + coalesce(toString(e.key), elementId(e)),
            type: 'MENTIONS'
          } END) +
          collect(DISTINCT CASE WHEN entityRel IS NULL OR e2 IS NULL THEN null ELSE {
            source: 'ClinicalEntity:' + coalesce(toString(e.key), elementId(e)),
            target: 'ClinicalEntity:' + coalesce(toString(e2.key), elementId(e2)),
            type: 'RELATES_TO:' + coalesce(toString(entityRel.relationType), 'RELATED_TO')
          } END)
        ) WHERE edge IS NOT NULL] AS edges
        RETURN nodes,
               edges
        `,
        { domainName: normalizedDomain },
      ),
    );

    const record = result.records[0];
    if (!record) {
      return emptyFullGraph(
        "domain",
        normalizedDomain,
        true,
        `No graph exists for the ${normalizedDomain} domain yet.`,
      );
    }

    return buildFullGraphPayload({
      scope: "domain",
      key: normalizedDomain,
      nodesRaw: record.get("nodes"),
      edgesRaw: record.get("edges"),
    });
  } catch (error) {
    console.error(
      `Failed to read full graph for domain ${normalizedDomain}:`,
      error,
    );
    return emptyFullGraph(
      "domain",
      normalizedDomain,
      true,
      `Failed to load full graph for ${normalizedDomain}.`,
    );
  } finally {
    await session.close();
  }
}

export async function searchGraphContextInNeo4j(
  query: string,
  maxRows: number = 60,
): Promise<GraphContextPayload | null> {
  const session = getSession("READ");
  if (!session) {
    return null;
  }

  try {
    const queryTerms = extractQueryTerms(query);

    const result = await session.executeRead(async (tx) =>
      tx.run(
        `
        MATCH (p:Patient)-[:HAS_REPORT]->(r:MedicalReport)-[:HAS_OBSERVATION]->(o:Observation)-[:OF_METRIC]->(m:Metric)
        OPTIONAL MATCH (d:Document)-[:HAS_REPORT]->(r)
        WITH p, r, o, m, d,
             CASE
               WHEN size($terms) = 0 THEN true
               ELSE any(term IN $terms WHERE
                 toLower(coalesce(p.name, "")) CONTAINS term OR
                 toLower(coalesce(p.email, "")) CONTAINS term OR
                 toLower(coalesce(d.title, "")) CONTAINS term OR
                 toLower(coalesce(r.hospitalName, "")) CONTAINS term OR
                 toLower(coalesce(o.key, "")) CONTAINS term OR
                 toLower(coalesce(o.keyNormalized, "")) CONTAINS term OR
                 toLower(coalesce(o.value, "")) CONTAINS term OR
                 toLower(coalesce(m.displayName, "")) CONTAINS term
               )
             END AS matched
        WHERE matched
        RETURN p, d, r, o, m
        ORDER BY coalesce(o.observedAt, o.createdAt, r.reportDate, d.updatedAt) DESC
        LIMIT $limit
        `,
        {
          terms: queryTerms,
          limit: Number(maxRows),
        },
      ),
    );

    const nodeMap = new Map<string, GraphNodePayload>();
    const edgeMap = new Map<string, GraphEdgePayload>();
    const evidenceMap = new Map<string, GraphEvidencePayload>();

    for (const record of result.records) {
      const patientValue = record.get("p");
      const reportValue = record.get("r");
      const observationValue = record.get("o");
      const metricValue = record.get("m");
      const documentValue = record.get("d");

      if (
        !isNeo4jNode(patientValue) ||
        !isNeo4jNode(reportValue) ||
        !isNeo4jNode(observationValue) ||
        !isNeo4jNode(metricValue)
      ) {
        continue;
      }

      const patientIdRaw = getNodeProp(patientValue, "id");
      const reportIdRaw = getNodeProp(reportValue, "id");
      const observationIdRaw = getNodeProp(observationValue, "id");
      const metricSlugRaw = getNodeProp(metricValue, "slug");

      if (
        !patientIdRaw ||
        !reportIdRaw ||
        !observationIdRaw ||
        !metricSlugRaw
      ) {
        continue;
      }

      const patientNodeId = `patient:${patientIdRaw}`;
      const reportNodeId = `report:${reportIdRaw}`;
      const observationNodeId = `observation:${observationIdRaw}`;
      const metricNodeId = `metric:${metricSlugRaw}`;

      if (!nodeMap.has(patientNodeId)) {
        const patientName = getNodeProp(patientValue, "name");
        const patientEmail = getNodeProp(patientValue, "email");
        nodeMap.set(patientNodeId, {
          id: patientNodeId,
          type: "Patient",
          label: patientName ?? patientEmail ?? patientIdRaw,
          properties: {
            patientId: patientIdRaw,
            name: patientName,
            email: patientEmail,
          },
        });
      }

      if (!nodeMap.has(reportNodeId)) {
        const hospitalName = getNodeProp(reportValue, "hospitalName");
        const reportDate = getNodeProp(reportValue, "reportDate");
        nodeMap.set(reportNodeId, {
          id: reportNodeId,
          type: "Report",
          label: hospitalName ?? `Report ${reportIdRaw}`,
          properties: {
            reportId: reportIdRaw,
            hospitalName,
            reportDate,
          },
        });
      }

      if (!nodeMap.has(observationNodeId)) {
        const key = getNodeProp(observationValue, "key") ?? "Unknown";
        const value = getNodeProp(observationValue, "value") ?? "";
        const unit = getNodeProp(observationValue, "unit");
        nodeMap.set(observationNodeId, {
          id: observationNodeId,
          type: "Observation",
          label: `${key}: ${value}${unit ? ` ${unit}` : ""}`,
          properties: {
            key,
            keyNormalized: getNodeProp(observationValue, "keyNormalized"),
            value,
            unit,
            observedAt: getNodeProp(observationValue, "observedAt"),
          },
        });
      }

      if (!nodeMap.has(metricNodeId)) {
        nodeMap.set(metricNodeId, {
          id: metricNodeId,
          type: "Metric",
          label:
            getNodeProp(metricValue, "displayName") ??
            getNodeProp(metricValue, "key") ??
            metricSlugRaw,
          properties: {
            slug: metricSlugRaw,
            key: getNodeProp(metricValue, "key"),
            keyNormalized: getNodeProp(metricValue, "keyNormalized"),
          },
        });
      }

      edgeMap.set(`${patientNodeId}|HAS_REPORT|${reportNodeId}`, {
        source: patientNodeId,
        target: reportNodeId,
        type: "HAS_REPORT",
      });

      edgeMap.set(`${reportNodeId}|HAS_OBSERVATION|${observationNodeId}`, {
        source: reportNodeId,
        target: observationNodeId,
        type: "HAS_OBSERVATION",
      });

      edgeMap.set(`${observationNodeId}|OF_METRIC|${metricNodeId}`, {
        source: observationNodeId,
        target: metricNodeId,
        type: "OF_METRIC",
      });

      if (!evidenceMap.has(observationIdRaw)) {
        const documentTitle = isNeo4jNode(documentValue)
          ? getNodeProp(documentValue, "title")
          : null;

        evidenceMap.set(observationIdRaw, {
          id: observationIdRaw,
          patientId: patientIdRaw,
          patientName: getNodeProp(patientValue, "name"),
          reportId: reportIdRaw,
          documentTitle,
          reportDate: getNodeProp(reportValue, "reportDate"),
          hospitalName: getNodeProp(reportValue, "hospitalName"),
          key: getNodeProp(observationValue, "key") ?? "Unknown",
          keyNormalized: getNodeProp(observationValue, "keyNormalized"),
          value: getNodeProp(observationValue, "value") ?? "",
          unit: getNodeProp(observationValue, "unit"),
          observedAt: getNodeProp(observationValue, "observedAt"),
        });
      }
    }

    const nodes = Array.from(nodeMap.values());
    const edges = Array.from(edgeMap.values());
    const evidence = Array.from(evidenceMap.values()).slice(0, 30);

    if (nodes.length > 0) {
      return {
        queryTerms,
        nodes: nodes.slice(0, 200),
        edges: edges.slice(0, 300),
        evidence,
        stats: {
          patients: nodes.filter((node) => node.type === "Patient").length,
          reports: nodes.filter((node) => node.type === "Report").length,
          observations: nodes.filter((node) => node.type === "Observation")
            .length,
          metrics: nodes.filter((node) => node.type === "Metric").length,
          totalNodes: nodes.length,
          totalEdges: edges.length,
        },
      };
    }

    const semanticResult = await session.executeRead(async (tx) =>
      tx.run(
        `
        MATCH (d:Document)-[:MENTIONS]->(e:ClinicalEntity)
        OPTIONAL MATCH (e)-[rel:RELATES_TO]->(linked:ClinicalEntity)
        OPTIONAL MATCH (d)-[:IN_DOMAIN]->(domain:KnowledgeDomain)
        WITH d, e, rel, linked, domain,
             CASE
               WHEN size($terms) = 0 THEN true
               ELSE any(term IN $terms WHERE
                 toLower(coalesce(d.title, "")) CONTAINS term OR
                 toLower(coalesce(e.name, "")) CONTAINS term OR
                 toLower(coalesce(e.canonicalName, "")) CONTAINS term OR
                 toLower(coalesce(e.description, "")) CONTAINS term OR
                 toLower(coalesce(rel.relationType, "")) CONTAINS term OR
                 toLower(coalesce(rel.evidence, "")) CONTAINS term OR
                 toLower(coalesce(linked.name, "")) CONTAINS term OR
                 toLower(coalesce(domain.name, "")) CONTAINS term
               )
             END AS matched
        WHERE matched
        RETURN d,
               e,
               linked,
               domain,
               CASE WHEN rel IS NULL THEN null ELSE coalesce(rel.relationType, 'RELATED_TO') END AS relationType,
               CASE WHEN rel IS NULL THEN null ELSE rel.evidence END AS relationEvidence
        ORDER BY coalesce(d.updatedAt, d.createdAt) DESC
        LIMIT $limit
        `,
        {
          terms: queryTerms,
          limit: Number(maxRows),
        },
      ),
    );

    const semanticNodeMap = new Map<string, GraphNodePayload>();
    const semanticEdgeMap = new Map<string, GraphEdgePayload>();
    const semanticEvidenceMap = new Map<string, GraphEvidencePayload>();

    for (const record of semanticResult.records) {
      const documentValue = record.get("d");
      const entityValue = record.get("e");
      const linkedValue = record.get("linked");
      const domainValue = record.get("domain");

      if (!isNeo4jNode(documentValue) || !isNeo4jNode(entityValue)) {
        continue;
      }

      const documentIdRaw = getNodeProp(documentValue, "id");
      const documentTitle =
        getNodeProp(documentValue, "title") ?? documentIdRaw ?? "Document";
      const entityKeyRaw =
        getNodeProp(entityValue, "key") ?? getNodeProp(entityValue, "name");
      const entityName =
        getNodeProp(entityValue, "name") ??
        getNodeProp(entityValue, "canonicalName") ??
        entityKeyRaw ??
        "Entity";

      if (!documentIdRaw || !entityKeyRaw) {
        continue;
      }

      const documentNodeId = `document:${documentIdRaw}`;
      const entityNodeId = `entity:${entityKeyRaw}`;

      semanticNodeMap.set(documentNodeId, {
        id: documentNodeId,
        type: "Document",
        label: documentTitle,
        properties: {
          documentId: documentIdRaw,
          title: documentTitle,
          domain: isNeo4jNode(domainValue)
            ? getNodeProp(domainValue, "name")
            : null,
        },
      });

      semanticNodeMap.set(entityNodeId, {
        id: entityNodeId,
        type: "ClinicalEntity",
        label: entityName,
        properties: {
          key: getNodeProp(entityValue, "key"),
          canonicalName: getNodeProp(entityValue, "canonicalName"),
          entityType: getNodeProp(entityValue, "type"),
          description: getNodeProp(entityValue, "description"),
        },
      });

      semanticEdgeMap.set(`${documentNodeId}|MENTIONS|${entityNodeId}`, {
        source: documentNodeId,
        target: entityNodeId,
        type: "MENTIONS",
      });

      if (isNeo4jNode(domainValue)) {
        const domainName = getNodeProp(domainValue, "name");
        if (domainName) {
          const domainNodeId = `domain:${domainName}`;
          semanticNodeMap.set(domainNodeId, {
            id: domainNodeId,
            type: "KnowledgeDomain",
            label: domainName,
            properties: {
              name: domainName,
            },
          });

          semanticEdgeMap.set(`${documentNodeId}|IN_DOMAIN|${domainNodeId}`, {
            source: documentNodeId,
            target: domainNodeId,
            type: "IN_DOMAIN",
          });
        }
      }

      const relationType = toNullableString(record.get("relationType"));
      const relationEvidence = toNullableString(record.get("relationEvidence"));

      if (relationType && isNeo4jNode(linkedValue)) {
        const linkedKey =
          getNodeProp(linkedValue, "key") ?? getNodeProp(linkedValue, "name");
        const linkedName =
          getNodeProp(linkedValue, "name") ??
          getNodeProp(linkedValue, "canonicalName") ??
          linkedKey ??
          "Related Entity";

        if (linkedKey) {
          const linkedNodeId = `entity:${linkedKey}`;
          semanticNodeMap.set(linkedNodeId, {
            id: linkedNodeId,
            type: "ClinicalEntity",
            label: linkedName,
            properties: {
              key: getNodeProp(linkedValue, "key"),
              canonicalName: getNodeProp(linkedValue, "canonicalName"),
              entityType: getNodeProp(linkedValue, "type"),
              description: getNodeProp(linkedValue, "description"),
            },
          });

          semanticEdgeMap.set(
            `${entityNodeId}|RELATES_TO:${relationType}|${linkedNodeId}`,
            {
              source: entityNodeId,
              target: linkedNodeId,
              type: `RELATES_TO:${relationType}`,
            },
          );

          const evidenceId = `${documentIdRaw}:${entityKeyRaw}:${linkedKey}:${relationType}`;
          if (!semanticEvidenceMap.has(evidenceId)) {
            semanticEvidenceMap.set(evidenceId, {
              id: evidenceId,
              patientId: documentIdRaw,
              patientName: documentTitle,
              reportId: relationType,
              documentTitle,
              reportDate: null,
              hospitalName: isNeo4jNode(domainValue)
                ? getNodeProp(domainValue, "name")
                : null,
              key: entityName,
              keyNormalized: relationType,
              value: linkedName,
              unit: null,
              observedAt: null,
            });
          }
        }
      }

      const mentionEvidenceId = `${documentIdRaw}:${entityKeyRaw}:MENTION`;
      if (!semanticEvidenceMap.has(mentionEvidenceId)) {
        semanticEvidenceMap.set(mentionEvidenceId, {
          id: mentionEvidenceId,
          patientId: documentIdRaw,
          patientName: documentTitle,
          reportId: "MENTIONS",
          documentTitle,
          reportDate: null,
          hospitalName: isNeo4jNode(domainValue)
            ? getNodeProp(domainValue, "name")
            : null,
          key: entityName,
          keyNormalized: "MENTIONS",
          value: relationEvidence ?? entityName,
          unit: null,
          observedAt: null,
        });
      }
    }

    const semanticNodes = Array.from(semanticNodeMap.values());
    const semanticEdges = Array.from(semanticEdgeMap.values());
    const semanticEvidence = Array.from(semanticEvidenceMap.values()).slice(
      0,
      30,
    );

    return {
      queryTerms,
      nodes: semanticNodes.slice(0, 200),
      edges: semanticEdges.slice(0, 300),
      evidence: semanticEvidence,
      stats: {
        patients: semanticNodes.filter((node) => node.type === "Document")
          .length,
        reports: semanticNodes.filter((node) => node.type === "KnowledgeDomain")
          .length,
        observations: semanticNodes.filter(
          (node) => node.type === "ClinicalEntity",
        ).length,
        metrics: semanticEdges.length,
        totalNodes: semanticNodes.length,
        totalEdges: semanticEdges.length,
      },
    };
  } catch (error) {
    console.error("Neo4j graph search failed:", error);
    return null;
  } finally {
    await session.close();
  }
}
