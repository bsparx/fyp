/**
 * Utility functions for parsing medical reports and extracting key-value pairs
 */

export interface ReportKeyValue {
  key: string;
  value: string;
  unit: string | null;
}

export interface ParsedReport {
  hospitalName: string | null;
  reportDate: Date | null;
  keyValues: ReportKeyValue[];
}

/**
 * Parse extracted text from a medical report and extract key-value pairs
 * All keys and units are converted to uppercase for standardization
 */
export function parseReportText(text: string): ParsedReport {
  const hospitalName = extractHospitalName(text);
  const reportDate = extractReportDate(text);
  const keyValues = extractKeyValues(text);

  return {
    hospitalName: hospitalName ? hospitalName.toUpperCase() : null,
    reportDate,
    keyValues,
  };
}

/**
 * Extract hospital/lab name from the report text
 */
function extractHospitalName(text: string): string | null {
  // Common patterns for hospital/lab names
  const patterns = [
    /(?:processed\s*at|lab(?:oratory)?|hospital|clinic|center|centre)\s*:?\s*([^\n]+)/i,
    /^([A-Z][A-Za-z\s]+(?:Hospital|Lab|Laboratory|Clinic|Diagnostics|Healthcare|Medical|Center|Centre))/im,
    /(?:thyrocare|apollo|metropolis|dr\.?\s*lal|quest|labcorp|srl|medall|narayana|fortis|max|manipal)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Clean up the match
      let name = match[1] || match[0];
      name = name.replace(/[,\.\:]+$/, "").trim();
      // Limit length
      if (name.length > 100) {
        name = name.substring(0, 100);
      }
      return name;
    }
  }

  // Try to find from the first few lines
  const lines = text.split("\n").slice(0, 5);
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.length > 3 &&
      trimmed.length < 100 &&
      /^[A-Z]/.test(trimmed) &&
      !/^(name|date|ref|test|patient|sample|report)/i.test(trimmed)
    ) {
      return trimmed;
    }
  }

  return null;
}

/**
 * Extract the report date from the text
 */
function extractReportDate(text: string): Date | null {
  // Common date patterns in medical reports
  const datePatterns = [
    // DD MMM YYYY format (e.g., "03 Nov 2023")
    /(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{4})/i,
    // YYYY-MM-DD format
    /(\d{4})-(\d{1,2})-(\d{1,2})/,
    // DD/MM/YYYY or DD-MM-YYYY format
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    // MM/DD/YYYY format (US)
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
  ];

  // Look for date labels
  const labeledDatePattern =
    /(?:sample\s*collected|collected\s*on|report\s*date|date|released\s*on)\s*:?\s*(\d{1,2}[\s\/\-][a-z0-9]+[\s\/\-]\d{2,4})/i;
  const labelMatch = text.match(labeledDatePattern);
  if (labelMatch) {
    const parsed = parseDate(labelMatch[1]);
    if (parsed) return parsed;
  }

  // Try each pattern
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      const parsed = parseDateMatch(match);
      if (parsed) return parsed;
    }
  }

  return null;
}

/**
 * Parse a date string into a Date object
 */
function parseDate(dateStr: string): Date | null {
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch {
    // Continue with manual parsing
  }

  // Try DD MMM YYYY format
  const monthMap: { [key: string]: number } = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };

  const match = dateStr.match(/(\d{1,2})\s*([a-z]+)\s*(\d{4})/i);
  if (match) {
    const day = parseInt(match[1]);
    const month = monthMap[match[2].toLowerCase().substring(0, 3)];
    const year = parseInt(match[3]);
    if (month !== undefined) {
      return new Date(year, month, day);
    }
  }

  return null;
}

/**
 * Parse a regex match into a Date object
 */
function parseDateMatch(match: RegExpMatchArray): Date | null {
  try {
    // Check for month name format
    const monthMap: { [key: string]: number } = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dec: 11,
    };

    if (match[2] && isNaN(parseInt(match[2]))) {
      const day = parseInt(match[1]);
      const month = monthMap[match[2].toLowerCase().substring(0, 3)];
      const year = parseInt(match[3]);
      if (month !== undefined) {
        return new Date(year, month, day);
      }
    }

    // Check for YYYY-MM-DD format
    if (match[1].length === 4) {
      const year = parseInt(match[1]);
      const month = parseInt(match[2]) - 1;
      const day = parseInt(match[3]);
      return new Date(year, month, day);
    }

    // Check for DD/MM/YYYY or DD-MM-YYYY format
    const day = parseInt(match[1]);
    const month = parseInt(match[2]) - 1;
    let year = parseInt(match[3]);
    if (year < 100) {
      year += 2000;
    }

    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Extract key-value pairs from medical report text
 * Looks for test names followed by values and units
 */
function extractKeyValues(text: string): ReportKeyValue[] {
  const keyValues: ReportKeyValue[] = [];
  const lines = text.split("\n");

  // Common medical test patterns
  // Pattern: TEST_NAME ... VALUE UNIT
  const testPatterns = [
    // Vitamin D, hormones, etc. with numeric values
    /^(vitamin\s*[a-z0-9]+(?:\s+total)?|(?:t3|t4|tsh|hba1c|hemoglobin|haemoglobin|glucose|cholesterol|triglycerides|hdl|ldl|vldl|urea|creatinine|uric\s*acid|calcium|phosphorus|sodium|potassium|chloride|iron|ferritin|b12|folate|prolactin)(?:\s+\w+)?)\s*[:\.\-]?\s*([\d\.]+)\s*(ng\/ml|ng\/dl|mg\/dl|mmol\/l|µg\/dl|ug\/dl|pg\/ml|miu\/ml|u\/l|iu\/l|g\/dl|%|meq\/l|mcg\/dl|umol\/l)?/gi,
  ];

  // Generic pattern for "Key : Value Unit" format
  const genericPattern =
    /^([A-Za-z][A-Za-z0-9\s\-\/\(\)]+?)\s*[:\.\-\|]+\s*([\d\.,]+)\s*([a-zA-Z\/\%µ]+)?$/;

  // Pattern for tabular data (key followed by technology, then value, then unit)
  const tabularPattern =
    /^([A-Za-z][A-Za-z0-9\s\-\/]+?)\s+(?:LC-MS\/MS|ELISA|CLIA|ECLIA|[A-Z\-\/]+)\s+([\d\.]+)\s*(ng\/ml|ng\/dl|mg\/dl|mmol\/l|[a-zA-Z\/\%µ]+)?/i;

  const seenKeys = new Set<string>();

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.length < 3) continue;

    // Skip header/label lines
    if (
      /^(test\s*name|technology|value|units?|reference|normal|bio\.?\s*ref|method|sample|patient|name|date|page)/i.test(
        trimmedLine
      )
    ) {
      continue;
    }

    // Try specific medical test patterns
    for (const pattern of testPatterns) {
      pattern.lastIndex = 0; // Reset regex state
      const match = pattern.exec(trimmedLine);
      if (match) {
        const key = match[1].trim().toUpperCase();
        const value = match[2].trim();
        const unit = match[3] ? match[3].trim().toUpperCase() : null;

        if (!seenKeys.has(key) && !isNaN(parseFloat(value))) {
          keyValues.push({ key, value, unit });
          seenKeys.add(key);
        }
      }
    }

    // Try tabular pattern
    const tabularMatch = trimmedLine.match(tabularPattern);
    if (tabularMatch) {
      const key = tabularMatch[1].trim().toUpperCase();
      const value = tabularMatch[2].trim();
      const unit = tabularMatch[3]
        ? tabularMatch[3].trim().toUpperCase()
        : null;

      if (!seenKeys.has(key) && !isNaN(parseFloat(value))) {
        keyValues.push({ key, value, unit });
        seenKeys.add(key);
      }
      continue;
    }

    // Try generic pattern
    const genericMatch = trimmedLine.match(genericPattern);
    if (genericMatch) {
      const key = genericMatch[1].trim().toUpperCase();
      const value = genericMatch[2].trim().replace(",", ".");
      const unit = genericMatch[3]
        ? genericMatch[3].trim().toUpperCase()
        : null;

      // Filter out non-medical entries
      if (
        !seenKeys.has(key) &&
        !isNaN(parseFloat(value)) &&
        key.length > 1 &&
        key.length < 50 &&
        !/^(page|ref|id|code|barcode|patient)/i.test(key)
      ) {
        keyValues.push({ key, value, unit });
        seenKeys.add(key);
      }
    }
  }

  return keyValues;
}
