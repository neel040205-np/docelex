'use client';

import * as React from 'react';
import StudentForm from '@/components/StudentForm';
import { useRouter } from 'next/navigation';

export default function RegisterStudentPage() {
  const router = useRouter();

  const handleSuccess = (studentId: string) => {
    // Navigate to student vault to upload documents
    router.push(`/students/${studentId}`);
  };

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-50">Student Master Registration</h1>
        <p className="text-gray-500">Register a new student record in the master school database.</p>
      </div>

      <StudentForm onSubmitSuccess={handleSuccess} />
    </main>
  );
}
