"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { processPdfAndConvertToText } from "./pdfProcessing";

const openRouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
});

const ZAI_API_KEY = process.env.ZAI_API_KEY || "";

/**
 * Retrieves and validates Gemini API keys from environment variables.
 */
function getApiKeys(): string[] {
  const apiKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY2,
    process.env.KeyForRoadmap_API_KEY,
    process.env.GEMINI_API_KEY3,
  ].filter((key): key is string => !!key);

  if (apiKeys.length === 0) {
    console.error("No GEMINI_API_KEY environment variables are set.");
    throw new Error("Server configuration error: Missing Gemini API Keys.");
  }

  return apiKeys;
}

const imageExtractionPrompt = `
===================================================================================================
ROLE • You are a medical document scribe. Your mission is to extract all text and medical
       information from the provided image with high accuracy.

PRIMARY GOALS
1. Extract all visible text from the image.
2. Preserve the structure and hierarchy of the information.
3. Identify and categorize medical information (patient details, diagnoses, medications, etc.).

DELIVERABLE
• One GitHub-Flavoured Markdown (GFM) file with the extracted text.
• Use appropriate Markdown formatting (headings, lists, tables) to preserve structure.
• No extra commentary, only the extracted content.

===================================================================================================
GLOBAL RULES (obligatory)
1. VERBATIM TEXT — Reproduce every printed character exactly (capitalisation, diacritics,
   punctuation, line/paragraph breaks). Never paraphrase or reorder.
2. HANDWRITING — If fully legible, transcribe and prefix "[Handwritten: …]".
   Partially legible → "[…illegible…]". Completely unreadable → "[ILLEGIBLE]".
3. TABLES — Use Markdown tables to preserve tabular data.
4. HEADERS — Detect visual hierarchy and use Markdown headings (#, ##, ###) appropriately.
5. MEDICAL TERMS — Preserve all medical terminology exactly as written.

===================================================================================================
QUALITY-ASSURANCE PROTOCOL (perform **before** emitting final output)
1. Verify all text has been extracted.
2. Check that medical information is preserved accurately.
3. Ensure proper Markdown formatting.

===================================================================================================
FAIL-SAFE RULES
• If text is undecipherable, use "[ILLEGIBLE]" — never invent.
• Preserve the original structure as much as possible.

===================================================================================================
BEGIN WORK AS SOON AS THE IMAGE IS SUPPLIED. OUTPUT ONLY THE EXTRACTED GFM.
===================================================================================================
`;

/**
 * Calls the Z.AI Layout Parsing API (glm-ocr) to extract text from an image.
 * Accepts a base64-encoded image directly.
 * Returns markdown-formatted text or null on failure.
 */
async function imageToTextWithZAI(
  imageBase64: string,
  mimeType: string
): Promise<string | null> {
  if (!ZAI_API_KEY) {
    console.warn("ZAI_API_KEY is not set, skipping Z.AI Layout Parsing.");
    return null;
  }

  console.log("Attempting Z.AI Layout Parsing API call for image...");

  try {
    const requestBody = {
      model: "glm-ocr",
      file: `data:${mimeType};base64,${imageBase64}`,
    };

    const response = await fetch(
      "https://api.z.ai/api/paas/v4/layout_parsing",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ZAI_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Z.AI API returned status ${response.status}: ${errorText}`
      );
      return null;
    }

    const data = await response.json();

    if (data.md_results) {
      console.log(
        `SUCCESS: Z.AI Layout Parsing succeeded for image. Result length: ${data.md_results.length}`
      );
      return data.md_results;
    }

    console.warn("Z.AI API returned no md_results for image.");
    return null;
  } catch (error) {
    console.error("FAILURE: Z.AI Layout Parsing API call failed for image.");
    if (error instanceof Error) {
      console.error("Error Message:", error.message);
    }
    return null;
  }
}

/**
 * Extract text from an image.
 * Primary: Z.AI Layout Parsing (glm-ocr) with base64 image input.
 * Fallback: Gemini vision, then OpenRouter.
 */
export async function imageToText(
  imageBase64: string,
  mimeType: string
): Promise<string | null> {
  // ── Primary: Z.AI Layout Parsing (glm-ocr) ──
  const zaiResult = await imageToTextWithZAI(imageBase64, mimeType);
  if (zaiResult) {
    return zaiResult;
  }
  console.log(
    "Z.AI Layout Parsing failed or unavailable for image, falling back to Gemini..."
  );

  // ── Fallback: Gemini Vision ──
  const prompt = imageExtractionPrompt;
  const apiKeys = getApiKeys();
  const totalKeys = apiKeys.length;
  const startIndex = Math.floor(Math.random() * totalKeys);

  console.log(`Starting Gemini image extraction. Total keys: ${totalKeys}.`);

  const fileDataPart = {
    inlineData: {
      mimeType,
      data: imageBase64,
    },
  };

  for (let i = 0; i < totalKeys; i++) {
    const currentIndex = (startIndex + i) % totalKeys;
    const apiKey = apiKeys[currentIndex];

    console.log(
      `Attempting Gemini API call with key at index: ${currentIndex}`
    );

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
      });

      const result = await model.generateContent([prompt, fileDataPart]);
      const response = result.response;
      const text = response.text();

      console.log("SUCCESS: Gemini API call succeeded for image.");
      console.log("Response Text Length:", text?.length ?? 0);

      if (text === undefined || text === null) {
        console.warn(
          "Response text was undefined or null, returning empty content."
        );
        return "";
      }

      return text;
    } catch (error) {
      console.error(
        `FAILURE: Gemini API call with key at index ${currentIndex} failed.`
      );
      if (error instanceof Error) {
        console.error("Error Message:", error.message);
      }
    }
  }

  // ── Last Resort: OpenRouter ──
  console.log("Gemini failed, trying OpenRouter fallback...");
  try {
    const result = await openRouter.chat.completions.create({
      model: "google/gemini-2.0-flash-001",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 8000,
    });

    const text = result.choices[0]?.message?.content;
    if (text) {
      console.log("SUCCESS: OpenRouter fallback succeeded.");
      return text;
    }
  } catch (error) {
    console.error("OpenRouter fallback also failed:", error);
  }

  console.error("All API attempts failed. Unable to process the image.");
  return null;
}

/**
 * Process user data files (PDFs and images) and extract text.
 */
export async function processUserDataFiles(
  files: Array<{ base64: string; type: "pdf" | "image"; name: string }>
): Promise<string | null> {
  if (!files.length) {
    console.error("processUserDataFiles received no valid files.");
    return null;
  }

  console.log(`Processing ${files.length} user data file(s)`);

  try {
    const textParts: string[] = [];

    for (const file of files) {
      console.log(`Processing file: ${file.name} (${file.type})`);

      if (file.type === "pdf") {
        // Use existing PDF processing
        const pdfText = await processPdfAndConvertToText([file.base64]);
        if (pdfText) {
          textParts.push(`## File: ${file.name}\n\n${pdfText}`);
        }
      } else if (file.type === "image") {
        // Extract text from image
        const imageText = await imageToText(
          file.base64,
          getMimeType(file.name)
        );
        if (imageText) {
          textParts.push(`## File: ${file.name}\n\n${imageText}`);
        }
      }
    }

    const fullText = textParts.join("\n\n---\n\n");
    console.log("Full text length:", fullText.length);
    return fullText;
  } catch (error) {
    console.error("Failed to process user data files:", error);
    return null;
  }
}

/**
 * Get MIME type based on file extension.
 */
function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    bmp: "image/bmp",
    svg: "image/svg+xml",
  };
  return mimeTypes[ext || ""] || "image/jpeg";
}
