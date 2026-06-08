'use strict';
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Filter, 
  UserPlus, 
  Eye, 
  Edit, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface StudentListItem {
  _id: string;
  srNumber: string;
  grNumber: string;
  surname: string;
  firstName: string;
  fatherName: string;
  gender: string;
  class: string;
  division?: string;
  casteCategory: string;
  admissionDate: string;
  mobileNumber1: string;
  documentStats: {
    uploaded: number;
    verified: number;
    pending: number;
    rejected: number;
    totalRequired: number;
  };
  overallStatus: 'Pending' | 'Verified' | 'Rejected';
}

export default function StudentsDirectoryPage() {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [casteCategory, setCasteCategory] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');
  const [admissionYear, setAdmissionYear] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [classesList, setClassesList] = useState<string[]>([]);
  const [yearsList, setYearsList] = useState<string[]>([]);

  // Fetch student directory data
  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search,
        class: selectedClass,
        casteCategory,
        verificationStatus,
        admissionYear,
      });

      const res = await fetch(`/api/students?${queryParams.toString()}`);
      const result = await res.json();

      if (res.ok && result.success) {
        setStudents(result.data);
        setTotalPages(result.pagination.totalPages);
        setTotalRecords(result.pagination.total);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedClass, casteCategory, verificationStatus, admissionYear]);

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchStudents();
  };

  // Run initial lookup filters lists
  useEffect(() => {
    const loadFiltersData = async () => {
      try {
        const res = await fetch('/api/stats');
        const result = await res.json();
        if (res.ok && result.success) {
          // Extract class names
          const classes = result.stats.classDistribution.map((c: any) => c.className);
          setClassesList(classes);
        }
      } catch (err) {
        console.error(err);
      }

      // Generate range of past years for admission years
      const currentYear = new Date().getFullYear();
      const years = [];
      for (let y = currentYear; y >= currentYear - 10; y--) {
        years.push(y.toString());
      }
      setYearsList(years);
    };
    loadFiltersData();
  }, []);

  const handleDeleteStudent = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the student "${name}"? This will physically purge all uploaded document files as well.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/students/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchStudents();
      } else {
        const data = await res.json();
        alert(data.message || 'Deletion failed');
      }
    } catch (err) {
      console.error(err);
      alert('Network error deleting student record');
    }
  };

  // Overall status tag styling
  const getOverallStatusStyle = (status: string, stats: any) => {
    const allVerified = stats.uploaded === 11 && stats.verified === 11;
    const hasRejected = stats.rejected > 0;
    
    if (allVerified) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50';
    } else if (hasRejected) {
      return 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50';
    } else {
      return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50';
    }
  };

  const getOverallStatusText = (stats: any) => {
    if (stats.uploaded === 11 && stats.verified === 11) return 'Verified';
    if (stats.rejected > 0) return 'Rejected';
    return 'Pending';
  };

  return (
    <div className="space-y-6">
      {/* Upper action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Students Directory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Query and filter school records. Click details to upload or verify document files.
          </p>
        </div>
        <Link
          href="/students/register"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground text-sm font-semibold px-4 cursor-pointer shadow-sm transition-colors w-fit"
        >
          <UserPlus className="h-4 w-4" />
          New Student Registration
        </Link>
      </div>

      {/* Query Filter panel */}
      <Card className="border-border shadow-2xs">
        <CardContent className="p-5">
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Search input */}
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search Name, GR, SR, Aadhaar, Mobile..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>

              {/* Class Filter */}
              <div>
                <select
                  value={selectedClass}
                  onChange={(e) => { setSelectedClass(e.target.value); setPage(1); }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Filter by Class (All)</option>
                  {classesList.length > 0 ? (
                    classesList.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))
                  ) : (
                    // Default options if empty
                    Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))
                  )}
                </select>
              </div>

              {/* Caste Category */}
              <div>
                <select
                  value={casteCategory}
                  onChange={(e) => { setCasteCategory(e.target.value); setPage(1); }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Category (All)</option>
                  <option value="General">General</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                  <option value="EWS">EWS</option>
                </select>
              </div>

              {/* Status filter */}
              <div>
                <select
                  value={verificationStatus}
                  onChange={(e) => { setVerificationStatus(e.target.value); setPage(1); }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Status (All)</option>
                  <option value="Pending">Pending</option>
                  <option value="Verified">Verified</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-border/30">
              <div className="flex items-center gap-3">
                <select
                  value={admissionYear}
                  onChange={(e) => { setAdmissionYear(e.target.value); setPage(1); }}
                  className="flex h-9 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-semibold ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none"
                >
                  <option value="">Admission Year (All)</option>
                  {yearsList.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setSelectedClass('');
                    setCasteCategory('');
                    setVerificationStatus('');
                    setAdmissionYear('');
                    setPage(1);
                  }}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-border hover:bg-accent px-4 py-2 text-xs font-semibold text-muted-foreground cursor-pointer transition-colors"
                >
                  Clear Filters
                </button>
                <button
                  type="submit"
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-secondary hover:bg-muted text-secondary-foreground px-4 py-2 text-xs font-semibold cursor-pointer border border-border transition-colors"
                >
                  Apply Query
                </button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Directory Grid/Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-semibold">Loading student profiles directory...</p>
        </div>
      ) : students.length === 0 ? (
        <Card className="border-dashed border-border py-14 flex flex-col items-center justify-center text-center p-6 bg-card">
          <AlertCircle className="h-10 w-10 text-muted-foreground/60 mb-3" />
          <h3 className="font-bold text-foreground">No students found</h3>
          <p className="text-xs text-muted-foreground max-w-xs mt-1">
            Try adjusting search queries or filters. Alternatively, register a new student using the button above.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="border border-border rounded-xl bg-card overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-zinc-900/40 text-muted-foreground font-bold border-b border-border text-xs uppercase tracking-wider">
                    <th className="px-6 py-4">GR / SR No.</th>
                    <th className="px-6 py-4">Student Name</th>
                    <th className="px-6 py-4">Class</th>
                    <th className="px-6 py-4">Caste Category</th>
                    <th className="px-6 py-4">Mobile</th>
                    <th className="px-6 py-4">Files Vault</th>
                    <th className="px-6 py-4">Overall Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {students.map((student) => {
                    const statusText = getOverallStatusText(student.documentStats);
                    const tagStyle = getOverallStatusStyle(statusText, student.documentStats);

                    return (
                      <tr key={student._id} className="hover:bg-accent/30 transition-colors">
                        <td className="px-6 py-4 font-semibold text-xs whitespace-nowrap">
                          <div className="font-mono text-foreground">{student.grNumber}</div>
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">SR: {student.srNumber}</div>
                        </td>
                        <td className="px-6 py-4 font-bold text-foreground whitespace-nowrap">
                          {student.surname} {student.firstName} {student.fatherName}
                        </td>
                        <td className="px-6 py-4 font-medium text-foreground">
                          {student.class} {student.division && `(${student.division})`}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-muted border border-border/70 rounded-md text-foreground">
                            {student.casteCategory}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                          {student.mobileNumber1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-foreground">
                              {student.documentStats.uploaded} / 11
                            </span>
                            <span className="text-[10px] text-muted-foreground">files</span>
                            {/* Simple completion mini progress bar */}
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden ml-1 hidden sm:block border border-border/40">
                              <div 
                                className="h-full bg-primary rounded-full" 
                                style={{ width: `${(student.documentStats.uploaded / 11) * 100}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${tagStyle}`}>
                            {statusText}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                          <Link
                            href={`/students/${student._id}`}
                            className="inline-flex h-8 items-center justify-center rounded-lg border border-border hover:bg-accent px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                            title="View Profile Vault"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                          <Link
                            href={`/students/${student._id}/edit`}
                            className="inline-flex h-8 items-center justify-center rounded-lg border border-border hover:bg-accent px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                            title="Edit Profile"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDeleteStudent(student._id, `${student.firstName} ${student.surname}`)}
                            className="inline-flex h-8 items-center justify-center rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-950/45 dark:text-rose-400 px-2.5 text-xs font-semibold border border-rose-100 dark:border-rose-900/50 cursor-pointer transition-colors"
                            title="Delete Student"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between py-2.5 px-4 bg-card border border-border rounded-xl shadow-2xs">
              <span className="text-xs text-muted-foreground font-semibold">
                Showing page <strong className="text-foreground">{page}</strong> of <strong className="text-foreground">{totalPages}</strong> ({totalRecords} records)
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-accent disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-accent disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
