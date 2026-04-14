import type { ExtractedReportData, ExtractedReportValue } from "./reportExtractor";
import {
  CANONICAL_METRICS,
  METRIC_STOP_WORDS,
  listCanonicalMetricKeys,
} from "./metricAliasDictionary";

export interface StructuredMetricRowInput {
  key: string;
  keyNormalized: string | null;
  value: string;
  valueNumeric: number | null;
  unit: string | null;
  unitNormalized: string | null;
  observedAt: Date;
  sequence: number;
  userId: string;
}

export interface DictionaryExpansionSuggestion {
  rawKey: string;
  normalizedKey: string;
  suggestedCanonicalKey: string | null;
  confidence: number;
  reason: string;
}

export interface DictionaryExpansionPayload {
  unresolvedAliasCount: number;
  suggestions: DictionaryExpansionSuggestion[];
  llmReviewPrompt: string;
}

export interface StructuredMetricBuildResult {
  rows: StructuredMetricRowInput[];
  skippedCount: number;
  numericParsedCount: number;
  aliasMappedCount: number;
  compositeExpandedCount: number;
  unmappedMetricCount: number;
  dictionaryExpansion: DictionaryExpansionPayload | null;
}

interface ResolvedMetricKey {
  canonicalKey: string;
  normalizedKey: string;
  isAliasMapped: boolean;
  strategy: "exact" | "regex" | "fuzzy" | "fallback";
  bestCandidate?: {
    canonicalKey: string;
    score: number;
  };
}

const EXACT_ALIAS_INDEX = buildExactAliasIndex();

export function parseExtractedReportDate(reportDate: string | null): Date | null {
  if (!reportDate) {
    return null;
  }

  const parsed = new Date(reportDate);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function buildStructuredMetricRows(
  testValues: ExtractedReportValue[],
  userId: string,
  observedAt: Date
): StructuredMetricBuildResult {
  const rows: StructuredMetricRowInput[] = [];
  const unresolvedSuggestions = new Map<string, DictionaryExpansionSuggestion>();

  let skippedCount = 0;
  let numericParsedCount = 0;
  let aliasMappedCount = 0;
  let compositeExpandedCount = 0;
  let unmappedMetricCount = 0;

  for (let index = 0; index < testValues.length; index += 1) {
    const metric = testValues[index];
    const key = sanitizeText(metric.key);
    const value = sanitizeText(metric.value);

    if (!key && !value) {
      skippedCount += 1;
      continue;
    }

    const unit = normalizeNullableText(metric.unit);
    const unitNormalized = normalizeMetricUnit(metric.unit);
    const resolvedKey = resolveCanonicalMetricKey(key, unitNormalized);

    if (resolvedKey.isAliasMapped) {
      aliasMappedCount += 1;
    } else {
      unmappedMetricCount += 1;
      const suggestion = buildDictionaryExpansionSuggestion(key, resolvedKey);
      const existing = unresolvedSuggestions.get(suggestion.normalizedKey);
      if (!existing || suggestion.confidence > existing.confidence) {
        unresolvedSuggestions.set(suggestion.normalizedKey, suggestion);
      }
    }

    const bloodPressureParts = parseBloodPressureParts(value);
    if (bloodPressureParts && isBloodPressureFamily(resolvedKey.canonicalKey)) {
      compositeExpandedCount += 1;

      rows.push({
        key,
        keyNormalized: "blood pressure systolic",
        value: String(bloodPressureParts.systolic),
        valueNumeric: bloodPressureParts.systolic,
        unit,
        unitNormalized,
        observedAt,
        sequence: index * 10,
        userId,
      });
      rows.push({
        key,
        keyNormalized: "blood pressure diastolic",
        value: String(bloodPressureParts.diastolic),
        valueNumeric: bloodPressureParts.diastolic,
        unit,
        unitNormalized,
        observedAt,
        sequence: index * 10 + 1,
        userId,
      });
      continue;
    }

    const valueNumeric = parseNumericMetricValue(value);
    if (valueNumeric !== null) {
      numericParsedCount += 1;
    }

    rows.push({
      key,
      keyNormalized: resolvedKey.canonicalKey,
      value,
      valueNumeric,
      unit,
      unitNormalized,
      observedAt,
      sequence: index,
      userId,
    });
  }

  return {
    rows,
    skippedCount,
    numericParsedCount,
    aliasMappedCount,
    compositeExpandedCount,
    unmappedMetricCount,
    dictionaryExpansion: buildDictionaryExpansionPayload(
      Array.from(unresolvedSuggestions.values())
    ),
  };
}

export function buildMedicalReportExtractedJson(
  extractedData: ExtractedReportData,
  metricBuildResult?: StructuredMetricBuildResult
): Record<string, unknown> {
  const basePayload: Record<string, unknown> = {
    hospitalName: extractedData.hospitalName,
    reportDate: extractedData.reportDate,
    passed: extractedData.passed,
    fidelityScore: extractedData.fidelityScore,
    conclusion: extractedData.conclusion,
    testValues: extractedData.testValues,
  };

  if (!metricBuildResult) {
    return basePayload;
  }

  return {
    ...basePayload,
    structuredIngestion: {
      skippedCount: metricBuildResult.skippedCount,
      numericParsedCount: metricBuildResult.numericParsedCount,
      aliasMappedCount: metricBuildResult.aliasMappedCount,
      compositeExpandedCount: metricBuildResult.compositeExpandedCount,
      unmappedMetricCount: metricBuildResult.unmappedMetricCount,
      dictionaryExpansion: metricBuildResult.dictionaryExpansion,
    },
  };
}

function buildDictionaryExpansionSuggestion(
  rawKey: string,
  resolvedKey: ResolvedMetricKey
): DictionaryExpansionSuggestion {
  const suggestedCanonicalKey =
    resolvedKey.bestCandidate && resolvedKey.bestCandidate.score >= 0.5
      ? resolvedKey.bestCandidate.canonicalKey
      : null;

  return {
    rawKey,
    normalizedKey: resolvedKey.normalizedKey,
    suggestedCanonicalKey,
    confidence: Number((resolvedKey.bestCandidate?.score ?? 0).toFixed(3)),
    reason:
      resolvedKey.strategy === "fallback"
        ? "No high-confidence dictionary match"
        : `Resolved by ${resolvedKey.strategy}`,
  };
}

function buildDictionaryExpansionPayload(
  suggestions: DictionaryExpansionSuggestion[]
): DictionaryExpansionPayload | null {
  if (suggestions.length === 0) {
    return null;
  }

  const ordered = suggestions
    .slice()
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 30);

  return {
    unresolvedAliasCount: suggestions.length,
    suggestions: ordered,
    llmReviewPrompt: buildLlmAliasReviewPrompt(ordered),
  };
}

function buildLlmAliasReviewPrompt(
  suggestions: DictionaryExpansionSuggestion[]
): string {
  const canonicalKeys = listCanonicalMetricKeys();
  const unresolvedJson = JSON.stringify(suggestions, null, 2);

  return [
    "You are a medical terminology curator for a structured retrieval dictionary.",
    "Goal: decide whether each unresolved metric alias should map to an existing canonical metric or create a new canonical metric.",
    "Output STRICT JSON array. For each input alias return:",
    "{ rawKey, normalizedKey, decision, canonicalKey, confidence, rationale }",
    "decision must be one of: MAP_TO_EXISTING, CREATE_NEW_CANONICAL, IGNORE",
    "If decision=MAP_TO_EXISTING, canonicalKey must be from the canonical list below.",
    "If decision=CREATE_NEW_CANONICAL, canonicalKey should be a concise normalized phrase.",
    "Do not invent values outside the schema.",
    "",
    "Canonical metric keys:",
    JSON.stringify(canonicalKeys),
    "",
    "Unresolved aliases:",
    unresolvedJson,
  ].join("\n");
}

function sanitizeText(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

function normalizeNullableText(input: string | null): string | null {
  if (!input) {
    return null;
  }

  const normalized = sanitizeText(input);
  return normalized.length > 0 ? normalized : null;
}

function normalizeMetricKey(key: string): string | null {
  if (!key) {
    return null;
  }

  const normalized = key
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  return normalized.length > 0 ? normalized : null;
}

function normalizeMetricUnit(unit: string | null): string | null {
  if (!unit) {
    return null;
  }

  const normalized = unit.trim().toUpperCase().replace(/\s+/g, "");
  return normalized.length > 0 ? normalized : null;
}

function resolveCanonicalMetricKey(
  rawKey: string,
  unitNormalized: string | null
): ResolvedMetricKey {
  const normalizedKey = normalizeMetricKey(rawKey);
  if (!normalizedKey) {
    return {
      canonicalKey: "unknown metric",
      normalizedKey: "unknown metric",
      isAliasMapped: false,
      strategy: "fallback",
    };
  }

  const exactMatch = EXACT_ALIAS_INDEX.get(normalizedKey);
  if (exactMatch) {
    return {
      canonicalKey: exactMatch,
      normalizedKey,
      isAliasMapped: true,
      strategy: "exact",
    };
  }

  let bestCandidate: { canonicalKey: string; score: number } | null = null;

  for (const def of CANONICAL_METRICS) {
    if (def.regexPatterns?.some((pattern) => pattern.test(normalizedKey))) {
      return {
        canonicalKey: def.canonicalKey,
        normalizedKey,
        isAliasMapped: true,
        strategy: "regex",
      };
    }

    const aliasScore = getBestAliasSimilarity(normalizedKey, def.aliases);
    let score = aliasScore;

    if (unitNormalized && def.unitHints?.includes(unitNormalized)) {
      score += 0.08;
    }

    if (!bestCandidate || score > bestCandidate.score) {
      bestCandidate = {
        canonicalKey: def.canonicalKey,
        score,
      };
    }
  }

  if (bestCandidate && bestCandidate.score >= 0.72) {
    return {
      canonicalKey: bestCandidate.canonicalKey,
      normalizedKey,
      isAliasMapped: true,
      strategy: "fuzzy",
      bestCandidate,
    };
  }

  return {
    canonicalKey: normalizedKey,
    normalizedKey,
    isAliasMapped: false,
    strategy: "fallback",
    bestCandidate: bestCandidate ?? undefined,
  };
}

function buildExactAliasIndex(): Map<string, string> {
  const index = new Map<string, string>();

  for (const metric of CANONICAL_METRICS) {
    const canonicalNormalized = normalizeMetricKey(metric.canonicalKey);
    if (canonicalNormalized) {
      index.set(canonicalNormalized, metric.canonicalKey);
    }

    for (const alias of metric.aliases) {
      const aliasNormalized = normalizeMetricKey(alias);
      if (aliasNormalized) {
        index.set(aliasNormalized, metric.canonicalKey);
      }
    }
  }

  return index;
}

function getBestAliasSimilarity(key: string, aliases: string[]): number {
  let best = 0;

  for (const alias of aliases) {
    const aliasNormalized = normalizeMetricKey(alias);
    if (!aliasNormalized) {
      continue;
    }

    const similarity = getTokenSimilarity(key, aliasNormalized);
    if (similarity > best) {
      best = similarity;
    }
  }

  return best;
}

function getTokenSimilarity(a: string, b: string): number {
  const aTokens = tokenizeMetricKey(a);
  const bTokens = tokenizeMetricKey(b);

  if (aTokens.length === 0 || bTokens.length === 0) {
    return 0;
  }

  let overlap = 0;
  const bSet = new Set(bTokens);
  for (const token of aTokens) {
    if (bSet.has(token)) {
      overlap += 1;
    }
  }

  const overlapScore = overlap / Math.max(aTokens.length, bTokens.length);
  const charSimilarity = normalizedLevenshteinSimilarity(a, b);
  return overlapScore * 0.75 + charSimilarity * 0.25;
}

function tokenizeMetricKey(value: string): string[] {
  return value
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 0 && !METRIC_STOP_WORDS.has(token));
}

function normalizedLevenshteinSimilarity(a: string, b: string): number {
  const dist = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) {
    return 1;
  }
  return 1 - dist / maxLen;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array.from({ length: b.length + 1 }, () => 0)
  );

  for (let i = 0; i <= a.length; i += 1) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= b.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

function isBloodPressureFamily(canonicalKey: string): boolean {
  return canonicalKey.startsWith("blood pressure");
}

function parseBloodPressureParts(
  value: string
): { systolic: number; diastolic: number } | null {
  const compact = value.replace(/\s+/g, "");
  const match = compact.match(/^(\d{2,3})\/(\d{2,3})$/);
  if (!match) {
    return null;
  }

  const systolic = Number.parseInt(match[1], 10);
  const diastolic = Number.parseInt(match[2], 10);

  if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) {
    return null;
  }
  if (systolic <= 0 || diastolic <= 0) {
    return null;
  }

  return { systolic, diastolic };
}

function parseNumericMetricValue(value: string): number | null {
  const compact = value.trim().replace(/,/g, "");

  // Composite values remain atomic only when not explicitly expanded (for example blood pressure).
  if (compact.includes("/") || /\d\s*[-–]\s*\d/.test(compact)) {
    return null;
  }

  const numericMatch = compact.match(/-?\d+(?:\.\d+)?/);
  if (!numericMatch) {
    return null;
  }

  const parsed = Number.parseFloat(numericMatch[0]);
  return Number.isFinite(parsed) ? parsed : null;
}
