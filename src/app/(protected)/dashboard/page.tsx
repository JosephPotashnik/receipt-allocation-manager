'use client';

import { useState, useCallback } from 'react';
import FileUploader from '@/components/features/receipts/FileUploader';
import ReceiptSearch from '@/components/features/receipts/ReceiptSearch';
import AllocationForm from '@/components/features/receipts/AllocationForm';
import FileDownload from '@/components/features/receipts/FileDownload';
import { Alert } from '@/components/ui';
import type { IReceipt, IFileData } from '@/types';

export default function DashboardPage() {
  const [fileData, setFileData] = useState<IFileData | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<IReceipt | null>(null);

  // Handle successful file upload
  const handleUploadSuccess = useCallback(
    (receipts: IReceipt[], content: string, fileName: string) => {
      setFileData({
        fileName,
        originalContent: content,
        modifiedContent: content,
        receipts,
        totalReceipts: receipts.length,
        modifiedCount: 0,
      });
      setSelectedReceipt(null);
    },
    []
  );

  // Handle receipt selection from search
  const handleReceiptSelect = useCallback((receipt: IReceipt) => {
    setSelectedReceipt(receipt);
  }, []);

  // Handle successful allocation update
  const handleAllocationSuccess = useCallback(
    (modifiedContent: string, modifiedReceipt: IReceipt) => {
      if (!fileData) return;

      // Update the receipts array with the modified receipt
      const updatedReceipts = fileData.receipts.map((r) =>
        r.rowIndex === modifiedReceipt.rowIndex ? modifiedReceipt : r
      );

      // Check if this receipt was already modified (compare with original)
      const originalReceipt = fileData.receipts.find(
        (r) => r.rowIndex === modifiedReceipt.rowIndex
      );
      const wasAlreadyModified =
        originalReceipt?.allocationNumber !== modifiedReceipt.allocationNumber;

      setFileData({
        ...fileData,
        modifiedContent,
        receipts: updatedReceipts,
        modifiedCount: wasAlreadyModified
          ? fileData.modifiedCount + 1
          : fileData.modifiedCount,
      });

      // Update selected receipt with new data
      setSelectedReceipt(modifiedReceipt);
    },
    [fileData]
  );

  // Clear selected receipt
  const handleClearSelection = useCallback(() => {
    setSelectedReceipt(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Warning about unsaved changes */}
      {fileData && fileData.modifiedCount > 0 && (
        <Alert variant="warning">
          You have {fileData.modifiedCount} unsaved modification(s). Remember to
          download the file before closing this page.
        </Alert>
      )}

      {/* File Upload Section */}
      <FileUploader onUploadSuccess={handleUploadSuccess} />

      {/* Show these sections only after file is uploaded */}
      {fileData && (
        <>
          {/* File Status */}
          <Alert variant="success" title="File Loaded">
            Successfully loaded {fileData.totalReceipts} receipts from{' '}
            {fileData.fileName}
          </Alert>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Search */}
            <ReceiptSearch
              receipts={fileData.receipts}
              onReceiptSelect={handleReceiptSelect}
            />

            {/* Right Column: Allocation or Download */}
            <div className="space-y-6">
              {selectedReceipt ? (
                <AllocationForm
                  selectedReceipt={selectedReceipt}
                  fileContent={fileData.modifiedContent}
                  onAllocationSuccess={handleAllocationSuccess}
                  onClear={handleClearSelection}
                />
              ) : (
                <FileDownload
                  fileName={fileData.fileName}
                  modifiedContent={fileData.modifiedContent}
                  modifiedCount={fileData.modifiedCount}
                  totalReceipts={fileData.totalReceipts}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
