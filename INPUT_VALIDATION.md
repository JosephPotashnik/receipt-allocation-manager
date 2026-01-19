# INPUT_VALIDATION.md - Input Validation Rules

## Overview

This document defines all input validation rules for the Receipt Allocation Manager. All validations are implemented using **Zod** schemas for runtime type safety.

---

## 1. Authentication Inputs

### 1.1 Email Address

| Rule | Specification |
|------|---------------|
| Required | Yes |
| Format | Valid email format (RFC 5322) |
| Max Length | 254 characters |
| Case Sensitivity | Case-insensitive (normalized to lowercase) |

**Zod Schema**:
```typescript
const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .max(254, 'Email is too long')
  .email('Invalid email format')
  .transform(val => val.toLowerCase().trim());
```

**Error Messages**:
- `"Email is required"` - Empty input
- `"Invalid email format"` - Malformed email
- `"Email is too long"` - Exceeds 254 characters

### 1.2 Password

| Rule | Specification |
|------|---------------|
| Required | Yes |
| Min Length | 8 characters |
| Max Length | 128 characters |
| Complexity | At least 1 uppercase, 1 lowercase, 1 number |

**Zod Schema**:
```typescript
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');
```

**Error Messages**:
- `"Password must be at least 8 characters"`
- `"Password must contain at least one uppercase letter"`
- `"Password must contain at least one lowercase letter"`
- `"Password must contain at least one number"`

---

## 2. File Upload Validation

### 2.1 File Metadata

| Rule | Specification |
|------|---------------|
| Required | Yes |
| Max Size | 5 MB (5,242,880 bytes) |
| Allowed Extensions | `.txt` |
| MIME Types | `text/plain` |

**Validation Logic**:
```typescript
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = ['.txt'];
const ALLOWED_MIME_TYPES = ['text/plain'];

function validateFileMetadata(file: File): ValidationResult {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File size exceeds 5MB limit' };
  }

  const extension = file.name.substring(file.name.lastIndexOf('.'));
  if (!ALLOWED_EXTENSIONS.includes(extension.toLowerCase())) {
    return { valid: false, error: 'Only .txt files are allowed' };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid file type' };
  }

  return { valid: true };
}
```

**Error Messages**:
- `"File size exceeds 5MB limit"`
- `"Only .txt files are allowed"`
- `"Invalid file type"`
- `"No file selected"`

### 2.2 File Content (PCN874 Format)

| Rule | Specification |
|------|---------------|
| Encoding | UTF-8 or ASCII |
| Min Rows | 1 (at least 1 data row) |
| Max Rows | 50,000 |
| Data Rows | Start with a single letter (any letter A-Z) |
| Row Length | All data rows must have consistent length |

**Note**: The file may contain header/footer rows, but they are not required. The parser identifies receipt rows by checking if they start with a letter and contain a '+' separator.

**Zod Schema**:
```typescript
const fileContentSchema = z
  .string()
  .min(1, 'File is empty')
  .refine(
    (content) => {
      const lines = content.trim().split(/\r?\n/);
      return lines.length >= 1;
    },
    'File must contain at least 1 row'
  )
  .refine(
    (content) => {
      const lines = content.trim().split(/\r?\n/);
      // At least one line must be a valid data row (starts with letter, contains '+')
      return lines.some(line => /^[A-Z]/i.test(line) && line.includes('+'));
    },
    'File must contain at least one valid receipt row'
  )
  .refine(
    (content) => {
      const lines = content.trim().split(/\r?\n/);
      return lines.length <= 50000;
    },
    'File exceeds maximum of 50,000 rows'
  );
```

**Error Messages**:
- `"File is empty"`
- `"File must contain at least one valid receipt row"`
- `"File exceeds maximum of 50,000 rows"`

---

## 3. Receipt Row Validation

### 3.1 Row Structure

| Field | Position | Length | Validation |
|-------|----------|--------|------------|
| Row Type | 1 | 1 | Any letter (A-Z) |
| Business Number | 2-10 | 9 | Numeric only |
| Year | 11-14 | 4 | Valid year (1900-2100) |
| Month | 15-16 | 2 | 01-12 |
| Day | 17-18 | 2 | 01-31 |
| Receipt Number | 19 to (plusIndex-9) | Variable | Numeric, extracted by scanning backwards from VAT to first '0' |
| VAT | 9 before '+' | 9 | Numeric only |
| '+' Separator | Variable | 1 | Must exist in row |
| Sum Without VAT | 10 after '+' | 10 | Numeric only |
| Allocation | Last 9 | 9 | Numeric only |

### 3.2 Receipt Number Extraction Algorithm

The receipt number is located between the date (position 18) and the VAT (9 digits before '+').

**Extraction Steps**:
1. Find the '+' separator position
2. The 9 digits immediately before '+' are the VAT
3. Everything between position 18 and the VAT contains zero-padding + receipt number
4. Scan backwards from the VAT start position until you hit a '0' that is part of zero-padding
5. The non-zero digits (and any trailing zeros that are part of the number) form the receipt number

**Example**: `R424673351202511020014000000000000000719+0000000000000000000`
- Position of '+': 46
- VAT (positions 37-45): `000000719`
- Between date and VAT (positions 18-36): `0014000000000000000`
- Receipt number extracted: `14` (scan backwards, skip leading zeros)

**Zod Schema**:
```typescript
const receiptRowSchema = z.string().refine(
  (row) => {
    // Must start with a letter (any letter A-Z)
    if (!/^[A-Z]/i.test(row)) return false;

    // Must contain '+' separator
    const plusIndex = row.indexOf('+');
    if (plusIndex === -1) return false;

    // Business number (positions 2-10, 9 digits)
    const businessNumber = row.substring(1, 10);
    if (!/^\d{9}$/.test(businessNumber)) return false;

    // Year (positions 11-14)
    const year = parseInt(row.substring(10, 14), 10);
    if (year < 1900 || year > 2100) return false;

    // Month (positions 15-16)
    const month = parseInt(row.substring(14, 16), 10);
    if (month < 1 || month > 12) return false;

    // Day (positions 17-18)
    const day = parseInt(row.substring(16, 18), 10);
    if (day < 1 || day > 31) return false;

    // VAT (9 digits before '+')
    const vat = row.substring(plusIndex - 9, plusIndex);
    if (!/^\d{9}$/.test(vat)) return false;

    // Receipt number extraction: between position 18 and VAT start
    const receiptSection = row.substring(18, plusIndex - 9);
    // Must be all digits (zero-padded receipt number)
    if (!/^\d+$/.test(receiptSection)) return false;
    // Extract actual receipt number by removing leading zeros
    const receiptNumber = receiptSection.replace(/^0+/, '') || '0';

    // Sum without VAT (10 digits after '+')
    const sumWithoutVat = row.substring(plusIndex + 1, plusIndex + 11);
    if (!/^\d{10}$/.test(sumWithoutVat)) return false;

    // Allocation number (last 9 digits)
    const allocation = row.substring(row.length - 9);
    if (!/^\d{9}$/.test(allocation)) return false;

    return true;
  },
  'Invalid receipt row format'
);
```

### 3.3 Parsing Function

```typescript
function parseReceiptRow(row: string, rowIndex: number): IReceipt | null {
  // Must start with a letter
  if (!/^[A-Z]/i.test(row)) return null;

  const plusIndex = row.indexOf('+');
  if (plusIndex === -1) return null;

  const rowType = row[0];
  const businessNumber = row.substring(1, 10);
  const year = parseInt(row.substring(10, 14), 10);
  const month = parseInt(row.substring(14, 16), 10);
  const day = parseInt(row.substring(16, 18), 10);

  // VAT: 9 digits before '+'
  const vatString = row.substring(plusIndex - 9, plusIndex);
  const vatAmount = parseInt(vatString, 10);

  // Receipt number: between position 18 and VAT, remove leading zeros
  const receiptSection = row.substring(18, plusIndex - 9);
  const receiptNumber = receiptSection.replace(/^0+/, '') || '0';

  // Sum without VAT: 10 digits after '+'
  const sumString = row.substring(plusIndex + 1, plusIndex + 11);
  const sumWithoutVat = parseInt(sumString, 10);

  // Allocation: last 9 digits
  const allocationNumber = row.substring(row.length - 9);

  return {
    rowIndex,
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
}
```

**Error Messages**:
- `"Row does not start with a letter"`
- `"Missing '+' separator in row"`
- `"Invalid business number (must be 9 digits)"`
- `"Invalid year"`
- `"Invalid month (must be 01-12)"`
- `"Invalid day (must be 01-31)"`
- `"Invalid receipt number section"`
- `"Invalid VAT format (must be 9 digits)"`
- `"Invalid sum format (must be 10 digits)"`
- `"Invalid allocation format (must be 9 digits)"`

---

## 4. Search Input Validation

### 4.1 Receipt Number

| Rule | Specification |
|------|---------------|
| Required | Yes |
| Format | Numeric string |
| Min Length | 1 digit |
| Max Length | 20 digits |
| Leading Zeros | Allowed but stripped for comparison |

**Zod Schema**:
```typescript
const receiptNumberSchema = z
  .string()
  .min(1, 'Receipt number is required')
  .max(20, 'Receipt number is too long')
  .regex(/^\d+$/, 'Receipt number must contain only digits');
```

**Error Messages**:
- `"Receipt number is required"`
- `"Receipt number must contain only digits"`
- `"Receipt number is too long"`

### 4.2 Business Number

| Rule | Specification |
|------|---------------|
| Required | Only when receipt number is not unique |
| Format | Exactly 9 numeric digits |

**Zod Schema**:
```typescript
const businessNumberSchema = z
  .string()
  .length(9, 'Business number must be exactly 9 digits')
  .regex(/^\d{9}$/, 'Business number must contain only digits');
```

**Error Messages**:
- `"Business number must be exactly 9 digits"`
- `"Business number must contain only digits"`

---

## 5. Allocation Number Validation

### 5.1 Allocation Number

| Rule | Specification |
|------|---------------|
| Required | Yes |
| Format | Exactly 9 numeric digits |
| Padding | Left-pad with zeros if less than 9 digits entered |

**Zod Schema**:
```typescript
const allocationNumberSchema = z
  .string()
  .min(1, 'Allocation number is required')
  .max(9, 'Allocation number must not exceed 9 digits')
  .regex(/^\d+$/, 'Allocation number must contain only digits')
  .transform(val => val.padStart(9, '0')); // Left-pad with zeros
```

**Error Messages**:
- `"Allocation number is required"`
- `"Allocation number must contain only digits"`
- `"Allocation number must not exceed 9 digits"`

---

## 6. API Request Validation

### 6.1 Parse Request

**Zod Schema**:
```typescript
const parseRequestSchema = z.object({
  fileContent: fileContentSchema,
  fileName: z.string().min(1, 'File name is required'),
});
```

### 6.2 Update Receipt Request

**Zod Schema**:
```typescript
const updateReceiptRequestSchema = z.object({
  fileContent: z.string().min(1, 'File content is required'),
  rowIndex: z.number().int().min(0, 'Invalid row index'),
  allocationNumber: allocationNumberSchema,
});
```

---

## 7. Validation Error Response Format

All validation errors are returned in a consistent format:

```typescript
interface ValidationError {
  success: false;
  error: string;           // User-friendly message
  code: string;            // Machine-readable code
  field?: string;          // Which field failed (if applicable)
  details?: ZodError[];    // Detailed Zod errors (development only)
}
```

**Example Response**:
```json
{
  "success": false,
  "error": "Allocation number must be exactly 9 digits",
  "code": "VALIDATION_ERROR",
  "field": "allocationNumber"
}
```

---

## 8. Client-Side vs Server-Side Validation

| Validation | Client-Side | Server-Side |
|------------|-------------|-------------|
| Email format | ✅ | ✅ |
| Password strength | ✅ | ✅ |
| File size | ✅ | ✅ |
| File extension | ✅ | ✅ |
| File content format | ❌ | ✅ |
| Receipt row parsing | ❌ | ✅ |
| Receipt number format | ✅ | ✅ |
| Business number format | ✅ | ✅ |
| Allocation number format | ✅ | ✅ |
| JWT token validity | ❌ | ✅ |

**Important**: Server-side validation is **always** performed regardless of client-side validation. Client-side validation is for UX improvement only.

---

## 9. Sanitization Rules

### 9.1 String Inputs
- Trim leading/trailing whitespace
- Remove null bytes
- Normalize Unicode (NFC)

### 9.2 File Content
- Normalize line endings to `\n`
- Remove BOM (Byte Order Mark) if present
- Validate character encoding (reject non-UTF8/ASCII)

### 9.3 Numeric Strings
- Strip leading zeros for comparison (except when storing)
- Reject non-numeric characters

---

## 10. Rate Limiting (API Protection)

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /api/auth/login | 5 attempts | 15 minutes |
| POST /api/auth/signup | 3 attempts | 1 hour |
| POST /api/parse | 10 requests | 1 minute |
| POST /api/update-receipt | 60 requests | 1 minute |

**Error Response** (429 Too Many Requests):
```json
{
  "success": false,
  "error": "Too many requests. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 900
}
```
