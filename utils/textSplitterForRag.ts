/**
 * Splits text into chunks based on markdown headers for RAG processing.
 * Ensures chunks don't exceed maxLength while preserving document structure.
 */
export default function textSplitterForRag(
  text: string,
  maxLength = 4000
): string[] {
  const headers = ["\n# ", "\n## ", "\n### ", "\n#### "];

  function splitByHeader(content: string, headerLevel: number): string[] {
    // If content is within limit, return it as is
    if (content.length <= maxLength) {
      return [content];
    }

    // If we've exhausted all header levels, return as single chunk (even if > maxLength)
    if (headerLevel >= headers.length) {
      return [content];
    }

    // Split by current header level
    const header = headers[headerLevel];
    const parts = content.split(new RegExp(`(?=${header})`));

    // If no split occurred (no headers found at this level), try next level
    if (parts.length === 1) {
      return splitByHeader(content, headerLevel + 1);
    }

    const result: string[] = [];
    let accumulated = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      // If this single part is too large, recursively split it with next header level
      if (part.length > maxLength) {
        // First, flush any accumulated content
        if (accumulated) {
          result.push(accumulated);
          accumulated = "";
        }
        // Then recursively split this large part with deeper headers
        result.push(...splitByHeader(part, headerLevel + 1));
      }
      // If adding this part would exceed limit, flush accumulated and start new
      else if (accumulated && accumulated.length + part.length > maxLength) {
        result.push(accumulated);
        accumulated = part;
      }
      // Accumulate parts that fit together
      else {
        accumulated += part;
      }
    }

    // Don't forget the last accumulated part
    if (accumulated) {
      result.push(accumulated);
    }

    return result;
  }

  return splitByHeader(text, 0);
}
