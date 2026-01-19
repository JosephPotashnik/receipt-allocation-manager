# SPECIFICATIONS.md - Functional Requirements Document

## 1. Project Overview

**Receipt Allocation Manager** is a web application that allows authenticated users to:
1. Upload PCN874 format receipt files
2. Search for specific receipts by receipt number (and business number if needed)
3. Assign allocation numbers to receipts
4. Download the modified file

## 2. User Stories

### 2.1 Authentication
- **US-001**: As a user, I can sign up with email and password
- **US-002**: As a user, I can log in with my credentials
- **US-003**: As a user, I can log out from the application
- **US-004**: As an unauthenticated user, I am redirected to the login page when accessing protected routes

### 2.2 File Upload
- **US-005**: As a user, I can upload a PCN874 text file
- **US-006**: As a user, I see an error if the file format is invalid
- **US-007**: As a user, I see a success message when the file is parsed correctly
- **US-008**: As a user, I can see a summary of how many receipts were found in the file

### 2.3 Receipt Search
- **US-009**: As a user, I can search for a receipt by receipt number
- **US-010**: As a user, if multiple receipts share the same receipt number, I am prompted to enter the business number
- **US-011**: As a user, I see the receipt details when a unique match is found
- **US-012**: As a user, I see an error if no receipt matches my search

### 2.4 Allocation Assignment
- **US-013**: As a user, I can enter a 9-digit allocation number for a selected receipt
- **US-014**: As a user, I see an error if the allocation number is not exactly 9 digits
- **US-015**: As a user, I see confirmation when the allocation is successfully applied
- **US-016**: As a user, I can apply allocations to multiple receipts in the same session

### 2.5 File Download
- **US-017**: As a user, I can download the modified file
- **US-018**: As a user, I am warned that closing the browser will lose unsaved work
- **US-019**: As a user, the downloaded file has the same format as the original with only the allocation numbers changed

## 3. PCN874 File Format Specification

### 3.1 File Structure
```
[Optional Header/Other Rows]
[Receipt Row 1]  - Starts with any letter (A-Z) and contains '+'
[Receipt Row 2]  - Starts with any letter (A-Z) and contains '+'
...
[Receipt Row N]  - Starts with any letter (A-Z) and contains '+'
[Optional Footer/Other Rows]
```

**Note**: Header and footer rows are optional. Receipt rows are identified by:
1. Starting with a letter (A-Z)
2. Containing a '+' separator

### 3.2 Receipt Row Format (Fixed-Width)

Total row length: **60 characters** (to be confirmed with sample file)

```
Position  | Length | Field Name           | Example
----------|--------|----------------------|------------------
1         | 1      | Row Type             | Any letter (A-Z)
2-10      | 9      | Business Number      | 424673351
11-14     | 4      | Year                 | 2025
15-16     | 2      | Month                | 11
17-18     | 2      | Day                  | 02
19-X      | Var    | Receipt Number       | Zero-padded, e.g., 0014 → receipt# 14
X-Y       | 9      | VAT Amount           | 000000719
Y         | 1      | Separator            | '+'
Y+1-Y+10  | 10     | Sum Without VAT      | 0000000000
Y+11-Y+19 | 9      | Allocation Number    | 000000000 (to be replaced)
```

### 3.3 Parsing Algorithm

1. **Identify receipt rows**: Rows starting with a letter (A-Z) and containing '+'
2. **Locate the '+' symbol** in the row
3. **Extract VAT**: 9 digits immediately before the '+'
4. **Extract Receipt Number**: The digits between position 18 and the VAT start position, then remove leading zeros
5. **Extract Sum Without VAT**: 10 digits immediately after the '+'
6. **Extract Allocation Number**: Last 9 digits of the row (to be replaced)
7. **Extract Fixed Fields**: Business number (pos 2-10), Year (11-14), Month (15-16), Day (17-18)

### 3.4 Sample Row Analysis

```
R424673351202511020014000000000000000719+0000000000000000000
│└────────┘└──┘││└──┘└─────────────┘└───┘│└────────┘└───────┘
│    │      │  ││  │        │        │   │    │         │
│ Business Year││Day│   Zero-pad   VAT  +  Sum    Allocation
│  Number     ││   Receipt#              Without    (9 digits)
│            Month                        VAT
Row Type (any letter)
```

### 3.5 Receipt Number Extraction

The receipt number is embedded with leading zeros between the date and VAT fields:
- **Position 19 to (plusIndex - 9)**: Contains zero-padded receipt number
- **Example**: `0014000000000000000` → Receipt number is `14`
- **Algorithm**: Remove leading zeros from this section to get the actual receipt number

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
