'use client';

import { useState } from 'react';
import { Button, Input, Alert, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { receiptNumberSearchSchema, businessNumberSchema } from '@/lib/validators/schemas';
import { searchByReceiptNumber, searchByReceiptAndBusiness } from '@/lib/parser/pcn874';
import type { IReceipt } from '@/types';

interface ReceiptSearchProps {
  receipts: IReceipt[];
  onReceiptSelect: (receipt: IReceipt) => void;
}

export default function ReceiptSearch({
  receipts,
  onReceiptSelect,
}: ReceiptSearchProps) {
  const [receiptNumber, setReceiptNumber] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [showBusinessInput, setShowBusinessInput] = useState(false);
  const [multipleMatches, setMultipleMatches] = useState<IReceipt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    receiptNumber?: string;
    businessNumber?: string;
  }>({});

  const handleSearch = () => {
    setError(null);
    setValidationErrors({});
    setMultipleMatches([]);
    setShowBusinessInput(false);

    // Validate receipt number
    const receiptValidation = receiptNumberSearchSchema.safeParse(receiptNumber);
    if (!receiptValidation.success) {
      setValidationErrors({
        receiptNumber: receiptValidation.error.issues[0].message,
      });
      return;
    }

    // Search by receipt number
    const matches = searchByReceiptNumber(receipts, receiptNumber);

    if (matches.length === 0) {
      setError(`No receipt found with number "${receiptNumber}"`);
      return;
    }

    if (matches.length === 1) {
      // Unique match found
      onReceiptSelect(matches[0]);
      return;
    }

    // Multiple matches - need business number
    setMultipleMatches(matches);
    setShowBusinessInput(true);
  };

  const handleBusinessSearch = () => {
    setError(null);
    setValidationErrors({});

    // Validate business number
    const businessValidation = businessNumberSchema.safeParse(businessNumber);
    if (!businessValidation.success) {
      setValidationErrors({
        businessNumber: businessValidation.error.issues[0].message,
      });
      return;
    }

    // Search by receipt + business number
    const match = searchByReceiptAndBusiness(
      receipts,
      receiptNumber,
      businessNumber
    );

    if (!match) {
      setError(
        `No receipt found with number "${receiptNumber}" and business number "${businessNumber}"`
      );
      return;
    }

    onReceiptSelect(match);
    // Reset state
    setShowBusinessInput(false);
    setMultipleMatches([]);
  };

  const handleClear = () => {
    setReceiptNumber('');
    setBusinessNumber('');
    setShowBusinessInput(false);
    setMultipleMatches([]);
    setError(null);
    setValidationErrors({});
  };

  const handleKeyPress = (e: React.KeyboardEvent, searchFn: () => void) => {
    if (e.key === 'Enter') {
      searchFn();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search Receipt</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="error" className="mb-4" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <div className="space-y-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Input
                label="Receipt Number"
                type="text"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                onKeyDown={(e) => handleKeyPress(e, handleSearch)}
                error={validationErrors.receiptNumber}
                placeholder="Enter receipt number"
                disabled={showBusinessInput}
              />
            </div>
            {!showBusinessInput && (
              <Button onClick={handleSearch} disabled={!receiptNumber}>
                Search
              </Button>
            )}
          </div>

          {showBusinessInput && (
            <>
              <Alert variant="warning">
                Multiple receipts found with number &quot;{receiptNumber}&quot;. Please
                enter the business number to identify the specific receipt.
              </Alert>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">
                  Found {multipleMatches.length} receipts with matching business
                  numbers:
                </p>
                <ul className="text-sm text-gray-700 space-y-1">
                  {multipleMatches.map((receipt, index) => (
                    <li key={index}>
                      Business: {receipt.businessNumber} | Date:{' '}
                      {`${receipt.year}-${String(receipt.month).padStart(2, '0')}-${String(receipt.day).padStart(2, '0')}`}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <Input
                    label="Business Number"
                    type="text"
                    value={businessNumber}
                    onChange={(e) => setBusinessNumber(e.target.value)}
                    onKeyDown={(e) => handleKeyPress(e, handleBusinessSearch)}
                    error={validationErrors.businessNumber}
                    placeholder="Enter 9-digit business number"
                    maxLength={9}
                  />
                </div>
                <Button onClick={handleBusinessSearch} disabled={!businessNumber}>
                  Find
                </Button>
                <Button variant="secondary" onClick={handleClear}>
                  Clear
                </Button>
              </div>
            </>
          )}

          {!showBusinessInput && receiptNumber && (
            <Button variant="ghost" size="sm" onClick={handleClear}>
              Clear Search
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
