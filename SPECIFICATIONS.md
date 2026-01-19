# SPECIFICATIONS.md - Functional Requirements Document

## 1. Project Overview

**Receipt Allocation Manager** is a web application that allows authenticated users to:
1. Upload PCN874 format text files containing supplier receipt records
2. Search for specific supplier receipts (T rows) by receipt number (and business number if needed)
3. Assign allocation numbers to supplier receipts
4. Download the modified file

**Important**: Only rows beginning with the letter **'T'** are supplier rows that need to be processed. All other rows (R, S, header, footer, etc.) are left unchanged.

## 2. User Stories

### 2.1 Authentication
- **US-001**: ~~As a user, I can sign up with email and password~~ (Removed - users managed in Supabase)
- **US-002**: As a user, I can log in with my credentials
- **US-003**: As a user, I can log out from the application
- **US-004**: As an unauthenticated user, I am redirected to the login page when accessing protected routes

### 2.2 File Upload
- **US-005**: As a user, I can upload a PCN874 text file
- **US-006**: As a user, I see an error if the file format is invalid
- **US-007**: As a user, I see a success message when the file is parsed correctly
- **US-008**: As a user, I can see a summary of how many supplier receipts (T rows) were found in the file

### 2.3 Receipt Search
- **US-009**: As a user, I can search for a supplier receipt by receipt number
- **US-010**: As a user, if multiple supplier receipts share the same receipt number, I am prompted to enter the business number
- **US-011**: As a user, I see the supplier receipt details when a unique match is found
- **US-012**: As a user, I see an error if no supplier receipt matches my search

### 2.4 Allocation Assignment
- **US-013**: As a user, I can enter a 9-digit allocation number for a selected supplier receipt
- **US-014**: As a user, I see an error if the allocation number is not exactly 9 digits
- **US-015**: As a user, I see confirmation when the allocation is successfully applied
- **US-016**: As a user, I can apply allocations to multiple supplier receipts in the same session

### 2.5 File Download
- **US-017**: As a user, I can download the modified file
- **US-018**: As a user, I am warned that closing the browser will lose unsaved work
- **US-019**: As a user, the downloaded file has the same format as the original with only the allocation numbers of supplier receipts (T rows) changed

## 3. PCN874 File Format Specification

### 3.1 File Structure
```
[Header Row - O prefix]           - Optional, different format
[Non-supplier rows - R, S, etc.]  - Ignored for processing
[Supplier Row 1 - T prefix]       - **PROCESSED** - starts with 'T' and contains '+'
[Supplier Row 2 - T prefix]       - **PROCESSED** - starts with 'T' and contains '+'
...
[Supplier Row N - T prefix]       - **PROCESSED** - starts with 'T' and contains '+'
[Footer Row - X prefix]           - Optional, different format
```

**Important**: Only **T rows** (supplier rows) are processed for allocation management. All other rows are preserved but not parsed or modified.

### 3.2 Supplier Row Format (T Rows) - Fixed-Width

Total row length: **60 characters**

```
Position  | Length | Field Name           | Example
----------|--------|----------------------|------------------
1         | 1      | Row Type             | 'T' (supplier row)
2-10      | 9      | Business Number      | 000719567
11-14     | 4      | Year                 | 2025
15-16     | 2      | Month                | 11
17-18     | 2      | Day                  | 16
19-22     | 4      | Code                 | 0006 (purpose TBD)
23-31     | 9      | Receipt Number       | 000006394 (zero-padded)
32-40     | 9      | VAT Amount           | 000004576
41        | 1      | Separator            | '+'
42-51     | 10     | Sum Without VAT      | 0000025424
52-60     | 9      | Allocation Number    | 000006394 (to be replaced)
```

### 3.3 Parsing Algorithm (T Rows Only)

1. **Identify supplier rows**: Rows starting with letter 'T' and containing '+'
2. **Skip non-T rows**: All other rows (R, S, O, X, etc.) are ignored during parsing
3. **Extract fields at fixed positions**:
   - Business Number: positions 2-10 (index 1-9)
   - Year: positions 11-14 (index 10-13)
   - Month: positions 15-16 (index 14-15)
   - Day: positions 17-18 (index 16-17)
   - Receipt Number: positions 23-31 (index 22-30), remove leading zeros
   - VAT Amount: positions 32-40 (index 31-39)
   - Sum Without VAT: positions 42-51 (index 41-50)
   - Allocation Number: positions 52-60 (index 51-59), last 9 digits

### 3.4 Sample Supplier Row Analysis (T Row)

```
T000719567202511160006000006394000004576+0000025424000006394
│└────────┘└──┘││└──┘└────────┘└────────┘│└────────┘└────────┘
│    │      │  ││  │     │         │     │     │         │
│ Business Year││Day│  Receipt    VAT   +   Sum     Allocation
│  Number     ││   Code Number           Without    (9 digits)
│            Month                        VAT
Row Type ('T' = supplier)
```

### 3.5 Receipt Number Extraction (T Rows)

The receipt number is at a fixed position in T rows:
- **Positions 23-31 (index 22-30)**: 9-digit zero-padded receipt number
- **Example**: `000006394` → Receipt number is `6394`
- **Algorithm**: Extract 9 digits from fixed position, remove leading zeros

## 4. Data Types

### 4.1 IReceipt Interface

```typescript
interface IReceipt {
  rowIndex: number;           // Position in file (0-indexed)
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
```

### 4.2 IFileData Interface

```typescript
interface IFileData {
  fileName: string;
  originalContent: string;
  modifiedContent: string;
  receipts: IReceipt[];
  totalReceipts: number;
  modifiedCount: number;      // How many receipts have been modified
}
```

## 5. API Specifications

### 5.1 POST /api/parse

**Purpose**: Parse an uploaded PCN874 file

**Authentication**: Required (JWT in Authorization header)

**Request Body**:
```typescript
{
  fileContent: string;
  fileName: string;
}
```

**Success Response** (200):
```typescript
{
  success: true;
  data: {
    receipts: IReceipt[];
    totalReceipts: number;
  }
}
```

**Error Response** (400/401/500):
```typescript
{
  success: false;
  error: string;
  code: 'INVALID_FORMAT' | 'EMPTY_FILE' | 'NO_RECEIPTS' | 'PARSE_ERROR';
}
```

### 5.2 POST /api/update-receipt

**Purpose**: Update the allocation number for a specific receipt

**Authentication**: Required (JWT in Authorization header)

**Request Body**:
```typescript
{
  fileContent: string;        // Current file content
  rowIndex: number;           // Which receipt row to modify
  allocationNumber: string;   // New 9-digit allocation number
}
```

**Success Response** (200):
```typescript
{
  success: true;
  data: {
    modifiedContent: string;
    modifiedReceipt: IReceipt;
  }
}
```

**Error Response** (400/401/500):
```typescript
{
  success: false;
  error: string;
  code: 'INVALID_ALLOCATION' | 'ROW_NOT_FOUND' | 'UPDATE_ERROR';
}
```

## 6. UI/UX Requirements

### 6.1 Pages

| Page | Route | Description |
|------|-------|-------------|
| Login | `/login` | Email/password login form |
| Signup | `/signup` | Registration form |
| Dashboard | `/dashboard` | Main application page |

### 6.2 Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Header: Logo + User Email + Logout Button                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  File Upload Section                                 │   │
│  │  [Choose File] [Upload Button]                       │   │
│  │  Status: No file uploaded / File loaded (X receipts) │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Receipt Search Section                              │   │
│  │  Receipt Number: [___________] [Search]              │   │
│  │  Business Number: [___________] (shown if needed)    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Receipt Details & Allocation (shown when found)     │   │
│  │  Business: 424673351  Date: 2025-11-02              │   │
│  │  Receipt#: 14  VAT: 7.19  Sum: 0.00                 │   │
│  │  Current Allocation: 000000000                       │   │
│  │  New Allocation: [_________] [Apply]                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Download Section                                    │   │
│  │  Modified receipts: X                                │   │
│  │  [Download Modified File]                            │   │
│  │  ⚠️ Warning: Changes will be lost if not downloaded  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Responsive Design
- Mobile-friendly layout
- Minimum supported width: 320px
- Touch-friendly buttons and inputs

### 6.4 Accessibility
- ARIA labels on interactive elements
- Keyboard navigation support
- Color contrast compliance (WCAG AA)

## 7. Non-Functional Requirements

### 7.1 Performance
- File parsing: < 2 seconds for files up to 10,000 rows
- UI response time: < 100ms for user interactions
- API response time: < 500ms for all endpoints

### 7.2 Security
- All API routes require authentication
- JWT tokens expire after 1 hour
- No sensitive data stored on server
- HTTPS enforced in production

### 7.3 Browser Support
- Chrome (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Edge (last 2 versions)

### 7.4 File Size Limits
- Maximum file size: 5MB
- Maximum rows: 50,000

## 8. Future Considerations (Out of Scope for MVP)

- Batch allocation assignment
- Receipt history/audit log
- Multiple file comparison
- Export to Excel format
- Hebrew language UI support (RTL)
