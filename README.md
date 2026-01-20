# Receipt Allocation Manager

A Next.js web application for managing supplier receipt allocations. Upload fixed-width format text files, search for specific receipts, assign allocation numbers, and download the modified file.

## Features

- **Secure Authentication**: Email/password login via Supabase Auth with automatic JWT token refresh
- **File Upload**: Upload and parse fixed-width format text files containing supplier receipts
- **Receipt Search**: Search for supplier receipts by receipt number (with business number disambiguation)
- **Allocation Assignment**: Assign 9-digit allocation numbers to receipts (auto zero-padded)
- **File Download**: Download modified files with updated allocation numbers
- **In-Memory Processing**: All file processing happens in-memory - no data stored on server

## Tech Stack

- **Framework**: Next.js 14+ with App Router and TypeScript
- **Authentication**: Supabase Auth (JWT-based)
- **Styling**: Tailwind CSS
- **Validation**: Zod v4
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (for authentication)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/receipt-allocation-manager.git
   cd receipt-allocation-manager
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## File Format

The application processes fixed-width text files with the following structure:

### Supplier Rows (T Rows)
Only rows starting with 'T' are processed. Each T row is exactly 60 characters:

| Position | Length | Field |
|----------|--------|-------|
| 1 | 1 | Row Type ('T') |
| 2-10 | 9 | Business Number |
| 11-18 | 8 | Date (YYYYMMDD) |
| 19-22 | 4 | Code |
| 23-31 | 9 | Receipt Number (zero-padded) |
| 32-40 | 9 | VAT Amount |
| 41 | 1 | '+' Separator |
| 42-51 | 10 | Sum Without VAT |
| 52-60 | 9 | Allocation Number (modifiable) |

Other row types (R, S, O, X, header, footer) are preserved unchanged in the output file.

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login and signup pages
│   ├── (protected)/      # Dashboard (authenticated)
│   └── api/              # API routes (parse, update-receipt)
├── components/
│   ├── ui/               # Reusable UI components
│   └── features/         # Feature-specific components
├── lib/
│   ├── api/              # fetchWithAuth wrapper
│   ├── supabase/         # Supabase client and auth helpers
│   ├── parser/           # File parser
│   └── validators/       # Zod schemas
└── types/                # TypeScript definitions
```

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## Security

- All API routes verify JWT tokens
- Automatic token refresh via Supabase
- No file data stored on server
- Input validation on both client and server

## Documentation

For detailed documentation, see:
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design and data flows
- [SPECIFICATIONS.md](./SPECIFICATIONS.md) - Functional requirements
- [INPUT_VALIDATION.md](./INPUT_VALIDATION.md) - Validation rules
- [IMPLEMENTATION.md](./IMPLEMENTATION.md) - Build plan

## Deploy on Vercel

The easiest way to deploy is using [Vercel](https://vercel.com):

1. Connect your GitHub repository to Vercel
2. Configure environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy

## License

MIT
