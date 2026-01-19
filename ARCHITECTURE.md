# ARCHITECTURE.md - System Architecture Document

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Login/    │  │   Upload    │  │   Receipt Search &      │  │
│  │   Signup    │  │   File      │  │   Allocation Entry      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│         │                │                      │                │
│         ▼                ▼                      ▼                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              React State (In-Memory File Data)              ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NEXT.JS API ROUTES                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  /api/auth  │  │ /api/parse  │  │  /api/update-receipt    │  │
│  │             │  │             │  │                         │  │
│  │ JWT Verify  │  │ Parse File  │  │ Modify Allocation       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE (Auth Only)                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   User Authentication                        ││
│  │              (Email/Password, OAuth, etc.)                   ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Page Components

```
app/
├── layout.tsx                    # Root layout with providers
├── page.tsx                      # Landing/redirect page
├── (auth)/
│   ├── layout.tsx               # Auth layout (no sidebar)
│   ├── login/page.tsx           # Login page
│   └── signup/page.tsx          # Signup page
└── (protected)/
    ├── layout.tsx               # Protected layout with auth check
    └── dashboard/
        └── page.tsx             # Main application page
```

### Feature Components

```
components/
├── ui/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   ├── Alert.tsx
│   └── FileUpload.tsx
└── features/
    ├── auth/
    │   ├── LoginForm.tsx
    │   ├── SignupForm.tsx
    │   └── LogoutButton.tsx
    └── receipts/
        ├── FileUploader.tsx      # Handles file upload & parsing
        ├── ReceiptTable.tsx      # Displays parsed receipts
        ├── ReceiptSearch.tsx     # Search by receipt/business number
        ├── AllocationForm.tsx    # Input allocation number
        └── FileDownload.tsx      # Download modified file
```

## Data Flow

### 1. File Upload Flow

```
User selects file
        │
        ▼
FileUploader component reads file as text
        │
        ▼
Client-side validation (file extension, size)
        │
        ▼
Send to /api/parse with JWT token
        │
        ▼
Server validates JWT
        │
        ▼
Server parses PCN874 format
        │
        ▼
Returns parsed receipts array + original file content
        │
        ▼
Store in React state (NOT in database)
```

### 2. Receipt Search Flow

```
User enters receipt number
        │
        ▼
Search in local state
        │
        ├─── Found (unique) ───► Show receipt details
        │
        ├─── Found (multiple) ─► Ask for business number
        │                              │
        │                              ▼
        │                        Filter by business number
        │                              │
        │                              ▼
        │                        Show receipt details
        │
        └─── Not found ────────► Show error message
```

### 3. Allocation Update Flow

```
User enters 9-digit allocation number
        │
        ▼
Client-side validation (9 digits, numeric)
        │
        ▼
Send to /api/update-receipt with:
  - Original file content
  - Row index to modify
  - New allocation number
  - JWT token
        │
        ▼
Server validates JWT
        │
        ▼
Server validates inputs
        │
        ▼
Server modifies the specific row (last 9 chars)
        │
        ▼
Returns modified file content
        │
        ▼
Update React state with new file content
        │
        ▼
User can download or make more changes
```

## API Routes

### POST /api/parse

**Purpose**: Parse uploaded PCN874 file

**Request**:
```typescript
{
  fileContent: string;  // Raw file content
}
```

**Response**:
```typescript
{
  success: boolean;
  data?: {
    receipts: IReceipt[];
    originalContent: string;
  };
  error?: string;
}
```

### POST /api/update-receipt

**Purpose**: Update allocation number for a receipt

**Request**:
```typescript
{
  fileContent: string;      // Current file content
  rowIndex: number;         // Which row to modify (0-indexed, excluding header)
  allocationNumber: string; // 9-digit allocation number
}
```

**Response**:
```typescript
{
  success: boolean;
  data?: {
    modifiedContent: string;
    modifiedReceipt: IReceipt;
  };
  error?: string;
}
```

## State Management

### Global State (React Context)

```typescript
interface IAppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;

  // File data (in-memory only)
  fileData: {
    originalContent: string;
    modifiedContent: string;
    receipts: IReceipt[];
  } | null;

  // UI state
  isLoading: boolean;
  error: string | null;
}
```

## Security Architecture

### Authentication Middleware

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  // 1. Check for Supabase session
  // 2. Redirect unauthenticated users to login
  // 3. Redirect authenticated users away from auth pages
}
```

### API Route Protection

```typescript
// Every API route follows this pattern:
export async function POST(request: Request) {
  // 1. Extract JWT from Authorization header
  // 2. Verify JWT with Supabase
  // 3. If invalid, return 401
  // 4. Process request
}
```

## Error Handling Strategy

### Client-Side Errors
- Display user-friendly messages in Alert components
- Log detailed errors to console (development only)

### Server-Side Errors
- Return structured error responses
- Log errors for debugging
- Never expose internal details to client

### Error Response Format
```typescript
{
  success: false,
  error: "User-friendly error message",
  code: "ERROR_CODE"  // For programmatic handling
}
```

## Deployment Architecture (Vercel)

```
┌────────────────────────────────────────┐
│              Vercel Edge               │
├────────────────────────────────────────┤
│  ┌──────────────────────────────────┐  │
│  │     Next.js Application          │  │
│  │  ┌────────────────────────────┐  │  │
│  │  │    Static Assets (CDN)     │  │  │
│  │  └────────────────────────────┘  │  │
│  │  ┌────────────────────────────┐  │  │
│  │  │   Serverless Functions     │  │  │
│  │  │   (API Routes)             │  │  │
│  │  └────────────────────────────┘  │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
              │
              ▼
┌────────────────────────────────────────┐
│         Supabase Cloud                 │
│  (Authentication Service Only)         │
└────────────────────────────────────────┘
```

## Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=
```
