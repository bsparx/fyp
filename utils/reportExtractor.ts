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

const EXTRACTION_PROMPT = `You are a medical report data extraction assistant. Your task is to extract structured data from medical/lab reports.

From the provided OCR text of a medical report, extract:
1. Hospital/Lab Name - The name of the hospital, laboratory, or diagnostic center
2. Report Date - The date when the sample was collected or report was generated (in YYYY-MM-DD format)
3. Test Values - All medical test results with their names, values, and units

IMPORTANT RULES:
- All test names (keys) must be in UPPERCASE
- All units must be in UPPERCASE
- If a value has no unit, set unit to null
- If hospital name is not found, set to null
- If date is not found, set to null
- Extract ALL test values you can find in the report
- Be precise with numerical values - include decimals exactly as shown
- Common test names include: VITAMIN D, VITAMIN D2, VITAMIN D3, TSH, T3, T4, HBA1C, HEMOGLOBIN, GLUCOSE, CHOLESTEROL, etc.

Analyze the following OCR text and extract the data:`;

/**
 * Extract structured data from medical report text using AI with JSON response format
 */
export async function extractReportDataWithAI(
  ocrText: string
): Promise<ExtractedReportData> {
  console.log("=== STARTING AI REPORT EXTRACTION ===");

  try {
    const response = await openRouter.chat.completions.create({
      model: "qwen/qwen3-vl-8b-instruct",
      messages: [
        {
          role: "system",
          content: EXTRACTION_PROMPT,
        },
        {
          role: "user",
          content: ocrText,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "medical_report_extraction",
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
            required: ["hospitalName", "reportDate", "testValues"],
            additionalProperties: false,
          },
        },
      },
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      return {
        hospitalName: null,
        reportDate: null,
        testValues: [],
      };
    }

    console.log("=== AI EXTRACTION RAW RESPONSE ===");
    console.log(content);
    console.log("=== END AI EXTRACTION RAW RESPONSE ===");

    // Parse the JSON response
    const extractedData: ExtractedReportData = JSON.parse(content);

    // Ensure all keys and units are uppercase (double-check)
    extractedData.testValues = extractedData.testValues.map((tv) => ({
      key: tv.key.toUpperCase(),
      value: tv.value,
      unit: tv.unit ? tv.unit.toUpperCase() : null,
    }));

    if (extractedData.hospitalName) {
      extractedData.hospitalName = extractedData.hospitalName.toUpperCase();
    }

    console.log("=== PARSED EXTRACTION RESULT ===");
    console.log(`Hospital: ${extractedData.hospitalName}`);
    console.log(`Date: ${extractedData.reportDate}`);
    console.log(`Test Values (${extractedData.testValues.length}):`);
    extractedData.testValues.forEach((tv, i) => {
      console.log(`  ${i + 1}. ${tv.key} = ${tv.value} ${tv.unit || ""}`);
    });
    console.log("=== END PARSED EXTRACTION RESULT ===");

    return extractedData;
  } catch (error) {
    console.error("Error in AI report extraction:", error);
    return {
      hospitalName: null,
      reportDate: null,
      testValues: [],
    };
  }
}
