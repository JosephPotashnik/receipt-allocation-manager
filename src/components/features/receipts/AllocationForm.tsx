'use client';

import { useState } from 'react';
import { Button, Input, Alert, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { allocationNumberSchema } from '@/lib/validators/schemas';
import { formatReceiptForDisplay } from '@/lib/parser/pcn874';
import type { IReceipt, IUpdateResponse } from '@/types';

interface AllocationFormProps {
  selectedReceipt: IReceipt;
  fileContent: string;
  onAllocationSuccess: (
    modifiedContent: string,
    modifiedReceipt: IReceipt
  ) => void;
  onClear: () => void;
  getAccessToken: () => Promise<string | null>;
}

export default function AllocationForm({
  selectedReceipt,
  fileContent,
  onAllocationSuccess,
  onClear,
  getAccessToken,
}: AllocationFormProps) {
  const [allocationNumber, setAllocationNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const displayData = formatReceiptForDisplay(selectedReceipt);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setValidationError(null);

    // Validate allocation number
    const validation = allocationNumberSchema.safeParse(allocationNumber);
    if (!validation.success) {
      setValidationError(validation.error.issues[0].message);
      return;
    }

    setIsLoading(true);

    try {
      // Get JWT token
      const token = await getAccessToken();
      if (!token) {
        setError('Please sign in to update allocations');
        return;
      }

      // Send to API
      const response = await fetch('/api/update-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fileContent,
          rowIndex: selectedReceipt.rowIndex,
          allocationNumber: validation.data, // Padded to 9 digits
        }),
      });

      const result: IUpdateResponse = await response.json();

      if (!result.success || !result.data) {
        setError(result.error || 'Failed to update allocation');
        return;
      }

      // Success
      setSuccess(true);
      setAllocationNumber('');
      onAllocationSuccess(result.data.modifiedContent, result.data.modifiedReceipt);
    } catch (err) {
      console.error('Update allocation error:', err);
      setError('Failed to update allocation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receipt Details &amp; Allocation</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="error" className="mb-4" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert
            variant="success"
            className="mb-4"
            onClose={() => setSuccess(false)}
          >
            Allocation updated successfully!
          </Alert>
        )}

        <div className="space-y-4">
          {/* Receipt Details */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Selected Receipt
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Business Number:</span>
                <span className="ml-2 font-mono">{displayData.businessNumber}</span>
              </div>
              <div>
                <span className="text-gray-500">Date:</span>
                <span className="ml-2">{displayData.date}</span>
              </div>
              <div>
                <span className="text-gray-500">Receipt #:</span>
                <span className="ml-2 font-medium">{displayData.receiptNumber}</span>
              </div>
              <div>
                <span className="text-gray-500">Row Type:</span>
                <span className="ml-2 font-mono">{selectedReceipt.rowType}</span>
              </div>
              <div>
                <span className="text-gray-500">VAT Amount:</span>
                <span className="ml-2">{displayData.vatAmount}</span>
              </div>
              <div>
                <span className="text-gray-500">Sum (excl. VAT):</span>
                <span className="ml-2">{displayData.sumWithoutVat}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">Current Allocation:</span>
                <span className="ml-2 font-mono bg-yellow-100 px-2 py-0.5 rounded">
                  {displayData.allocationNumber}
                </span>
              </div>
            </div>
          </div>

          {/* Allocation Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="New Allocation Number"
              type="text"
              value={allocationNumber}
              onChange={(e) => {
                // Only allow digits
                const value = e.target.value.replace(/\D/g, '');
                setAllocationNumber(value);
              }}
              error={validationError || undefined}
              placeholder="Enter 1-9 digits (will be padded with zeros)"
              maxLength={9}
              helperText="Enter up to 9 digits. Will be left-padded with zeros if less than 9."
              disabled={isLoading}
            />

            <div className="flex gap-3">
              <Button type="submit" isLoading={isLoading} disabled={!allocationNumber}>
                Apply Allocation
              </Button>
              <Button type="button" variant="secondary" onClick={onClear}>
                Clear Selection
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
