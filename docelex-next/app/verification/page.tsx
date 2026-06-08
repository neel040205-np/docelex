'use strict';
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  FileCheck2, 
  Eye, 
  Check, 
  X, 
  Loader2, 
  AlertCircle,
  FileText,
  User,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DocumentPreviewModal } from '@/components/student/DocumentPreviewModal';

interface StudentSnippet {
  _id: string;
  grNumber: string;
  srNumber: string;
  firstName: string;
  surname: string;
  fatherName: string;
  class: string;
  division?: string;
}

interface PendingDocument {
  _id: string;
  studentId: StudentSnippet;
  documentType: string;
  fileUrl: string;
  publicId: string;
  uploadDate: string;
  status: 'Pending' | 'Verified' | 'Rejected';
  remarks?: string;
  verifiedBy?: string;
}

const DOCUMENT_LABELS: { [key: string]: string } = {
  birthCertificate: 'Birth Certificate',
  incomeCertificate: 'Income Certificate',
  rationCard: 'Ration Card',
  studentCasteCertificate: 'Student Caste Certificate',
  fatherCasteCertificate: 'Father Caste Certificate',
  studentBankPassbook: 'Student Bank Passbook',
  fatherBankPassbook: 'Father Bank Passbook',
  motherBankPassbook: 'Mother Bank Passbook',
  motherAadhaar: 'Mother Aadhaar',
  fatherAadhaar: 'Father Aadhaar',
  studentAadhaar: 'Student Aadhaar',
};

export default function VerificationQueuePage() {
  const [pendingDocs, setPendingDocs] = useState<PendingDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');

  // Remarks state
  const [remarksState, setRemarksState] = useState<{ [key: string]: string }>({});
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});

  const fetchPendingDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/documents/pending');
      const result = await res.json();
      if (res.ok && result.success) {
        setPendingDocs(result.data);
      }
    } catch (err) {
      console.error('Error fetching pending docs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingDocuments();
  }, []);

  const handleVerify = async (docId: string, status: 'Verified' | 'Rejected', docLabel: string, studentName: string) => {
    setActionLoading((prev) => ({ ...prev, [docId]: true }));
    const remarks = remarksState[docId] || '';

    try {
      const res = await fetch(`/api/documents/${docId}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          remarks,
          verifiedBy: 'Administrator',
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Verification update failed');
      }

      // Remove the document from local pending list state
      setPendingDocs((prev) => prev.filter((doc) => doc._id !== docId));
    } catch (err: any) {
      alert(err.message || 'Failed to update verification status');
    } finally {
      setActionLoading((prev) => ({ ...prev, [docId]: false }));
    }
  };

  const openPreview = (url: string, type: string, studentName: string) => {
    setPreviewUrl(url);
    const label = DOCUMENT_LABELS[type] || type;
    setPreviewTitle(`${label} — ${studentName}`);
    setPreviewOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Verification Queue</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Centralized workspace for document evaluation. Review, preview, and approve or reject pending documents.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-semibold">Loading verification queue...</p>
        </div>
      ) : pendingDocs.length === 0 ? (
        <Card className="border-dashed border-border py-16 flex flex-col items-center justify-center text-center p-6 bg-card">
          <FileCheck2 className="h-10 w-10 text-emerald-600 mb-3 bg-emerald-50 dark:bg-emerald-950/20 p-2 rounded-xl" />
          <h3 className="font-bold text-foreground">Queue is empty!</h3>
          <p className="text-xs text-muted-foreground max-w-xs mt-1">
            All uploaded document files have been successfully evaluated and processed.
          </p>
        </Card>
      ) : (
        <div className="border border-border rounded-xl bg-card overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-zinc-900/40 text-muted-foreground font-bold border-b border-border text-xs uppercase tracking-wider">
                  <th className="px-6 py-4">Student Name</th>
                  <th className="px-6 py-4">GR / Class</th>
                  <th className="px-6 py-4">Document Type</th>
                  <th className="px-6 py-4">Uploaded Date</th>
                  <th className="px-6 py-4">Preview</th>
                  <th className="px-6 py-4">Verification Remarks</th>
                  <th className="px-6 py-4 text-right">Decisions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pendingDocs.map((doc) => {
                  const student = doc.studentId;
                  if (!student) return null; // Fallback if student record missing
                  
                  const studentName = `${student.firstName} ${student.surname}`;
                  const docLabel = DOCUMENT_LABELS[doc.documentType] || doc.documentType;

                  return (
                    <tr key={doc._id} className="hover:bg-accent/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-foreground whitespace-nowrap">
                        <Link href={`/students/${student._id}`} className="hover:underline flex items-center gap-1.5 text-primary">
                          <User className="h-4 w-4 shrink-0" />
                          {studentName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold">
                        <div className="font-mono text-foreground">{student.grNumber}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{student.class}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-foreground whitespace-nowrap">
                        {docLabel}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                        {new Date(doc.uploadDate).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openPreview(doc.fileUrl, doc.documentType, studentName)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground text-xs font-semibold px-2.5 cursor-pointer transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View File
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          placeholder="Rejection reason / remarks..."
                          value={remarksState[doc._id] || ''}
                          onChange={(e) => setRemarksState((prev) => ({
                            ...prev,
                            [doc._id]: e.target.value,
                          }))}
                          className="w-full max-w-[200px] h-9 rounded-md border border-input bg-background px-3 py-1 text-xs outline-none focus:ring-1 focus:ring-primary"
                        />
                      </td>
                      <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleVerify(doc._id, 'Verified', docLabel, studentName)}
                          disabled={actionLoading[doc._id]}
                          className="inline-flex h-8 items-center gap-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3.5 cursor-pointer transition-colors shadow-sm"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleVerify(doc._id, 'Rejected', docLabel, studentName)}
                          disabled={actionLoading[doc._id]}
                          className="inline-flex h-8 items-center gap-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold px-3.5 cursor-pointer transition-colors shadow-sm"
                        >
                          <X className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lightbox Preview */}
      <DocumentPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        fileUrl={previewUrl}
        documentTitle={previewTitle}
      />
    </div>
  );
}
