import { z } from 'zod';

// ============================================
// Authentication Schemas
// ============================================

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .max(254, 'Email is too long')
  .email('Invalid email format')
  .transform((val) => val.toLowerCase().trim());

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// ============================================
// File Upload Schemas
// ============================================

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_ROWS = 50000;
export const ALLOWED_EXTENSIONS = ['.txt'];

export const fileContentSchema = z
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
      // At least one line must be a valid supplier row (starts with 'T', 60 chars, '+' at position 41)
      return lines.some((line) => /^T/i.test(line) && line.length === 60 && line[40] === '+');
    },
    'File must contain at least one valid supplier row (T row)'
  )
  .refine(
    (content) => {
      const lines = content.trim().split(/\r?\n/);
      return lines.length <= MAX_ROWS;
    },
    `File exceeds maximum of ${MAX_ROWS} rows`
  );

// ============================================
// Supplier Row Validation (T Rows Only)
// ============================================

/**
 * Validates a single supplier row (T row) format
 * T rows are exactly 60 characters with fixed field positions
 */
export const supplierRowSchema = z.string().refine(
  (row) => {
    // Must start with 'T' (supplier row)
    if (!/^T/i.test(row)) return false;

    // Must be exactly 60 characters
    if (row.length !== 60) return false;

    // Must have '+' at position 41 (index 40)
    if (row[40] !== '+') return false;

    // Business number (positions 2-10, 9 digits) - index 1-9
    const businessNumber = row.substring(1, 10);
    if (!/^\d{9}$/.test(businessNumber)) return false;

    // Year (positions 11-14) - index 10-13
    const year = parseInt(row.substring(10, 14), 10);
    if (year < 1900 || year > 2100) return false;

    // Month (positions 15-16) - index 14-15
    const month = parseInt(row.substring(14, 16), 10);
    if (month < 1 || month > 12) return false;

    // Day (positions 17-18) - index 16-17
    const day = parseInt(row.substring(16, 18), 10);
    if (day < 1 || day > 31) return false;

    // Code (positions 19-22) - index 18-21
    const code = row.substring(18, 22);
    if (!/^\d{4}$/.test(code)) return false;

    // Receipt number (positions 23-31) - index 22-30
    const receiptNumber = row.substring(22, 31);
    if (!/^\d{9}$/.test(receiptNumber)) return false;

    // VAT (positions 32-40) - index 31-39
    const vat = row.substring(31, 40);
    if (!/^\d{9}$/.test(vat)) return false;

    // Sum without VAT (positions 42-51) - index 41-50
    const sumWithoutVat = row.substring(41, 51);
    if (!/^\d{10}$/.test(sumWithoutVat)) return false;

    // Allocation number (positions 52-60) - index 51-59
    const allocation = row.substring(51, 60);
    if (!/^\d{9}$/.test(allocation)) return false;

    return true;
  },
  'Invalid supplier row format'
);

// Keep backward compatibility alias
export const receiptRowSchema = supplierRowSchema;

// ============================================
// Search Input Schemas
// ============================================

export const receiptNumberSearchSchema = z
  .string()
  .min(1, 'Receipt number is required')
  .max(20, 'Receipt number is too long')
  .regex(/^\d+$/, 'Receipt number must contain only digits');

export const businessNumberSchema = z
  .string()
  .length(9, 'Business number must be exactly 9 digits')
  .regex(/^\d{9}$/, 'Business number must contain only digits');

// ============================================
// Allocation Number Schema
// ============================================

export const allocationNumberSchema = z
  .string()
  .min(1, 'Allocation number is required')
  .max(9, 'Allocation number must not exceed 9 digits')
  .regex(/^\d+$/, 'Allocation number must contain only digits')
  .transform((val) => val.padStart(9, '0')); // Left-pad with zeros

// ============================================
// API Request Schemas
// ============================================

export const parseRequestSchema = z.object({
  fileContent: fileContentSchema,
  fileName: z.string().min(1, 'File name is required'),
});

export const updateReceiptRequestSchema = z.object({
  fileContent: z.string().min(1, 'File content is required'),
  rowIndex: z.number().int().min(0, 'Invalid row index'),
  allocationNumber: allocationNumberSchema,
});

// ============================================
// Type exports from schemas
// ============================================

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ParseRequest = z.infer<typeof parseRequestSchema>;
export type UpdateReceiptRequest = z.infer<typeof updateReceiptRequestSchema>;
