import { task } from "@trigger.dev/sdk/v3";
import { execSync } from "child_process";
import fs from "node:fs";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";

export const pdfToImageConverter = task({
  id: "pdf-to-image",
  run: async (payload: { pdfBase64: string }) => {
    console.log("Starting PDF to image conversion");

    // Create a unique temporary directory for this run
    const runId = uuidv4();
    const tmpDir = path.join("/tmp", runId);
    fs.mkdirSync(tmpDir, { recursive: true });

    const inputPdfPath = path.join(tmpDir, "input.pdf");
    const outputPattern = path.join(tmpDir, "page-%d.png");

    try {
      // 1. Write the base64 PDF to a file
      const buffer = Buffer.from(payload.pdfBase64, "base64");
      fs.writeFileSync(inputPdfPath, buffer);

      // 2. Use mutool to convert PDF to PNGs
      // -r 300 sets the resolution (DPI). Adjust as needed (e.g., scale=3 approx 216 dpi)
      execSync(`mutool draw -o "${outputPattern}" -r 216 "${inputPdfPath}"`);

      // 3. Read the generated images back into base64
      const files = fs.readdirSync(tmpDir).filter((f) => f.endsWith(".png"));
      // Sort files numerically to ensure page order (page-1, page-2, etc.)
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
  },
});
