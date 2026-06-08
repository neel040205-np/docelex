'use strict';

import React from 'react';
import Link from 'next/link';
import { StudentForm } from '@/components/student/StudentForm';
import { ChevronRight, Users } from 'lucide-react';

export default function RegisterStudentPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground bg-muted/30 border border-border/40 p-2.5 rounded-lg w-fit">
        <Link href="/students" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <Users className="h-3.5 w-3.5" />
          Students Directory
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">New Registration</span>
      </div>

      {/* Header Bio */}
      <div className="border-b border-border pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Register New Student</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Establish a new student master record. Complete basic demographics, Aadhaar details, bank beneficiary accounts, and parent vectors.
        </p>
      </div>

      {/* Form Container */}
      <StudentForm />
    </div>
  );
}
