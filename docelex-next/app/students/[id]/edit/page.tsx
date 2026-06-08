'use strict';
'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { StudentForm } from '@/components/student/StudentForm';
import { ChevronRight, Users, Loader2 } from 'lucide-react';

export default function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [student, setStudent] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const res = await fetch(`/api/students/${id}`);
        const result = await res.json();
        if (res.ok && result.success) {
          setStudent(result.data.student);
          setDocuments(result.data.documents || []);
        }
      } catch (err) {
        console.error('Error fetching student for edit:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudent();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-semibold">Loading student record fields...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <h3 className="text-lg font-bold">Student Record Not Found</h3>
        <p className="text-sm text-muted-foreground">The student profile does not exist.</p>
        <Link href="/students" className="text-xs font-semibold text-primary underline">
          Back to Students Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground bg-muted/30 border border-border/40 p-2.5 rounded-lg w-fit">
        <Link href="/students" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <Users className="h-3.5 w-3.5" />
          Students Directory
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/students/${id}`} className="hover:text-foreground transition-colors">
          {student.firstName} {student.surname}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Edit Profile</span>
      </div>

      {/* Header */}
      <div className="border-b border-border pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Edit Student Profile</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Modify demographic, Aadhaar, bank, or parent parameters for {student.firstName} {student.surname} (GR No: {student.grNumber}).
        </p>
      </div>

      {/* Form Container */}
      <StudentForm initialValues={student} initialDocuments={documents} isEditMode={true} />
    </div>
  );
}
