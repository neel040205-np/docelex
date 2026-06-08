'use strict';
'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { 
  Users, 
  ChevronRight, 
  Edit, 
  FileText, 
  Check, 
  X, 
  AlertCircle,
  HelpCircle,
  FileCheck2,
  Calendar,
  Contact,
  CreditCard,
  Building,
  PhoneCall,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DocumentUploadZone } from '@/components/student/DocumentUploadZone';
import { DocumentPreviewModal } from '@/components/student/DocumentPreviewModal';

interface StudentDetails {
  _id: string;
  srNumber: string;
  grNumber: string;
  surname: string;
  firstName: string;
  fatherName: string;
  grandFatherName: string;
  motherName: string;
  gender: string;
  dob: string;
  admissionDate: string;
  class: string;
  division?: string;
  caste: string;
  casteCategory: string;
  penNumber?: string;
  apaarId?: string;
  udiseNumber?: string;
  nameAsPerChildTracking?: string;
  nameAsPerUdisePlus?: string;
  aadhaarNumber: string;
  nameAsPerAadhaar: string;
  dobAsPerAadhaar: string;
  bankAccountNumber: string;
  ifscCode: string;
  accountHolderName: string;
  motherAadhaar: string;
  fatherAadhaar: string;
  mobileNumber1: string;
  mobileNumber2?: string;
  createdAt: string;
}

interface DocumentRecord {
  _id: string;
  studentId: string;
  documentType: string;
  fileUrl: string;
  publicId: string;
  uploadDate: string;
  status: 'Pending' | 'Verified' | 'Rejected';
  remarks?: string;
  verifiedBy?: string;
}

const REQUIRED_DOCUMENTS = [
  { type: 'birthCertificate', label: 'Birth Certificate' },
  { type: 'incomeCertificate', label: 'Income Certificate' },
  { type: 'rationCard', label: 'Ration Card' },
  { type: 'studentCasteCertificate', label: 'Student Caste Certificate' },
  { type: 'fatherCasteCertificate', label: 'Father Caste Certificate' },
  { type: 'studentBankPassbook', label: 'Student Bank Passbook' },
  { type: 'fatherBankPassbook', label: 'Father Bank Passbook' },
  { type: 'motherBankPassbook', label: 'Mother Bank Passbook' },
  { type: 'motherAadhaar', label: 'Mother Aadhaar' },
  { type: 'fatherAadhaar', label: 'Father Aadhaar' },
  { type: 'studentAadhaar', label: 'Student Aadhaar' },
];

export default function StudentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeInfoTab, setActiveInfoTab] = useState<'basic' | 'bank' | 'family'>('basic');

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');

  // Verification Remarks state
  const [verificationRemarks, setVerificationRemarks] = useState<{ [key: string]: string }>({});
  const [verificationLoading, setVerificationLoading] = useState<{ [key: string]: boolean }>({});

  const fetchStudentData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/students/${id}`);
      const result = await res.json();
      if (res.ok && result.success) {
        setStudent(result.data.student);
        setDocuments(result.data.documents);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleVerifyDocument = async (docId: string, status: 'Verified' | 'Rejected', docType: string) => {
    setVerificationLoading((prev) => ({ ...prev, [docId]: true }));
    const remarks = verificationRemarks[docId] || '';

    try {
      const res = await fetch(`/api/documents/${docId}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          remarks,
          verifiedBy: 'Administrator', // Mock verifier
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Verification update failed');
      }

      // Clear remarks field for this document
      setVerificationRemarks((prev) => ({ ...prev, [docId]: '' }));
      // Reload profile documents
      fetchStudentData();
    } catch (err: any) {
      alert(err.message || 'Failed to update verification status');
    } finally {
      setVerificationLoading((prev) => ({ ...prev, [docId]: false }));
    }
  };

  const handlePreviewClick = (url: string, title: string) => {
    setPreviewUrl(url);
    setPreviewTitle(title);
    setPreviewOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-semibold">Loading student profile record...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <h3 className="text-lg font-bold">Student Record Not Found</h3>
        <p className="text-sm text-muted-foreground">The requested record does not exist or has been deleted.</p>
        <Link href="/students" className="mt-2 text-xs font-semibold text-primary underline">
          Back to Student Directory
        </Link>
      </div>
    );
  }

  // Completeness calculations
  const uploadedCount = documents.length;
  const verifiedCount = documents.filter((d) => d.status === 'Verified').length;
  const rejectedCount = documents.filter((d) => d.status === 'Rejected').length;
  const completenessRate = Math.round((uploadedCount / 11) * 100);

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground bg-muted/30 border border-border/40 p-2.5 rounded-lg w-fit">
        <Link href="/students" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <Users className="h-3.5 w-3.5" />
          Students Directory
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{student.firstName} {student.surname}</span>
      </div>

      {/* Header Info Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border border-border bg-card rounded-2xl p-6 gap-6 shadow-2xs">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/5 text-primary border border-primary/10">
            <Contact className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {student.surname} {student.firstName} {student.fatherName}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold text-muted-foreground mt-1.5">
              <span className="font-mono bg-muted px-2 py-0.5 rounded-md text-foreground">GR No: {student.grNumber}</span>
              <span className="font-mono bg-muted px-2 py-0.5 rounded-md text-foreground">SR No: {student.srNumber}</span>
              <span className="bg-primary/5 text-primary border border-primary/10 px-2 py-0.5 rounded-md">
                {student.class} {student.division && `(${student.division})`}
              </span>
            </div>
          </div>
        </div>

        {/* Completeness rate display */}
        <div className="flex items-center gap-5 border-t border-border pt-4 md:border-t-0 md:pt-0">
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs font-bold text-foreground">
              <span>Vault Completeness</span>
              <span className="ml-6 text-primary">{completenessRate}%</span>
            </div>
            <div className="w-48 h-2 bg-muted rounded-full overflow-hidden border border-border/30">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${completenessRate}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground font-semibold">
              {uploadedCount} of 11 files uploaded ({verifiedCount} verified, {rejectedCount} rejected)
            </p>
          </div>

          <Link
            href={`/students/${student._id}/edit`}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground text-xs font-semibold px-4 cursor-pointer transition-colors"
          >
            <Edit className="h-4 w-4" />
            Edit Profile
          </Link>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left side details card (1/3 width) */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-border shadow-2xs">
            <CardHeader className="border-b border-border bg-slate-50/50 p-4">
              <div className="flex gap-1.5 bg-muted p-1 rounded-lg">
                {(['basic', 'bank', 'family'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveInfoTab(tab)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md capitalize transition-all cursor-pointer ${
                      activeInfoTab === tab 
                        ? 'bg-background text-foreground shadow-xs' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab === 'basic' ? 'Basic' : tab === 'bank' ? 'Bank/Aadhaar' : 'Family'}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-5 text-sm space-y-4">
              {activeInfoTab === 'basic' && (
                <div className="space-y-4">
                  <div className="border-b border-border/40 pb-2">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Full Name</span>
                    <p className="font-bold text-foreground mt-0.5">{student.surname} {student.firstName} {student.fatherName} {student.grandFatherName}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Gender</span>
                      <p className="font-semibold text-foreground mt-0.5">{student.gender}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">DOB</span>
                      <p className="font-semibold text-foreground mt-0.5">{new Date(student.dob).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Caste</span>
                      <p className="font-semibold text-foreground mt-0.5">{student.caste}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Caste Category</span>
                      <p className="font-semibold text-foreground mt-0.5">{student.casteCategory}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Admission Date</span>
                      <p className="font-semibold text-foreground mt-0.5">{new Date(student.admissionDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">PEN Number</span>
                      <p className="font-mono text-xs text-foreground mt-0.5">{student.penNumber || '—'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-4">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">APAAR ID</span>
                      <p className="font-mono text-xs text-foreground mt-0.5">{student.apaarId || '—'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">UDISE Number</span>
                      <p className="font-mono text-xs text-foreground mt-0.5">{student.udiseNumber || '—'}</p>
                    </div>
                  </div>
                  <div className="space-y-3 border-t border-border/40 pt-4">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Tracking Portal Name</span>
                      <p className="text-xs font-semibold text-foreground mt-0.5">{student.nameAsPerChildTracking || '—'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">UDISE+ Portal Name</span>
                      <p className="text-xs font-semibold text-foreground mt-0.5">{student.nameAsPerUdisePlus || '—'}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeInfoTab === 'bank' && (
                <div className="space-y-4">
                  {/* Bank info */}
                  <div className="border-b border-border/40 pb-3">
                    <h5 className="flex items-center gap-1.5 font-bold text-xs text-primary mb-3">
                      <Building className="h-4 w-4" />
                      BANK SUBSIDY ACCOUNT
                    </h5>
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Beneficiary Account Number</span>
                        <p className="font-mono text-sm text-foreground mt-0.5">{student.bankAccountNumber}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">IFSC Code</span>
                          <p className="font-mono text-xs text-foreground mt-0.5 uppercase">{student.ifscCode}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Holder Name</span>
                          <p className="font-semibold text-xs text-foreground mt-0.5 truncate">{student.accountHolderName}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Aadhaar info */}
                  <div>
                    <h5 className="flex items-center gap-1.5 font-bold text-xs text-primary mb-3">
                      <CreditCard className="h-4 w-4" />
                      AADHAAR CARD RECORDS
                    </h5>
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Student Aadhaar (12 digits)</span>
                        <p className="font-mono text-sm text-foreground mt-0.5">{student.aadhaarNumber.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3')}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Name on Aadhaar</span>
                        <p className="font-semibold text-xs text-foreground mt-0.5">{student.nameAsPerAadhaar}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">DOB on Aadhaar</span>
                        <p className="font-semibold text-xs text-foreground mt-0.5">{new Date(student.dobAsPerAadhaar).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeInfoTab === 'family' && (
                <div className="space-y-4">
                  <div className="space-y-3.5">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Father's Aadhaar Number</span>
                      <p className="font-mono text-sm text-foreground mt-0.5">{student.fatherAadhaar.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3')}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Mother's Aadhaar Number</span>
                      <p className="font-mono text-sm text-foreground mt-0.5">{student.motherAadhaar.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3')}</p>
                    </div>
                  </div>

                  <div className="border-t border-border/40 pt-4 space-y-3.5">
                    <h5 className="flex items-center gap-1.5 font-bold text-xs text-primary">
                      <PhoneCall className="h-4 w-4" />
                      COMMUNICATION CHANNELS
                    </h5>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Primary Mobile Number 1</span>
                      <p className="font-mono text-sm text-foreground mt-0.5">{student.mobileNumber1}</p>
                    </div>
                    {student.mobileNumber2 && (
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Secondary Mobile Number 2</span>
                        <p className="font-mono text-sm text-foreground mt-0.5">{student.mobileNumber2}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right side document vault grid (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-primary" />
              Document Vault & Verification Controls
            </h3>
            <span className="text-xs text-muted-foreground font-semibold">11 Required Documents</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {REQUIRED_DOCUMENTS.map((docInfo) => {
              const docRecord = documents.find((d) => d.documentType === docInfo.type);

              return (
                <div key={docInfo.type} className="flex flex-col space-y-3">
                  <DocumentUploadZone
                    studentId={student._id}
                    documentType={docInfo.type}
                    documentLabel={docInfo.label}
                    existingDocument={docRecord}
                    onUploadSuccess={fetchStudentData}
                    onPreviewClick={handlePreviewClick}
                  />

                  {/* Verification Workflow Panel (if uploaded) */}
                  {docRecord && (
                    <div className="border border-border/60 bg-muted/20 rounded-xl p-4 space-y-3 text-xs -mt-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground flex items-center gap-1">
                          Verifier Panel
                        </span>
                        {docRecord.verifiedBy && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            By: {docRecord.verifiedBy}
                          </span>
                        )}
                      </div>

                      {/* Remarks input */}
                      <div className="space-y-1">
                        <input
                          type="text"
                          placeholder={docRecord.status === 'Rejected' ? 'Add rejection reason...' : 'Add verification notes...'}
                          value={verificationRemarks[docRecord._id] ?? docRecord.remarks ?? ''}
                          onChange={(e) => setVerificationRemarks((prev) => ({
                            ...prev,
                            [docRecord._id]: e.target.value,
                          }))}
                          className="w-full h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-1.5">
                        {/* Approve */}
                        <button
                          onClick={() => handleVerifyDocument(docRecord._id, 'Verified', docInfo.label)}
                          disabled={verificationLoading[docRecord._id]}
                          className={`flex-1 inline-flex h-8 items-center justify-center gap-1 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                            docRecord.status === 'Verified'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white hover:bg-slate-50 text-emerald-700 border-emerald-200 dark:bg-zinc-900 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Approve
                        </button>

                        {/* Reject */}
                        <button
                          onClick={() => handleVerifyDocument(docRecord._id, 'Rejected', docInfo.label)}
                          disabled={verificationLoading[docRecord._id]}
                          className={`flex-1 inline-flex h-8 items-center justify-center gap-1 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                            docRecord.status === 'Rejected'
                              ? 'bg-rose-600 text-white border-rose-600'
                              : 'bg-white hover:bg-slate-50 text-rose-700 border-rose-200 dark:bg-zinc-900 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <X className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lightbox Preview Modal */}
      <DocumentPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        fileUrl={previewUrl}
        documentTitle={previewTitle}
      />
    </div>
  );
}
