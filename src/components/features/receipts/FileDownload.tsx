'use client';

import { Button, Alert, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

interface FileDownloadProps {
  fileName: string;
  modifiedContent: string;
  modifiedCount: number;
  totalReceipts: number;
}

export default function FileDownload({
  fileName,
  modifiedContent,
  modifiedCount,
  totalReceipts,
}: FileDownloadProps) {
  const handleDownload = () => {
    // Create a blob with the modified content
    const blob = new Blob([modifiedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    // Generate download filename
    const baseName = fileName.replace(/\.txt$/i, '');
    const downloadName = `${baseName}_modified.txt`;

    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL object
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Download Modified File</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">File:</span>
              <span className="text-sm font-medium text-gray-900">{fileName}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total Receipts:</span>
              <span className="text-sm font-medium text-gray-900">
                {totalReceipts}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Modified Receipts:</span>
              <span
                className={`text-sm font-medium ${
                  modifiedCount > 0 ? 'text-green-600' : 'text-gray-900'
                }`}
              >
                {modifiedCount}
              </span>
            </div>
          </div>

          {modifiedCount > 0 && (
            <Alert variant="warning">
              You have unsaved modifications. Changes will be lost if you close
              the browser without downloading the file.
            </Alert>
          )}

          <Button
            onClick={handleDownload}
            disabled={modifiedCount === 0}
            className="w-full"
          >
            Download Modified File
          </Button>

          {modifiedCount === 0 && (
            <p className="text-sm text-gray-500 text-center">
              No modifications have been made yet. Search for a receipt and apply
              an allocation to enable download.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
