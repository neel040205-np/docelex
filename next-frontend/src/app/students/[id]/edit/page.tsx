'use client';

import * as React from 'react';
import StudentForm from '@/components/StudentForm';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';

export default function EditStudentPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [studentData, setStudentData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadStudent() {
      try {
        const response = await api.get(`/students/${id}`);
        if (response.data?.success) {
          setStudentData(response.data.data);
        }
      } catch (err) {
        console.error(err);
        alert('Failed to load student data.');
        router.push('/students');
      } finally {
        setLoading(false);
      }
    }
    loadStudent();
  }, [id, router]);

  const handleSuccess = () => {
    router.push(`/students/${id}`);
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading student record...</div>;
  }

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-50">Edit Student Profile</h1>
        <p className="text-gray-500">Modify information for {studentData?.firstName} {studentData?.surname}.</p>
      </div>

      <StudentForm initialData={studentData} onSubmitSuccess={handleSuccess} />
    </main>
  );
}
