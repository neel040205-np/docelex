'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Edit } from 'lucide-react';
import Link from 'next/link';
import DocumentUpload from '@/components/DocumentUpload';
import VerificationPanel from '@/components/VerificationPanel';
import api from '@/lib/api';

const REQUIRED_DOCUMENTS = [
  { key: 'birthCertificate', name: 'Birth Certificate' },
  { key: 'incomeCertificate', name: 'Income Certificate' },
  { key: 'rationCard', name: 'Ration Card' },
  { key: 'studentCasteCertificate', name: 'Student Caste Certificate' },
  { key: 'fatherCasteCertificate', name: 'Father Caste Certificate' },
  { key: 'studentBankPassbook', name: 'Student Bank Passbook' },
  { key: 'fatherBankPassbook', name: 'Father Bank Passbook' },
  { key: 'motherBankPassbook', name: 'Mother Bank Passbook' },
  { key: 'motherAadhaar', name: 'Mother Aadhaar' },
  { key: 'fatherAadhaar', name: 'Father Aadhaar' },
  { key: 'studentAadhaar', name: 'Student Aadhaar' },
];

export default function StudentDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [student, setStudent] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchStudentDetails = React.useCallback(async () => {
    try {
      const response = await api.get(`/students/${id}`);
      if (response.data?.success) {
        setStudent(response.data.data);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load student records.');
      router.push('/students');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  React.useEffect(() => {
    fetchStudentDetails();
  }, [fetchStudentDetails]);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading student dossier...</div>;
  }

  // Calculate stats
  const docs = student?.documents || {};
  const totalRequired = REQUIRED_DOCUMENTS.length;
  const uploadedCount = Object.keys(docs).length;
  const verifiedCount = Object.values(docs).filter((d: any) => d.status === 'Verified').length;
  const rejectedCount = Object.values(docs).filter((d: any) => d.status === 'Rejected').length;

  let overallStatus = 'Pending';
  let badgeVariant = 'warning';
  if (rejectedCount > 0) {
    overallStatus = 'Rejected';
    badgeVariant = 'destructive';
  } else if (verifiedCount === totalRequired) {
    overallStatus = 'Verified';
    badgeVariant = 'success';
  }

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Back navigation & actions */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <Link href="/students">
          <Button variant="ghost" className="flex items-center gap-2">
            <ArrowLeft size={16} /> Back to Directory
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api'}/students/${id}/download-documents?token=${localStorage.getItem('token')}`)}
            className="flex items-center gap-2"
          >
            <Download size={16} /> Download All Files
          </Button>
          <Link href={`/students/${id}/edit`}>
            <Button className="flex items-center gap-2 bg-indigo-600 text-white">
              <Edit size={16} /> Edit Student Profile
            </Button>
          </Link>
        </div>
      </div>

      {/* Student Profile Header Card */}
      <Card>
        <CardContent className="p-6 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-950 dark:text-gray-50">
              {student.firstName} {student.surname}
            </h2>
            <p className="text-sm text-gray-500">
              SR Number: <strong className="text-gray-950 dark:text-gray-50">{student.srNumber}</strong> | 
              GR Number: <strong className="text-gray-950 dark:text-gray-50">{student.grNumber}</strong>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-xs text-gray-500">Verification Rate</span>
              <p className="font-semibold text-sm">{verifiedCount} of {totalRequired} Approved</p>
            </div>
            <Badge variant={badgeVariant as any} className="text-sm px-3 py-1">
              {overallStatus}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid grid-cols-3 w-full mb-6">
          <TabsTrigger value="profile">Student Profile Info</TabsTrigger>
          <TabsTrigger value="uploads">Document Vault & Uploads</TabsTrigger>
          <TabsTrigger value="verification">Verification Dashboard</TabsTrigger>
        </TabsList>

        {/* Tab 1: Profile Details */}
        <TabsContent value="profile" className="space-y-6">
          {/* Section 1: Basic details */}
          <Card>
            <CardHeader>
              <CardTitle>Academic & Personal Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6 text-sm">
                <div>
                  <span className="text-xs text-gray-400">Full Name</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{student.firstName} {student.surname}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">Father's Name</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{student.fatherName}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">Grand Father's Name</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{student.grandFatherName}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">Mother's Name</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{student.motherName}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">Gender</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{student.gender}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">Date of Birth</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    {student.dob ? new Date(student.dob).toLocaleDateString() : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">Admission Date</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    {student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">Category & Caste</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{student.casteCategory} ({student.caste})</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">PEN Number</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{student.penNumber || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">APAAR ID</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{student.apaarId || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">UDISE Number</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{student.udiseNumber || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">Name in Tracking / UDISE</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200 text-xs">
                    {student.nameAsPerChildTracking || 'N/A'} / {student.nameAsPerUdisePlus || 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Aadhaar Info */}
          <Card>
            <CardHeader>
              <CardTitle>Aadhaar Card Demographics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-sm">
                <div>
                  <span className="text-xs text-gray-400">Aadhaar Number</span>
                  <p className="font-mono font-medium text-gray-800 dark:text-gray-200">{student.aadhaarNumber}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">Name as per Aadhaar</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{student.aadhaarName}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">DOB as per Aadhaar</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    {student.aadhaarDob ? new Date(student.aadhaarDob).toLocaleDateString() : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Bank Details */}
          <Card>
            <CardHeader>
              <CardTitle>Student Bank Account Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-sm">
                <div>
                  <span className="text-xs text-gray-400">Bank Account Number</span>
                  <p className="font-mono font-medium text-gray-800 dark:text-gray-200">{student.bankAccountNumber}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">IFSC Code</span>
                  <p className="font-mono font-medium text-gray-800 dark:text-gray-200">{student.bankIfscCode}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">Account Holder Name</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{student.bankAccountHolderName}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Family Details */}
          <Card>
            <CardHeader>
              <CardTitle>Family Identifiers & Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6 text-sm">
                <div>
                  <span className="text-xs text-gray-400">Mother's Aadhaar</span>
                  <p className="font-mono font-medium text-gray-800 dark:text-gray-200">{student.motherAadhaarNumber}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">Father's Aadhaar</span>
                  <p className="font-mono font-medium text-gray-800 dark:text-gray-200">{student.fatherAadhaarNumber}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">Primary Mobile 1</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{student.mobileNumber1}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">Secondary Mobile 2</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{student.mobileNumber2 || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Documents Vault */}
        <TabsContent value="uploads">
          <Card>
            <CardHeader>
              <CardTitle>Document Vault</CardTitle>
              <CardDescription>Upload and manage the 11 mandated student document files.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {REQUIRED_DOCUMENTS.map((doc) => (
                  <DocumentUpload
                    key={doc.key}
                    studentId={id}
                    documentType={doc.key}
                    documentName={doc.name}
                    docRecord={docs[doc.key]}
                    onUploadSuccess={fetchStudentDetails}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Verification Workflow */}
        <TabsContent value="verification">
          <Card>
            <CardHeader>
              <CardTitle>Verification Workflow Panel</CardTitle>
              <CardDescription>Review uploaded documents and approve/reject with verifier remarks.</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(docs).length === 0 ? (
                <div className="text-center py-12 text-gray-500">No documents have been uploaded for this student yet.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {REQUIRED_DOCUMENTS.map((doc) => {
                    const record = docs[doc.key];
                    if (!record) return null; // Only show uploaded files in verification panel
                    return (
                      <VerificationPanel
                        key={doc.key}
                        studentId={id}
                        documentType={doc.key}
                        documentName={doc.name}
                        docRecord={record}
                        onVerificationUpdate={fetchStudentDetails}
                      />
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
