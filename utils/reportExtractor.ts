"use server";

import OpenAI from "openai";

const openRouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
});

export interface ExtractedReportValue {
  key: string;
  value: string;
  unit: string | null;
}

export interface ExtractedReportData {
  hospitalName: string | null;
  reportDate: string | null;
  testValues: ExtractedReportValue[];
}

interface ReportMetadata {
  hospitalName: string | null;
  reportDate: string | null;
}

const METADATA_EXTRACTION_PROMPT = `You are a medical report metadata extraction assistant. Your task is to extract only the metadata from medical/lab reports.

From the provided OCR text of a medical report, extract:
1. Hospital/Lab Name - The name of the hospital, laboratory, or diagnostic center
2. Report Date - The date when the sample was collected or report was generated (in YYYY-MM-DD format)

CRITICAL RULES - DO NOT HALLUCINATE:
- If hospital name is NOT EXPLICITLY MENTIONED in the text, set to null
- If date is NOT EXPLICITLY MENTIONED in the text, set to null
- If you are UNCERTAIN about any information, set it to null
- If the text is UNCLEAR or PARTIALLY ILLEGIBLE, set to null
- DO NOT make up or guess any information
- DO NOT infer information from context
- Only extract information that is CLEARLY and EXPLICITLY stated in the text
- Hospital name should be in UPPERCASE if found
- Date must be in YYYY-MM-DD format
- If the date format is unclear or ambiguous, set to null

Analyze the following OCR text and extract the metadata:`;

const TEST_VALUES_EXTRACTION_PROMPT = `You are a medical test values extraction assistant. Your task is to extract test results from medical/lab reports.

From the provided OCR text of a medical report, extract ALL test values with their names, values, and units.

IMPORTANT RULES:
- All test names (keys) must be in UPPERCASE
- All units must be in UPPERCASE
- If a value has no unit, set unit to null
- Extract ALL test values you can find in the report
- Be precise with numerical values - include decimals exactly as shown
- Common test names include: VITAMIN D, VITAMIN D2, VITAMIN D3, TSH, T3, T4, HBA1C, HEMOGLOBIN, GLUCOSE, CHOLESTEROL, etc.

Analyze the following OCR text and extract the test values:`;

/**
 * Extract report metadata (hospital name and date) using AI
 */
async function extractReportMetadata(ocrText: string): Promise<ReportMetadata> {
  console.log("=== STARTING METADATA EXTRACTION ===");

  try {
    const response = await openRouter.chat.completions.create({
      model: "openai/gpt-oss-20b",
      reasoning_effort: "low",
      messages: [
        {
          role: "system",
          content: METADATA_EXTRACTION_PROMPT,
        },
        {
          role: "user",
          content: ocrText,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "medical_report_metadata",
          strict: true,
          schema: {
            type: "object",
            properties: {
              hospitalName: {
                type: ["string", "null"],
                description: "Name of the hospital or laboratory (UPPERCASE)",
              },
              reportDate: {
                type: ["string", "null"],
                description: "Date of the report in YYYY-MM-DD format",
              },
            },
            required: ["hospitalName", "reportDate"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      console.error("No content in metadata AI response");
      return {
        hospitalName: null,
        reportDate: null,
      };
    }

    console.log("=== METADATA EXTRACTION RAW RESPONSE ===");
    console.log(content);
    console.log("=== END METADATA EXTRACTION RAW RESPONSE ===");

    const metadata: ReportMetadata = JSON.parse(content);

    // Ensure hospital name is uppercase
    if (metadata.hospitalName) {
      metadata.hospitalName = metadata.hospitalName.toUpperCase();
    }

    console.log("=== PARSED METADATA RESULT ===");
    console.log(`Hospital: ${metadata.hospitalName}`);
    console.log(`Date: ${metadata.reportDate}`);
    console.log("=== END PARSED METADATA RESULT ===");

    return metadata;
  } catch (error) {
    console.error("Error in metadata extraction:", error);
    return {
      hospitalName: null,
      reportDate: null,
    };
  }
}

/**
 * Extract test values (key-value pairs) using AI
 */
async function extractTestValues(
  ocrText: string
): Promise<ExtractedReportValue[]> {
  console.log("=== STARTING TEST VALUES EXTRACTION ===");

  try {
    const response = await openRouter.chat.completions.create({
      model: "qwen/qwen3-next-80b-a3b-instruct",
      messages: [
        {
          role: "system",
          content: TEST_VALUES_EXTRACTION_PROMPT,
        },
        {
          role: "user",
          content: ocrText,
        },
      ],
      max_completion_tokens: 4000,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "medical_test_values",
          strict: true,
          schema: {
            type: "object",
            properties: {
              testValues: {
                type: "array",
                description: "Array of extracted test values",
                items: {
                  type: "object",
                  properties: {
                    key: {
                      type: "string",
                      description: "Test name in UPPERCASE",
                    },
                    value: {
                      type: "string",
                      description: "The numerical or text value of the test",
                    },
                    unit: {
                      type: ["string", "null"],
                      description:
                        "Unit of measurement in UPPERCASE, or null if none",
                    },
                  },
                  required: ["key", "value", "unit"],
                  additionalProperties: false,
                },
              },
            },
            required: ["testValues"],
            additionalProperties: false,
          },
        },
      },
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      console.error("No content in test values AI response");
      return [];
    }

    console.log("=== TEST VALUES EXTRACTION RAW RESPONSE ===");
    console.log(content);
    console.log("=== END TEST VALUES EXTRACTION RAW RESPONSE ===");

    const parsed = JSON.parse(content);
    const testValues: ExtractedReportValue[] = parsed.testValues || [];

    // Ensure all keys and units are uppercase (double-check)
    const normalizedTestValues = testValues.map((tv) => ({
      key: tv.key.toUpperCase(),
      value: tv.value,
      unit: tv.unit ? tv.unit.toUpperCase() : null,
    }));

    console.log("=== PARSED TEST VALUES RESULT ===");
    console.log(`Test Values (${normalizedTestValues.length}):`);
    normalizedTestValues.forEach((tv, i) => {
      console.log(`  ${i + 1}. ${tv.key} = ${tv.value} ${tv.unit || ""}`);
    });
    console.log("=== END PARSED TEST VALUES RESULT ===");

    return normalizedTestValues;
  } catch (error) {
    console.error("Error in test values extraction:", error);
    return [];
  }
}

/**
 * Extract structured data from medical report text using AI with JSON response format
 * Splits extraction into two parallel prompts for better performance and accuracy
 */
export async function extractReportDataWithAI(
  ocrText: string
): Promise<ExtractedReportData> {
  console.log("=== STARTING PARALLEL AI REPORT EXTRACTION ===");

  try {
    // Run both extractions in parallel using Promise.all
    const [metadata, testValues] = await Promise.all([
      extractReportMetadata(ocrText),
      extractTestValues(ocrText),
    ]);

    const result: ExtractedReportData = {
      hospitalName: metadata.hospitalName,
      reportDate: metadata.reportDate,
      testValues: testValues,
    };

    console.log("=== COMBINED EXTRACTION RESULT ===");
    console.log(`Hospital: ${result.hospitalName}`);
    console.log(`Date: ${result.reportDate}`);
    console.log(`Total Test Values: ${result.testValues.length}`);
    console.log("=== END COMBINED EXTRACTION RESULT ===");

    return result;
  } catch (error) {
    console.error("Error in AI report extraction:", error);
    return {
      hospitalName: null,
      reportDate: null,
      testValues: [],
    };
  }
}
