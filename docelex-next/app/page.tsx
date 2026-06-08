'use strict';
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Users, 
  FileCheck2, 
  FileX2, 
  Clock, 
  Percent, 
  UserPlus, 
  ArrowRight,
  School,
  FolderOpen,
  PieChart,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface StatsData {
  totalStudents: number;
  totalUploaded: number;
  completenessRate: number;
  pendingVerifications: number;
  verifiedDocs: number;
  rejectedDocs: number;
  casteCategoryCounts: {
    General: number;
    OBC: number;
    SC: number;
    ST: number;
    EWS: number;
  };
  classDistribution: {
    className: string;
    count: number;
  }[];
  docTypeSummary: {
    _id: string;
    verified: number;
    pending: number;
    rejected: number;
    total: number;
  }[];
}

const DOCUMENT_NAMES: { [key: string]: string } = {
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

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats');
        const result = await res.json();
        if (res.ok && result.success) {
          setStats(result.stats);
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-semibold">Generating dashboard statistics...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-20">
        <h3 className="text-lg font-bold">Failed to load statistics</h3>
        <p className="text-sm text-muted-foreground">Please ensure the database connection is running.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-primary/5 rounded-2xl border border-primary/10 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">School ERP Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
            Welcome to the DocElex Student Master Document Repository. Manage registration profiles, track file uploads, and evaluate verification claims.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/students/register"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold px-4 cursor-pointer shadow-xs transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Register Student
          </Link>
          <Link
            href="/students"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border hover:bg-accent text-xs font-semibold px-4 cursor-pointer transition-colors bg-card"
          >
            View Directory
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Students */}
        <Card className="border-border shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Students</span>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-[10px] text-muted-foreground font-semibold mt-1">Registered in database</p>
          </CardContent>
        </Card>

        {/* Completeness */}
        <Card className="border-border shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Completeness</span>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completenessRate}%</div>
            <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-1.5">
              <div className="h-full bg-primary" style={{ width: `${stats.completenessRate}%` }} />
            </div>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card className="border-border shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pending Docs</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pendingVerifications}</div>
            <p className="text-[10px] text-muted-foreground font-semibold mt-1">Awaiting evaluation</p>
          </CardContent>
        </Card>

        {/* Verified */}
        <Card className="border-border shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Verified Docs</span>
            <FileCheck2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.verifiedDocs}</div>
            <p className="text-[10px] text-muted-foreground font-semibold mt-1">Approved document files</p>
          </CardContent>
        </Card>

        {/* Rejected */}
        <Card className="border-border shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Rejected Docs</span>
            <FileX2 className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.rejectedDocs}</div>
            <p className="text-[10px] text-muted-foreground font-semibold mt-1">Disapproved (requires re-upload)</p>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Class distributions and Caste breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class distribution (2/3 width) */}
        <Card className="lg:col-span-2 border-border shadow-2xs">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <School className="h-4.5 w-4.5 text-primary" />
              Academic Class Enrollments
            </CardTitle>
            <CardDescription>Visual breakdown of registered student counts by class.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {stats.classDistribution.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-10">No class distribution records registered.</p>
            ) : (
              <div className="space-y-4">
                {stats.classDistribution.map((item) => {
                  const maxCount = Math.max(...stats.classDistribution.map((c) => c.count), 1);
                  const percentage = Math.round((item.count / maxCount) * 100);

                  return (
                    <div key={item.className} className="flex items-center gap-4 text-xs font-semibold">
                      <span className="w-20 truncate text-foreground">{item.className}</span>
                      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden border border-border/20">
                        <div 
                          className="h-full bg-primary rounded-full" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-muted-foreground">
                        {item.count} <span className="text-[10px]">stud.</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Caste breakdown (1/3 width) */}
        <Card className="border-border shadow-2xs">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <PieChart className="h-4.5 w-4.5 text-primary" />
              Caste Demographics
            </CardTitle>
            <CardDescription>Distribution counts by caste category.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {Object.entries(stats.casteCategoryCounts).map(([category, count]) => {
                const total = stats.totalStudents || 1;
                const pct = Math.round((count / total) * 100);

                return (
                  <div key={category} className="flex items-center justify-between px-5 py-3.5 text-xs">
                    <span className="font-bold text-foreground">{category}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-muted-foreground">{count} records</span>
                      <span className="inline-flex items-center justify-center bg-primary/5 text-primary border border-primary/10 rounded-md font-bold px-2 py-0.5 text-[10px] w-10">
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Types Vault status list */}
      <Card className="border-border shadow-2xs">
        <CardHeader className="border-b border-border/60 pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <FolderOpen className="h-4.5 w-4.5 text-primary" />
            File Vault Verification Audit
          </CardTitle>
          <CardDescription>Evaluation statistics aggregated by required document types.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-zinc-900/40 text-muted-foreground font-bold border-b border-border text-[10px] uppercase tracking-wider">
                  <th className="px-6 py-3.5">Document Type</th>
                  <th className="px-6 py-3.5 text-center">Approved (Verified)</th>
                  <th className="px-6 py-3.5 text-center">Evaluating (Pending)</th>
                  <th className="px-6 py-3.5 text-center">Disapproved (Rejected)</th>
                  <th className="px-6 py-3.5 text-right">Total Uploads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {stats.docTypeSummary.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">No documents uploaded yet.</td>
                  </tr>
                ) : (
                  stats.docTypeSummary.map((doc) => {
                    const docLabel = DOCUMENT_NAMES[doc._id] || doc._id;

                    return (
                      <tr key={doc._id} className="hover:bg-accent/30 transition-colors">
                        <td className="px-6 py-3 font-bold text-foreground">{docLabel}</td>
                        <td className="px-6 py-3 text-center text-emerald-600 font-bold">{doc.verified}</td>
                        <td className="px-6 py-3 text-center text-amber-600 font-bold">{doc.pending}</td>
                        <td className="px-6 py-3 text-center text-rose-600 font-bold">{doc.rejected}</td>
                        <td className="px-6 py-3 text-right font-bold text-foreground">{doc.total}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
