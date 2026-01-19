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
      // At least one line must be a valid data row (starts with letter, contains '+')
      return lines.some((line) => /^[A-Z]/i.test(line) && line.includes('+'));
    },
    'File must contain at least one valid receipt row'
  )
  .refine(
    (content) => {
      const lines = content.trim().split(/\r?\n/);
      return lines.length <= MAX_ROWS;
    },
    `File exceeds maximum of ${MAX_ROWS} rows`
  );

// ============================================
// Receipt Row Validation
// ============================================

/**
 * Validates a single receipt row format
 */
export const receiptRowSchema = z.string().refine(
  (row) => {
    // Must start with a letter (any letter A-Z)
    if (!/^[A-Z]/i.test(row)) return false;

    // Must contain '+' separator
    const plusIndex = row.indexOf('+');
    if (plusIndex === -1) return false;

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

    // VAT (9 digits before '+')
    const vat = row.substring(plusIndex - 9, plusIndex);
    if (!/^\d{9}$/.test(vat)) return false;

    // Receipt number extraction: between position 18 and VAT start
    const receiptSection = row.substring(18, plusIndex - 9);
    // Must be all digits (zero-padded receipt number)
    if (receiptSection.length > 0 && !/^\d+$/.test(receiptSection)) return false;

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
