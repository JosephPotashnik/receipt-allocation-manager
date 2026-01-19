# CLAUDE.md - AI Assistant Guidelines for Receipt Allocation Manager

## Required Reading

**IMPORTANT**: Before working on this project, you MUST read all steering documents:

1. **ARCHITECTURE.md** - System design, component structure, data flows, API specifications
2. **SPECIFICATIONS.md** - Functional requirements, user stories, data types, UI/UX requirements
3. **INPUT_VALIDATION.md** - All validation rules, Zod schemas, parsing algorithms
4. **IMPLEMENTATION.md** - Step-by-step build plan with dependencies

These documents contain critical details about the PCN874 file format parsing, validation rules, and implementation order. Always refer to them when implementing features.

---

## Project Overview

This is a **Receipt Allocation Manager** - a Next.js web application that allows authenticated users to:
1. Upload a PCN874 format text file containing supplier receipt records
2. Search for a specific supplier receipt (T row) by receipt number (and business number if not unique)
3. Input an allocation number (9 digits)
4. Replace the last 9 digits of the matching supplier receipt row with the allocation number
5. Download the modified file

**Critical**: Only rows beginning with the letter **'T'** are supplier rows that need to be processed. All other rows (R, S, O, X, header, footer, etc.) are preserved unchanged in the file.

## Tech Stack

- **Framework**: Next.js 14+ with App Router and TypeScript
- **Authentication**: Supabase Auth (JWT-based)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel
- **State Management**: React hooks (no external state library needed)

## Key Architectural Decisions

### No Persistent Storage
- Files are processed in-memory only
- No database storage for receipt data
- Supabase is used ONLY for authentication
- Users must download modified files before session ends or work is lost

### Authentication Flow
- All API routes must verify Supabase JWT tokens
- Use middleware for protected routes
- Client-side auth state managed via Supabase client

### File Format (PCN874)
- Fixed-width format (T rows are exactly 60 characters)
- Header/footer rows are optional and vary in format
- **Only T rows (supplier rows) are processed** - start with 'T' and contain '+' at position 41
- Other row types (R, S, O, X, etc.) are preserved but not parsed
- T Row structure (60 chars):
  - Position 1: 'T' (row type)
  - Positions 2-10: Business number (9 digits)
  - Positions 11-18: Date (YYYYMMDD)
  - Positions 19-22: Code (4 digits)
  - Positions 23-31: Receipt number (9 digits, zero-padded)
  - Positions 32-40: VAT (9 digits)
  - Position 41: '+' separator
  - Positions 42-51: Sum without VAT (10 digits)
  - Positions 52-60: Allocation number (9 digits) - **this is what gets replaced**

## Code Style Guidelines

### TypeScript
- Use strict TypeScript - no `any` types
- Define interfaces for all data structures
- Use Zod for runtime validation

### File Structure
```
src/
├── app/
│   ├── (auth)/           # Auth routes (login, signup)
│   ├── (protected)/      # Protected routes (dashboard)
│   ├── api/              # API routes
│   └── layout.tsx
├── components/
│   ├── ui/               # Reusable UI components
│   └── features/         # Feature-specific components
├── lib/
│   ├── supabase/         # Supabase client config
│   ├── parser/           # PCN874 file parser
│   └── validators/       # Input validation schemas
└── types/                # TypeScript type definitions
```

### Naming Conventions
- Components: PascalCase (`ReceiptSearch.tsx`)
- Utilities: camelCase (`parseReceiptRow.ts`)
- Types/Interfaces: PascalCase with 'I' prefix for interfaces (`IReceipt`)
- Constants: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)

### Error Handling
- Always provide user-friendly error messages
- Log technical details server-side
- Use try-catch blocks in async operations
- Validate all user inputs before processing

## Security Requirements

1. **Authentication**: Every API route must verify JWT
2. **Input Validation**: Validate file format, receipt numbers, allocation numbers
3. **No File Storage**: Process in memory, never write to disk on server
4. **CORS**: Properly configured for Vercel deployment
5. **Environment Variables**: Never commit secrets

## Testing Approach

- Unit tests for parser functions
- Integration tests for API routes
- E2E tests for critical user flows (optional)

## Common Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler check
npm test             # Run tests
```

## Important Reminders

- The allocation number MUST be exactly 9 digits
- Receipt number + Business number combination is guaranteed unique within T rows
- T row length is exactly 60 characters
- Only T rows (supplier rows) should be parsed and made searchable
- All other row types (R, S, O, X, etc.) are preserved unchanged in the output file
- Always handle the edge case where receipt number is not found
- Hebrew language support may be needed for UI (RTL consideration)
