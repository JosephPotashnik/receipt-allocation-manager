import { NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/supabase/server';
import { parseRequestSchema } from '@/lib/validators/schemas';
import { parseFile } from '@/lib/parser/pcn874';
import type { IParseResponse } from '@/types';

export async function POST(request: Request): Promise<NextResponse<IParseResponse>> {
  // 1. Verify JWT token
  const { user, error: authError } = await verifyJWT(request);

  if (authError || !user) {
    return NextResponse.json(
      {
        success: false,
        error: authError || 'Unauthorized',
        code: 'UNAUTHORIZED',
      },
      { status: 401 }
    );
  }

  try {
    // 2. Parse and validate request body
    const body = await request.json();
    const validationResult = parseRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const firstIssue = validationResult.error.issues[0];
      return NextResponse.json(
        {
          success: false,
          error: firstIssue.message,
          code: 'VALIDATION_ERROR',
          field: firstIssue.path.join('.'),
        },
        { status: 400 }
      );
    }

    const { fileContent } = validationResult.data;

    // 3. Parse the PCN874 file
    const { receipts, errors } = parseFile(fileContent);

    if (receipts.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: errors.length > 0 ? errors[0] : 'No valid receipts found in file',
          code: 'NO_RECEIPTS',
        },
        { status: 400 }
      );
    }

    // 4. Return parsed receipts
    return NextResponse.json({
      success: true,
      data: {
        receipts,
        totalReceipts: receipts.length,
      },
    });
  } catch (err) {
    console.error('Parse API error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to parse file',
        code: 'PARSE_ERROR',
      },
      { status: 500 }
    );
  }
}
