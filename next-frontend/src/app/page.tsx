'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, FolderOpen, Plus, Search, Users } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

export default function DashboardPage() {
  const [stats, setStats] = React.useState({
    total: 0,
    verified: 0,
    pending: 0,
    rejected: 0,
  });
  const [recentPending, setRecentPending] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadDashboardData() {
      try {
        const [statsRes, studentsRes] = await Promise.all([
          api.get('/stats').catch(() => ({ data: { data: { totalStudents: 0, completeRecords: 0 } } })),
          api.get('/students', { params: { verificationStatus: 'Pending', limit: 5 } }),
        ]);

        if (statsRes.data?.success) {
          const s = statsRes.data.data;
          setStats({
            total: s.totalStudents || 0,
            verified: s.completeRecords || 0,
            pending: s.incompleteRecords || 0,
            rejected: s.missingDocuments || 0,
          });
        }
        
        if (studentsRes.data?.success) {
          setRecentPending(studentsRes.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load dashboard statistics', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  return (
    <main className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-50">DocElex</h1>
          <p className="text-gray-500">Secure Student Registry & Document Verification Platform</p>
        </div>
        <div className="flex gap-3">
          <Link href="/students">
            <Button variant="outline" className="flex items-center gap-2">
              <Search size={16} /> Search Directory
            </Button>
          </Link>
          <Link href="/students/register">
            <Button className="flex items-center gap-2 bg-indigo-600 text-white">
              <Plus size={16} /> Register Student
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Registered</CardTitle>
            <Users size={18} className="text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.total}</div>
            <p className="text-xs text-gray-400 mt-1">Student master records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Complete & Verified</CardTitle>
            <CheckCircle size={18} className="text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.verified}</div>
            <p className="text-xs text-green-500 mt-1">11/11 documents approved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Pending Verification</CardTitle>
            <AlertCircle size={18} className="text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.pending}</div>
            <p className="text-xs text-yellow-500 mt-1">Pending approval pipeline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Rejected / Fix Needed</CardTitle>
            <FolderOpen size={18} className="text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.rejected}</div>
            <p className="text-xs text-red-500 mt-1">Remarks added for correction</p>
          </CardContent>
        </Card>
      </div>

      {/* Verification Queue Table */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Queue</CardTitle>
          <CardDescription>Recent registrations requiring document verification reviews.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading queue...</div>
          ) : recentPending.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No pending student verifications at this time.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SR Number</TableHead>
                  <TableHead>GR Number</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Verification Rate</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPending.map((student) => (
                  <TableRow key={student._id}>
                    <TableCell className="font-semibold">{student.srNumber}</TableCell>
                    <TableCell>{student.grNumber}</TableCell>
                    <TableCell className="font-medium text-indigo-600 dark:text-indigo-400">
                      {student.firstName} {student.surname}
                    </TableCell>
                    <TableCell>{student.casteCategory}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {student.documentStats?.verified || 0} / {student.documentStats?.totalRequired || 11} Verified
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/students/${student._id}`}>
                        <Button size="sm" variant="outline">
                          Verify Files
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
