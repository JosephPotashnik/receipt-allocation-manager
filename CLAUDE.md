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
1. Upload a PCN874 format text file containing receipt records
2. Search for a specific receipt by receipt number (and business number if not unique)
3. Input an allocation number (9 digits)
4. Replace the last 9 digits of the matching receipt row with the allocation number
5. Download the modified file

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
- Fixed-width format (consistent row length per file)
- Header/footer rows are optional
- Data rows: Start with any letter (A-Z) and contain a '+' separator
- Receipt number is extracted by finding the '+', taking 9 digits before it (VAT), and parsing backwards to find the receipt number

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
- Receipt number + Business number combination is guaranteed unique
- Row length validation is critical - reject malformed files
- Always handle the edge case where receipt number is not found
- Hebrew language support may be needed for UI (RTL consideration)
