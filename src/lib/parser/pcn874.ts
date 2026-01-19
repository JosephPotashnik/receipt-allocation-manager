import type { IReceipt } from '@/types';

/**
 * Check if a line is a receipt row (data row)
 * Receipt rows start with a letter (A-Z) and contain '+' separator
 */
export function isReceiptRow(line: string): boolean {
  return /^[A-Z]/i.test(line) && line.includes('+');
}

/**
 * Parse a single receipt row from PCN874 format
 *
 * Row structure (example):
 * R424673351202511020014000000000000000719+0000000000000000000
 * │└────────┘└──┘││└──┘└─────────────┘└───┘│└────────┘└───────┘
 * │    │      │  ││  │        │        │   │    │         │
 * │ Business Year││Day│   Zero-pad   VAT  +  Sum    Allocation
 * │  Number     ││   Receipt#              Without    (9 digits)
 * │            Month                        VAT
 * Row Type (any letter)
 *
 * Position breakdown (1-indexed as in docs, 0-indexed in code):
 * - Position 1 (index 0): Row Type (single letter)
 * - Position 2-10 (index 1-9): Business Number (9 digits)
 * - Position 11-14 (index 10-13): Year (4 digits)
 * - Position 15-16 (index 14-15): Month (2 digits)
 * - Position 17-18 (index 16-17): Day (2 digits)
 * - Position 19 to (plusIndex-9) (index 18 to plusIndex-10): Receipt number section (zero-padded)
 * - 9 digits before '+': VAT Amount
 * - '+' separator
 * - 10 digits after '+': Sum without VAT
 * - Last 9 digits: Allocation number
 */
export function parseReceiptRow(
  row: string,
  rowIndex: number,
  lineNumber: number
): IReceipt | null {
  // Must start with a letter
  if (!/^[A-Z]/i.test(row)) return null;

  const plusIndex = row.indexOf('+');
  if (plusIndex === -1) return null;

  // Validate minimum row length
  // Minimum: 1 (type) + 9 (business) + 4 (year) + 2 (month) + 2 (day) + 9 (VAT) + 1 (+) + 10 (sum) + 9 (alloc) = 47
  if (row.length < 47) return null;

  try {
    const rowType = row[0];

    // Business number: positions 2-10 (index 1-9)
    const businessNumber = row.substring(1, 10);
    if (!/^\d{9}$/.test(businessNumber)) return null;

    // Year: positions 11-14 (index 10-13)
    const yearStr = row.substring(10, 14);
    if (!/^\d{4}$/.test(yearStr)) return null;
    const year = parseInt(yearStr, 10);
    if (year < 1900 || year > 2100) return null;

    // Month: positions 15-16 (index 14-15)
    const monthStr = row.substring(14, 16);
    if (!/^\d{2}$/.test(monthStr)) return null;
    const month = parseInt(monthStr, 10);
    if (month < 1 || month > 12) return null;

    // Day: positions 17-18 (index 16-17)
    const dayStr = row.substring(16, 18);
    if (!/^\d{2}$/.test(dayStr)) return null;
    const day = parseInt(dayStr, 10);
    if (day < 1 || day > 31) return null;

    // VAT: 9 digits immediately before '+'
    const vatStartIndex = plusIndex - 9;
    if (vatStartIndex < 18) return null; // VAT can't start before position 19
    const vatString = row.substring(vatStartIndex, plusIndex);
    if (!/^\d{9}$/.test(vatString)) return null;
    const vatAmount = parseInt(vatString, 10);

    // Receipt number: between position 19 (index 18) and VAT start
    const receiptSection = row.substring(18, vatStartIndex);
    // Receipt section can be empty in some edge cases, or contain digits
    if (receiptSection.length > 0 && !/^\d+$/.test(receiptSection)) return null;
    // Remove leading zeros to get actual receipt number
    const receiptNumber = receiptSection.replace(/^0+/, '') || '0';

    // Sum without VAT: 10 digits immediately after '+'
    const sumString = row.substring(plusIndex + 1, plusIndex + 11);
    if (!/^\d{10}$/.test(sumString)) return null;
    const sumWithoutVat = parseInt(sumString, 10);

    // Allocation number: last 9 digits
    const allocationNumber = row.substring(row.length - 9);
    if (!/^\d{9}$/.test(allocationNumber)) return null;

    return {
      rowIndex,
      lineNumber,
      rawRow: row,
      rowType,
      businessNumber,
      year,
      month,
      day,
      receiptNumber,
      vatAmount,
      sumWithoutVat,
      allocationNumber,
    };
  } catch {
    return null;
  }
}

/**
 * Parse result from parsing an entire file
 */
export interface ParseResult {
  receipts: IReceipt[];
  errors: string[];
  lineMap: Map<number, number>; // Maps row index to original line number
}

/**
 * Parse an entire PCN874 file
 */
export function parseFile(content: string): ParseResult {
  const receipts: IReceipt[] = [];
  const errors: string[] = [];
  const lineMap = new Map<number, number>();

  // Normalize line endings and remove BOM if present
  const normalizedContent = content
    .replace(/^\uFEFF/, '') // Remove BOM
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const lines = normalizedContent.split('\n');

  let receiptIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNumber = i + 1; // 1-indexed line number

    // Skip empty lines
    if (!line) continue;

    // Check if this is a receipt row
    if (isReceiptRow(line)) {
      const receipt = parseReceiptRow(line, receiptIndex, lineNumber);
      if (receipt) {
        receipts.push(receipt);
        lineMap.set(receiptIndex, lineNumber);
        receiptIndex++;
      } else {
        errors.push(`Line ${lineNumber}: Invalid receipt row format`);
      }
    }
    // Non-receipt rows (header, footer, etc.) are ignored but not errors
  }

  if (receipts.length === 0 && errors.length === 0) {
    errors.push('No valid receipt rows found in file');
  }

  return { receipts, errors, lineMap };
}

/**
 * Update the allocation number for a specific receipt in the file content
 * Returns the modified file content
 */
export function updateAllocation(
  content: string,
  lineNumber: number,
  allocationNumber: string
): string {
  // Validate allocation number (should be exactly 9 digits)
  if (!/^\d{9}$/.test(allocationNumber)) {
    throw new Error('Allocation number must be exactly 9 digits');
  }

  // Normalize line endings
  const normalizedContent = content
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const lines = normalizedContent.split('\n');
  const lineIndex = lineNumber - 1; // Convert to 0-indexed

  if (lineIndex < 0 || lineIndex >= lines.length) {
    throw new Error(`Line ${lineNumber} not found in file`);
  }

  const originalLine = lines[lineIndex];

  // Verify it's a valid receipt row
  if (!isReceiptRow(originalLine)) {
    throw new Error(`Line ${lineNumber} is not a valid receipt row`);
  }

  // Replace the last 9 characters with the new allocation number
  const modifiedLine =
    originalLine.substring(0, originalLine.length - 9) + allocationNumber;

  lines[lineIndex] = modifiedLine;

  // Return with original line ending style
  const hasWindowsLineEndings = content.includes('\r\n');
  return lines.join(hasWindowsLineEndings ? '\r\n' : '\n');
}

/**
 * Search for receipts by receipt number
 */
export function searchByReceiptNumber(
  receipts: IReceipt[],
  receiptNumber: string
): IReceipt[] {
  // Normalize the search input (remove leading zeros for comparison)
  const normalizedSearch = receiptNumber.replace(/^0+/, '') || '0';

  return receipts.filter(
    (receipt) => receipt.receiptNumber === normalizedSearch
  );
}

/**
 * Search for a specific receipt by receipt number and business number
 */
export function searchByReceiptAndBusiness(
  receipts: IReceipt[],
  receiptNumber: string,
  businessNumber: string
): IReceipt | null {
  const normalizedSearch = receiptNumber.replace(/^0+/, '') || '0';

  const match = receipts.find(
    (receipt) =>
      receipt.receiptNumber === normalizedSearch &&
      receipt.businessNumber === businessNumber
  );

  return match || null;
}

/**
 * Format a receipt for display
 */
export function formatReceiptForDisplay(receipt: IReceipt): {
  businessNumber: string;
  date: string;
  receiptNumber: string;
  vatAmount: string;
  sumWithoutVat: string;
  allocationNumber: string;
} {
  // Format VAT and sum as currency (divide by 100 to convert from agorot to shekels)
  const vatFormatted = (receipt.vatAmount / 100).toFixed(2);
  const sumFormatted = (receipt.sumWithoutVat / 100).toFixed(2);

  // Format date
  const date = `${receipt.year}-${String(receipt.month).padStart(2, '0')}-${String(receipt.day).padStart(2, '0')}`;

  return {
    businessNumber: receipt.businessNumber,
    date,
    receiptNumber: receipt.receiptNumber,
    vatAmount: vatFormatted,
    sumWithoutVat: sumFormatted,
    allocationNumber: receipt.allocationNumber,
  };
}
