# IMPLEMENTATION.md - Step-by-Step Build Plan

## Implementation Status: COMPLETE

All phases have been implemented. The application is ready for deployment.

## Overview

This document outlines the implementation order for the Receipt Allocation Manager. Each step builds upon the previous ones, ensuring we have working, testable code at each stage.

---

## Phase 1: Project Setup

### Step 1.1: Initialize Next.js Project
**Goal**: Create the base Next.js project with TypeScript and Tailwind CSS

**Tasks**:
- Run `npx create-next-app@latest` with TypeScript, Tailwind, App Router, and src/ directory
- Verify the project runs with `npm run dev`

**Deliverables**:
- Working Next.js application at `http://localhost:3000`
- `package.json` with base dependencies

---

### Step 1.2: Install Additional Dependencies
**Goal**: Add all required packages

**Dependencies to install**:
```bash
npm install @supabase/supabase-js @supabase/ssr zod
npm install -D @types/node
```

**Deliverables**:
- Updated `package.json` with all dependencies

---

### Step 1.3: Configure Environment Variables
**Goal**: Set up environment variable structure

**Tasks**:
- Create `.env.local` (gitignored) with placeholder values
- Create `.env.example` for documentation

**Deliverables**:
- `.env.example` with required variables documented
- `.gitignore` updated to exclude `.env.local`

---

## Phase 2: Core Types and Utilities

### Step 2.1: Define TypeScript Types
**Goal**: Create all shared type definitions

**File**: `src/types/index.ts`

**Types to define**:
- `IReceipt` - Parsed receipt data
- `IFileData` - In-memory file state
- `IApiResponse<T>` - Generic API response wrapper
- `IParseResponse` - Parse API specific response
- `IUpdateResponse` - Update API specific response

**Depends on**: Step 1.1

---

### Step 2.2: Create Zod Validation Schemas
**Goal**: Implement runtime validation for all inputs

**File**: `src/lib/validators/schemas.ts`

**Schemas to create**:
- `emailSchema`
- `passwordSchema`
- `fileContentSchema`
- `receiptRowSchema`
- `receiptNumberSearchSchema`
- `businessNumberSchema`
- `allocationNumberSchema`
- `parseRequestSchema`
- `updateReceiptRequestSchema`

**Depends on**: Step 2.1

---

### Step 2.3: Implement PCN874 Parser
**Goal**: Create the file parsing logic

**File**: `src/lib/parser/pcn874.ts`

**Functions to implement**:
- `isReceiptRow(line: string): boolean` - Check if line is a receipt row
- `parseReceiptRow(row: string, rowIndex: number): IReceipt | null` - Parse single row
- `parseFile(content: string): { receipts: IReceipt[], errors: string[] }` - Parse entire file
- `updateAllocation(content: string, rowIndex: number, allocation: string): string` - Modify file

**Depends on**: Step 2.1, Step 2.2

**Testing**: Create a test file with sample PCN874 data to verify parsing

---

## Phase 3: Supabase Authentication Setup

### Step 3.1: Configure Supabase Clients
**Goal**: Set up Supabase client for both browser and server

**Files**:
- `src/lib/supabase/client.ts` - Browser client
- `src/lib/supabase/server.ts` - Server client (for API routes)
- `src/lib/supabase/middleware.ts` - Middleware client

**Depends on**: Step 1.2, Step 1.3

---

### Step 3.2: Create Authentication Middleware
**Goal**: Protect routes and handle auth redirects

**File**: `src/middleware.ts`

**Logic**:
- Check for valid session on protected routes (`/dashboard`)
- Redirect unauthenticated users to `/login`
- Redirect authenticated users away from `/login` and `/signup`

**Depends on**: Step 3.1

---

### Step 3.3: Create Auth Utility Functions
**Goal**: Helper functions for auth operations

**File**: `src/lib/supabase/auth.ts`

**Functions**:
- `signUp(email: string, password: string)`
- `signIn(email: string, password: string)`
- `signOut()`
- `getUser()` - Get current user
- `verifyJWT(request: Request)` - Verify JWT for API routes

**Depends on**: Step 3.1

---

## Phase 4: API Routes

### Step 4.1: Create Parse API Route
**Goal**: API endpoint to parse uploaded files

**File**: `src/app/api/parse/route.ts`

**Endpoint**: `POST /api/parse`

**Logic**:
1. Verify JWT token
2. Validate request body with Zod
3. Parse file content using PCN874 parser
4. Return parsed receipts

**Depends on**: Step 2.3, Step 3.3

---

### Step 4.2: Create Update Receipt API Route
**Goal**: API endpoint to update allocation numbers

**File**: `src/app/api/update-receipt/route.ts`

**Endpoint**: `POST /api/update-receipt`

**Logic**:
1. Verify JWT token
2. Validate request body with Zod
3. Modify the specified row in file content
4. Return modified content

**Depends on**: Step 2.3, Step 3.3

---

## Phase 5: UI Components

### Step 5.1: Create Base UI Components
**Goal**: Reusable UI primitives

**Files**:
- `src/components/ui/Button.tsx`
- `src/components/ui/Input.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/Alert.tsx`
- `src/components/ui/Spinner.tsx`

**Depends on**: Step 1.1

---

### Step 5.2: Create Auth Form Components
**Goal**: Login and signup forms

**Files**:
- `src/components/features/auth/LoginForm.tsx`
- `src/components/features/auth/SignupForm.tsx`
- `src/components/features/auth/LogoutButton.tsx`

**Depends on**: Step 5.1, Step 3.3

---

### Step 5.3: Create File Upload Component
**Goal**: File selection and upload UI

**File**: `src/components/features/receipts/FileUploader.tsx`

**Features**:
- File input with drag-and-drop (optional)
- Client-side validation (size, extension)
- Upload status display
- Call to `/api/parse`

**Depends on**: Step 5.1, Step 4.1

---

### Step 5.4: Create Receipt Search Component
**Goal**: Search interface for finding receipts

**File**: `src/components/features/receipts/ReceiptSearch.tsx`

**Features**:
- Receipt number input
- Business number input (shown conditionally)
- Search results display
- Error handling for not found

**Depends on**: Step 5.1

---

### Step 5.5: Create Allocation Form Component
**Goal**: Input and apply allocation numbers

**File**: `src/components/features/receipts/AllocationForm.tsx`

**Features**:
- Display selected receipt details
- Allocation number input (9 digits)
- Apply button
- Success/error feedback

**Depends on**: Step 5.1, Step 4.2

---

### Step 5.6: Create File Download Component
**Goal**: Download modified file

**File**: `src/components/features/receipts/FileDownload.tsx`

**Features**:
- Show modification count
- Download button
- Warning about unsaved changes

**Depends on**: Step 5.1

---

## Phase 6: Pages and Layouts

### Step 6.1: Create Root Layout
**Goal**: App-wide layout with providers

**File**: `src/app/layout.tsx`

**Features**:
- HTML structure
- Tailwind base styles
- Metadata

**Depends on**: Step 1.1

---

### Step 6.2: Create Auth Layout and Pages
**Goal**: Login and signup pages

**Files**:
- `src/app/(auth)/layout.tsx` - Centered layout for auth pages
- `src/app/(auth)/login/page.tsx` - Login page
- `src/app/(auth)/signup/page.tsx` - Signup page

**Depends on**: Step 5.2, Step 6.1

---

### Step 6.3: Create Protected Layout
**Goal**: Layout for authenticated pages

**File**: `src/app/(protected)/layout.tsx`

**Features**:
- Auth check (redirect if not authenticated)
- Header with user info and logout

**Depends on**: Step 3.2, Step 5.2, Step 6.1

---

### Step 6.4: Create Dashboard Page
**Goal**: Main application page

**File**: `src/app/(protected)/dashboard/page.tsx`

**Features**:
- Integrate all receipt components
- Manage file state (React useState)
- Handle component interactions

**Depends on**: Step 5.3, Step 5.4, Step 5.5, Step 5.6, Step 6.3

---

### Step 6.5: Create Landing Page
**Goal**: Root page with redirect logic

**File**: `src/app/page.tsx`

**Logic**:
- If authenticated → redirect to `/dashboard`
- If not authenticated → redirect to `/login`

**Depends on**: Step 3.1

---

## Phase 7: Testing and Polish

### Step 7.1: Manual Testing with Sample File
**Goal**: Verify full flow works

**Tasks**:
- Upload a PCN874 file
- Search for receipts
- Apply allocations
- Download modified file
- Verify file integrity

**Depends on**: All previous steps

---

### Step 7.2: Error Handling Review
**Goal**: Ensure all error cases are handled gracefully

**Tasks**:
- Test invalid file uploads
- Test authentication failures
- Test invalid inputs
- Test network errors

**Depends on**: Step 7.1

---

### Step 7.3: UI/UX Polish
**Goal**: Improve user experience

**Tasks**:
- Add loading states
- Improve error messages
- Add confirmation dialogs where needed
- Test responsive design

**Depends on**: Step 7.2

---

## Phase 8: Deployment

### Step 8.1: Prepare for Vercel Deployment
**Goal**: Configure project for production

**Tasks**:
- Verify all environment variables are documented
- Test production build locally (`npm run build`)
- Create Vercel project

**Depends on**: Step 7.3

---

### Step 8.2: Configure Supabase for Production
**Goal**: Set up production Supabase instance

**Tasks**:
- Create Supabase project (if not done)
- Configure auth settings (allowed URLs, etc.)
- Get production API keys

**Depends on**: Step 8.1

---

### Step 8.3: Deploy to Vercel
**Goal**: Live production deployment

**Tasks**:
- Connect GitHub repository to Vercel
- Configure environment variables in Vercel
- Deploy and test

**Depends on**: Step 8.1, Step 8.2

---

## Implementation Summary

| Phase | Steps | Description | Status |
|-------|-------|-------------|--------|
| 1 | 1.1 - 1.3 | Project setup and configuration | COMPLETE |
| 2 | 2.1 - 2.3 | Core types, validation, and parser | COMPLETE |
| 3 | 3.1 - 3.3 | Supabase authentication | COMPLETE |
| 4 | 4.1 - 4.2 | API routes | COMPLETE |
| 5 | 5.1 - 5.6 | UI components | COMPLETE |
| 6 | 6.1 - 6.5 | Pages and layouts | COMPLETE |
| 7 | 7.1 - 7.3 | Testing and polish | COMPLETE |
| 8 | 8.1 - 8.3 | Deployment | READY |

## Additional Features Implemented

- **Automatic Token Refresh**: Supabase `onAuthStateChange` listener for background token refresh
- **401 Retry Logic**: `fetchWithAuth` wrapper automatically retries failed requests after token refresh
- **SessionExpiredError**: Custom error class for handling session expiration with redirect to login
- **Download Always Visible**: File download section is always visible when a file is loaded

---

## Notes

- Each step should be committed to git after completion
- Test each step before moving to the next
- The parser (Step 2.3) is critical - test thoroughly with real data
- Keep the sample PCN874 file handy for testing throughout development
