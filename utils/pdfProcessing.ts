"use server";

import { PDFDocument } from "pdf-lib";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { execSync } from "child_process";
import fs from "node:fs";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";

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

/**
 * Converts a PDF (base64) to an array of base64-encoded PNG images.
 * Uses mutool locally to perform the conversion.
 */
async function pdfToImages(pdfBase64: string): Promise<string[]> {
  console.log("Starting PDF to image conversion locally");

  // Create a unique temporary directory for this run
  const runId = uuidv4();
  const tmpDir = path.join("/tmp", runId);
  fs.mkdirSync(tmpDir, { recursive: true });

  const inputPdfPath = path.join(tmpDir, "input.pdf");
  const outputPattern = path.join(tmpDir, "page-%d.png");

  try {
    const buffer = Buffer.from(pdfBase64, "base64");
    fs.writeFileSync(inputPdfPath, buffer);

    execSync(`mutool draw -o "${outputPattern}" -r 216 "${inputPdfPath}"`);

    const files = fs.readdirSync(tmpDir).filter((f) => f.endsWith(".png"));
    files.sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || "0");
      const numB = parseInt(b.match(/\d+/)?.[0] || "0");
      return numA - numB;
    });

    const images: string[] = [];
    for (const file of files) {
      const imageBuffer = fs.readFileSync(path.join(tmpDir, file));
      images.push(`data:image/png;base64,${imageBuffer.toString("base64")}`);
    }

    console.log(`Converted PDF to ${images.length} images`);
    return images;
  } finally {
    // Cleanup: remove temporary directory
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

const initialExtractionPrompt = (startingPage: number) => `
===================================================================================================
ROLE • You are an obsessively precise scientific scribe. Your single mission is to create a
       character-perfect, structure-faithful, machine-readable copy of the supplied PDF without
       losing a single glyph.  If the PDF ever conflicts with these instructions, the PDF wins
       (information-supremacy rule).

PAGE-NUMBERING CONTEXT
• BEGIN TRANSCRIBING IMMEDIATELY from the first image you are given.  
• Label that very first image as:
      --- Page ${startingPage} ---
• Continue numbering every subsequent image sequentially:
      --- Page ${startingPage + 1} ---,
      --- Page ${startingPage + 2} ---,
  etc.  Never leave gaps or try to "look for" earlier pages that were not supplied.

PRIMARY GOALS
1. 100 % fidelity transcription of every visible glyph (text, maths, code, tables, etc.).
2. RAG-ready hierarchy:
     • H1 = Top-level section.
     • H2, H3, and H4 = Nested subsections inside their nearest ancestor.

DELIVERABLE
• One GitHub-Flavoured Markdown (GFM) file; no extra commentary.  
• Content appears in natural reading order, divided by the page markers defined above.

===================================================================================================
GLOBAL RULES (obligatory)
0. PAGE SEQUENCE  
     • Always label pages exactly as described in "PAGE-NUMBERING CONTEXT".
1. VERBATIM TEXT — Reproduce every printed character exactly (capitalisation, diacritics,
   punctuation, bold/italics, line/paragraph breaks). Never paraphrase or reorder.
2. HANDWRITING — If fully legible, transcribe and prefix "[Handwritten: …]".  
   Partially legible → "[…illegible…]".  Completely unreadable → "[ILLEGIBLE]".
3. MATHEMATICS — Zero-tolerance for errors.  
     • Inline → \`$ … $\` Display → \`$$ … $$\`  
     • Preserve original spacing, subscripts, superscripts, Greek, arrows, ∀ ∃ ∈ ≤ ≠ ≈ ⋯  
     • Use Unicode for single-code-point symbols; otherwise LaTeX.  
     • Never simplify or recalculate.
4. CODE / PSEUDOCODE — Fence exactly as printed:  
        \`\`\`<language-if-obvious>
        # original indentation, spaces, blank lines
        \`\`\`
5. TABLES — Prefer Markdown tables. If rowspan/colspan make that impossible, fall back to a
   clearly labelled row-by-row list.
6. FIGURES & DIAGRAMS — Do **not** redraw. Provide one concise description in brackets, then the
   caption, e.g.  
        [Figure 3: Scatter plot of error rate vs. epochs.]
7. HEADERS / FOOTERS — If they carry semantic content (chapter title, etc.) include them in
   brackets: "[Footer: Page 12 – Chapter 2]".

===================================================================================================
SECTIONING & HIERARCHY
A. Detect visual hierarchy in the source (font size, numbering, bold, indentation).
B. Map the detected hierarchy to Markdown headings from H1 down to H4:
      Top-level section → H1 (#)
      Next lower level  → H2 (##)
      Deeper levels     → H3 (###), and H4 (####) as needed.
C. Ensure strict and logical nesting. An H2 must be inside an H1, an H3 inside an H2, and an
   H4 inside an H3. Never skip levels (e.g., do not place an H3 directly after an H1).

===================================================================================================
QUALITY-ASSURANCE PROTOCOL (perform **before** emitting final output)
1. Dual-Pass Entry — Type the page once, then re-read the image while comparing every character.  
2. Formula Audit — Pointer-check each symbol in every equation.  
3. Structure Audit — Confirm:  
      • Page markers present, correct, and sequential beginning with "--- Page ${startingPage} ---"  
      • Heading hierarchy is logical and strictly follows nesting rules (H2 within H1, H3 within H2, etc., down to H4).
4. Ambiguity Mark-Up — Append "[?]" immediately after any uncertain glyph.  
5. Final Confirmation — Output is valid GFM, free of extra commentary.

===================================================================================================
FAIL-SAFE RULES
• If a rule conflicts with perfect fidelity, fidelity wins; note the exception in brackets and
  continue.  
• If a glyph is undecipherable, use "[ILLEGIBLE]" — never invent.

===================================================================================================
BEGIN WORK AS SOON AS THE FIRST PAGE IMAGE IS SUPPLIED.  OUTPUT ONLY THE TRANSCRIBED GFM.
===================================================================================================
`;

/**
 * Calls the Z.AI Layout Parsing API (glm-ocr) to extract text from a PDF.
 * Accepts a base64-encoded PDF directly — no image conversion needed.
 * Returns markdown-formatted text or null on failure.
 */
async function pdfToTextWithZAI(
  pdfBase64: string,
  startingPage: number,
  endPage?: number
): Promise<string | null> {
  if (!ZAI_API_KEY) {
    console.warn("ZAI_API_KEY is not set, skipping Z.AI Layout Parsing.");
    return null;
  }

  console.log(
    `Attempting Z.AI Layout Parsing API call for pages starting at ${startingPage}`
  );

  try {
    const requestBody: Record<string, unknown> = {
      model: "glm-ocr",
      file: `data:application/pdf;base64,${pdfBase64}`,
    };

    if (startingPage > 1) {
      requestBody.start_page_id = startingPage;
    }
    if (endPage !== undefined) {
      requestBody.end_page_id = endPage;
    }

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
        `SUCCESS: Z.AI Layout Parsing succeeded. Result length: ${data.md_results.length}`
      );
      return data.md_results;
    }

    console.warn("Z.AI API returned no md_results.");
    return null;
  } catch (error) {
    console.error("FAILURE: Z.AI Layout Parsing API call failed.");
    if (error instanceof Error) {
      console.error("Error Message:", error.message);
    } else {
      console.error("An unknown error occurred:", error);
    }
    return null;
  }
}

export async function pdfToText(
  pdfBase64: string,
  startingPage: number
): Promise<string | null> {
  const prompt = initialExtractionPrompt(startingPage);

  console.log(`Starting PDF extraction from page ${startingPage}.`);

  // ── Primary: Z.AI Layout Parsing (glm-ocr) ──
  // Accepts PDF directly, no image conversion needed
  const zaiResult = await pdfToTextWithZAI(pdfBase64, startingPage);
  if (zaiResult) {
    return zaiResult;
  }
  console.log(
    "Z.AI Layout Parsing failed or unavailable, falling back to Qwen-VL + Gemini..."
  );

  // ── Fallback 1: OpenRouter Qwen-VL (requires image conversion) ──
  // Convert PDF to images locally
  let images: string[];
  try {
    images = await pdfToImages(pdfBase64);
    if (images.length === 0) {
      console.error("No images extracted from PDF");
      return null;
    }
    console.log(`Extracted ${images.length} images from PDF`);
  } catch (error) {
    console.error("Error converting PDF to images:", error);
    return null;
  }

  // Use OpenRouter Qwen-VL to transcribe images
  console.log("Attempting OpenRouter Qwen-VL API call for image transcription");

  try {
    // Build the content array with prompt text and all images
    const contentParts: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    > = [
      {
        type: "text",
        text: prompt,
      },
      ...images.map((imageDataUri) => ({
        type: "image_url" as const,
        image_url: {
          url: imageDataUri,
        },
      })),
    ];

    const result = await openRouter.chat.completions.create({
      model: "qwen/qwen3-vl-8b-instruct",
      messages: [
        {
          role: "user",
          content: contentParts,
        },
      ],
      max_tokens: 16000,
    });

    const text = result.choices[0]?.message?.content;

    console.log(
      `SUCCESS: OpenRouter Qwen-VL API call succeeded for page ${startingPage}.`
    );
    console.log("Response Text Length:", text?.length ?? 0);

    if (text === undefined || text === null) {
      console.warn(
        "Response text was undefined or null, returning empty content."
      );
      return "";
    }

    return text;
  } catch (error) {
    console.error("FAILURE: OpenRouter Qwen-VL API call failed.");
    if (error instanceof Error) {
      console.error("Error Message:", error.message);
      if (
        error.message.includes("429") ||
        error.message.includes("RESOURCE_EXHAUSTED")
      ) {
        console.error("Reason: Rate limit likely exceeded.");
      }
    } else {
      console.error("An unknown error occurred:", error);
    }
  }

  // ── Fallback 2: Gemini with native PDF support ──
  console.log("OpenRouter failed, trying Gemini fallback with native PDF...");
  const apiKeys = getApiKeys();
  const totalKeys = apiKeys.length;
  const startIndex = Math.floor(Math.random() * totalKeys);

  const fileDataPart = {
    inlineData: {
      mimeType: "application/pdf",
      data: pdfBase64,
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

      console.log(
        `SUCCESS: Gemini API call succeeded for page ${startingPage}.`
      );
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

  console.error("All API attempts failed. Unable to process the PDF.");
  return null;
}

export async function processPdfAndConvertToText(
  pdfBase64Array: string[]
): Promise<string | null> {
  if (!pdfBase64Array.length) {
    console.error("processPdfAndConvertToText received no valid files.");
    return null;
  }

  console.log(`Processing ${pdfBase64Array.length} PDF(s)`);

  try {
    // Merge all PDFs into one document
    const mergedPdfDoc = await PDFDocument.create();

    for (let idx = 0; idx < pdfBase64Array.length; idx++) {
      const base64 = pdfBase64Array[idx];
      const pdfBytes = Buffer.from(base64, "base64");
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pageIndices = Array.from(
        { length: pdfDoc.getPageCount() },
        (_, i) => i
      );
      const copiedPages = await mergedPdfDoc.copyPages(pdfDoc, pageIndices);
      copiedPages.forEach((page) => mergedPdfDoc.addPage(page));
      console.log(`Merged PDF ${idx + 1} (${pdfDoc.getPageCount()} pages)`);
    }

    const mergedPdfBytes = await mergedPdfDoc.save();
    const mergedBase64 = Buffer.from(mergedPdfBytes).toString("base64");
    const pageCount = mergedPdfDoc.getPageCount();

    console.log(`Total merged PDF has ${pageCount} pages`);

    // If small PDF, process directly
    let chunkSize = Math.ceil(pageCount / 10);
    if (chunkSize < 3) chunkSize = 3;

    if (pageCount <= chunkSize) {
      console.log("PDF is small, converting directly without splitting.");
      return await pdfToText(mergedBase64, 1);
    }

    // Process in chunks for large PDFs
    const textExtractionPromises: Promise<{
      index: number;
      text: string | null;
    }>[] = [];

    for (let i = 0; i < pageCount; i += chunkSize) {
      const chunkIndex = i / chunkSize;

      const task = (async () => {
        const newPdfDoc = await PDFDocument.create();
        const startPage = i;
        const endPage = Math.min(i + chunkSize, pageCount);
        const pageIndices = Array.from(
          { length: endPage - startPage },
          (_, k) => startPage + k
        );

        const copiedPages = await newPdfDoc.copyPages(
          mergedPdfDoc,
          pageIndices
        );
        copiedPages.forEach((page) => newPdfDoc.addPage(page));

        const chunkPdfBytes = await newPdfDoc.save();
        const chunkBase64 = Buffer.from(chunkPdfBytes).toString("base64");

        const extractedText = await pdfToText(chunkBase64, i + 1);
        return { index: chunkIndex, text: extractedText };
      })();

      textExtractionPromises.push(task);
    }

    console.log(
      `Waiting for ${textExtractionPromises.length} chunks to be processed...`
    );
    const processedChunks = await Promise.all(textExtractionPromises);
    console.log("All chunks have been processed.");

    processedChunks.sort((a, b) => a.index - b.index);

    const fullText = processedChunks
      .filter((chunk) => chunk.text !== null)
      .map((chunk) => chunk.text)
      .join("\n\n");

    console.log("Full text length:", fullText.length);
    return fullText;
  } catch (error) {
    console.error("Failed to process the PDF:", error);
    return null;
  }
}
