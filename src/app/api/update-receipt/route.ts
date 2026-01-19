import { NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/supabase/server';
import { updateReceiptRequestSchema } from '@/lib/validators/schemas';
import { updateAllocation, parseFile } from '@/lib/parser/pcn874';
import type { IUpdateResponse } from '@/types';

export async function POST(request: Request): Promise<NextResponse<IUpdateResponse>> {
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
    const validationResult = updateReceiptRequestSchema.safeParse(body);

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

    const { fileContent, rowIndex, allocationNumber } = validationResult.data;

    // 3. Parse the file to get the receipt at the specified row index
    const { receipts } = parseFile(fileContent);
    const targetReceipt = receipts.find((r) => r.rowIndex === rowIndex);

    if (!targetReceipt) {
      return NextResponse.json(
        {
          success: false,
          error: `Receipt at row index ${rowIndex} not found`,
          code: 'ROW_NOT_FOUND',
        },
        { status: 400 }
      );
    }

    // 4. Update the allocation number in the file content
    const modifiedContent = updateAllocation(
      fileContent,
      targetReceipt.lineNumber,
      allocationNumber
    );

    // 5. Parse the modified content to get the updated receipt
    const { receipts: updatedReceipts } = parseFile(modifiedContent);
    const modifiedReceipt = updatedReceipts.find((r) => r.rowIndex === rowIndex);

    if (!modifiedReceipt) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to verify update',
          code: 'UPDATE_ERROR',
        },
        { status: 500 }
      );
    }

    // 6. Return the modified content and updated receipt
    return NextResponse.json({
      success: true,
      data: {
        modifiedContent,
        modifiedReceipt,
      },
    });
  } catch (err) {
    console.error('Update receipt API error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update receipt',
        code: 'UPDATE_ERROR',
      },
      { status: 500 }
    );
  }
}
