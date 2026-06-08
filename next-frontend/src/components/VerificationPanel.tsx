'use client';

import * as React from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

interface VerificationPanelProps {
  studentId: string;
  documentType: string;
  documentName: string;
  docRecord: {
    url: string;
    publicId: string;
    status: string;
    remarks: string;
    uploadDate: string;
    verifiedBy?: {
      name: string;
    };
  };
  onVerificationUpdate: () => void;
}

export default function VerificationPanel({
  studentId,
  documentType,
  documentName,
  docRecord,
  onVerificationUpdate,
}: VerificationPanelProps) {
  const [remarks, setRemarks] = React.useState(docRecord.remarks || '');
  const [loading, setLoading] = React.useState(false);

  const handleVerify = async (status: 'Verified' | 'Rejected') => {
    setLoading(true);
    try {
      const response = await api.put(`/students/${studentId}/document/${documentType}/verify`, {
        status,
        remarks,
      });

      if (response.data?.success) {
        onVerificationUpdate();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update verification status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white dark:border-gray-800 dark:bg-gray-900 space-y-4">
      <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h4 className="font-semibold text-sm text-gray-950 dark:text-gray-100">{documentName}</h4>
          <p className="text-xs text-gray-500">
            Uploaded: {docRecord.uploadDate ? new Date(docRecord.uploadDate).toLocaleDateString() : '-'}
          </p>
        </div>
        <Badge
          variant={
            docRecord.status === 'Verified'
              ? 'success'
              : docRecord.status === 'Rejected'
              ? 'destructive'
              : 'warning'
          }
        >
          {docRecord.status}
        </Badge>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`remarks-${documentType}`}>Verification Remarks</Label>
        <Textarea
          id={`remarks-${documentType}`}
          placeholder="Enter reason for rejection or approval remarks..."
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={2}
          className="text-xs"
        />
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.open(docRecord.url, '_blank')}
          className="text-xs"
        >
          View Document
        </Button>

        <Button
          size="sm"
          variant="secondary"
          onClick={() => handleVerify('Rejected')}
          disabled={loading}
          className="bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50"
        >
          <XCircle size={14} className="mr-1" /> Reject
        </Button>

        <Button
          size="sm"
          onClick={() => handleVerify('Verified')}
          disabled={loading}
          className="bg-green-600 text-white hover:bg-green-700"
        >
          <CheckCircle size={14} className="mr-1" /> Verify & Approve
        </Button>
      </div>

      {docRecord.verifiedBy && (
        <p className="text-[10px] text-gray-400 text-right">
          Last verified by: <strong>{docRecord.verifiedBy.name}</strong>
        </p>
      )}
    </div>
  );
}
