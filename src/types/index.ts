/**
 * Parsed receipt data from a PCN874 file row
 */
export interface IReceipt {
  rowIndex: number;           // Position in file (0-indexed, data rows only)
  lineNumber: number;         // Actual line number in file (1-indexed)
  rawRow: string;             // Original row string
  rowType: string;            // Single letter (A-Z) indicating row type
  businessNumber: string;     // 9 digits
  year: number;               // 4 digits (e.g., 2025)
  month: number;              // 1-12
  day: number;                // 1-31
  receiptNumber: string;      // Variable length, extracted from row (leading zeros removed)
  vatAmount: number;          // Integer (represented in agorot/cents)
  sumWithoutVat: number;      // Integer (represented in agorot/cents)
  allocationNumber: string;   // 9 digits (current value)
}

/**
 * In-memory file state
 */
export interface IFileData {
  fileName: string;
  originalContent: string;
  modifiedContent: string;
  receipts: IReceipt[];
  totalReceipts: number;
  modifiedCount: number;      // How many receipts have been modified
}

/**
 * Generic API response wrapper
 */
export interface IApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  field?: string;
}

/**
 * Parse API response data
 */
export interface IParseResponseData {
  receipts: IReceipt[];
  totalReceipts: number;
}

/**
 * Parse API response
 */
export type IParseResponse = IApiResponse<IParseResponseData>;

/**
 * Update receipt API response data
 */
export interface IUpdateResponseData {
  modifiedContent: string;
  modifiedReceipt: IReceipt;
}

/**
 * Update receipt API response
 */
export type IUpdateResponse = IApiResponse<IUpdateResponseData>;

/**
 * Error codes for API responses
 */
export type ParseErrorCode =
  | 'INVALID_FORMAT'
  | 'EMPTY_FILE'
  | 'NO_RECEIPTS'
  | 'PARSE_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED';

export type UpdateErrorCode =
  | 'INVALID_ALLOCATION'
  | 'ROW_NOT_FOUND'
  | 'UPDATE_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED';

/**
 * Search result types
 */
export interface ISearchResult {
  receipt: IReceipt | null;
  multipleMatches: IReceipt[] | null;
  error: string | null;
}

/**
 * App state for React context
 */
export interface IAppState {
  user: {
    id: string;
    email: string;
  } | null;
  isAuthenticated: boolean;
  fileData: IFileData | null;
  isLoading: boolean;
  error: string | null;
}
