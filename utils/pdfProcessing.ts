"use server";

import { PDFDocument } from "pdf-lib";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

const openRouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
});

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

export async function pdfToText(
  pdfBase64: string,
  startingPage: number
): Promise<string | null> {
  const prompt = initialExtractionPrompt(startingPage);
  const apiKeys = getApiKeys();
  const totalKeys = apiKeys.length;
  const startIndex = Math.floor(Math.random() * totalKeys);

  console.log(`Starting PDF extraction. Total keys: ${totalKeys}.`);

  const fileDataPart = {
    inlineData: {
      mimeType: "application/pdf",
      data: pdfBase64,
    },
  };

  // Try Gemini first
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

  // Fallback to OpenRouter
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
                url: `data:application/pdf;base64,${pdfBase64}`,
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
