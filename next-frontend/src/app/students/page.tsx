'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Edit, Eye, Filter, Plus, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

export default function SearchPage() {
  const [students, setStudents] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Search & Filter state
  const [search, setSearch] = React.useState('');
  const [selectedClass, setSelectedClass] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState('');
  const [admissionYear, setAdmissionYear] = React.useState('');

  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalRecords, setTotalRecords] = React.useState(0);

  const fetchStudents = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/students', {
        params: {
          page,
          limit: 10,
          search,
          class: selectedClass,
          casteCategory: selectedCategory,
          verificationStatus: selectedStatus,
          admissionYear,
        },
      });

      if (response.data?.success) {
        setStudents(response.data.data || []);
        setTotalPages(response.data.pagination?.totalPages || 1);
        setTotalRecords(response.data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Error fetching students list:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedClass, selectedCategory, selectedStatus, admissionYear]);

  React.useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete all records for ${name}?`)) return;
    try {
      const response = await api.delete(`/students/${id}`);
      if (response.data?.success) {
        fetchStudents();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete student.');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedClass('');
    setSelectedCategory('');
    setSelectedStatus('');
    setAdmissionYear('');
    setPage(1);
  };

  return (
    <main className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-50">Student Directory</h1>
          <p className="text-gray-500">Search, filter, and manage student registration records.</p>
        </div>
        <Link href="/students/register">
          <Button className="flex items-center gap-2 bg-indigo-600 text-white">
            <Plus size={16} /> Register Student
          </Button>
        </Link>
      </div>

      {/* Filter Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter size={18} /> Search & Filters
          </CardTitle>
          <CardDescription>Refine student registry search using criteria below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500">Query Search</label>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-3 text-gray-400" />
                <Input
                  placeholder="Name, GR, SR, Aadhaar, Mobile"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500">Class</label>
              <Select value={selectedClass} onChange={(e: any) => setSelectedClass(e.target.value)}>
                <option value="">All Classes</option>
                <option value="Class 5">Class 5</option>
                <option value="Class 6">Class 6</option>
                <option value="Class 7">Class 7</option>
                <option value="Class 8">Class 8</option>
                <option value="Class 9">Class 9</option>
                <option value="Class 10">Class 10</option>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500">Caste Category</label>
              <Select value={selectedCategory} onChange={(e: any) => setSelectedCategory(e.target.value)}>
                <option value="">All Categories</option>
                <option value="General">General</option>
                <option value="OBC">OBC</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
                <option value="EWS">EWS</option>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500">Verification Status</label>
              <Select value={selectedStatus} onChange={(e: any) => setSelectedStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="Verified">Verified</option>
                <option value="Pending">Pending Approval</option>
                <option value="Rejected">Rejected</option>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500">Admission Year</label>
              <Input
                type="number"
                placeholder="E.g. 2026"
                value={admissionYear}
                onChange={(e) => setAdmissionYear(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            {(search || selectedClass || selectedCategory || selectedStatus || admissionYear) && (
              <Button variant="ghost" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
            <Button onClick={() => setPage(1)} className="bg-indigo-600 text-white">
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Table Card */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading student directory...</div>
          ) : students.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No student records found matching the criteria.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs text-gray-500">
                <p>Showing <strong>{students.length}</strong> of <strong>{totalRecords}</strong> records</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api'}/students/export/excel?token=${localStorage.getItem('token')}`)}
                  >
                    <Download size={14} className="mr-1" /> Export Excel
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api'}/students/export/pdf?token=${localStorage.getItem('token')}`)}
                  >
                    <Download size={14} className="mr-1" /> Export PDF
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SR Number</TableHead>
                    <TableHead>GR Number</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Aadhaar Number</TableHead>
                    <TableHead>Verification Rate</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => {
                    const uploaded = student.documentStats?.uploaded || 0;
                    const verified = student.documentStats?.verified || 0;
                    const rejected = student.documentStats?.rejected || 0;
                    
                    let statusColor = 'warning';
                    let statusLabel = 'Pending';
                    if (rejected > 0) {
                      statusColor = 'destructive';
                      statusLabel = 'Rejected';
                    } else if (verified === 11) {
                      statusColor = 'success';
                      statusLabel = 'Verified';
                    }

                    return (
                      <TableRow key={student._id}>
                        <TableCell className="font-semibold">{student.srNumber}</TableCell>
                        <TableCell>{student.grNumber}</TableCell>
                        <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                          {student.firstName} {student.surname}
                        </TableCell>
                        <TableCell>{student.gender}</TableCell>
                        <TableCell>{student.casteCategory}</TableCell>
                        <TableCell className="font-mono text-xs">{student.aadhaarNumber}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant={statusColor as any}>{statusLabel}</Badge>
                            <span className="text-xs text-gray-500">
                              ({verified}/11 verified)
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Link href={`/students/${student._id}`}>
                              <Button size="sm" variant="outline" className="h-8 px-2">
                                <Eye size={14} />
                              </Button>
                            </Link>
                            <Link href={`/students/${student._id}/edit`}>
                              <Button size="sm" variant="outline" className="h-8 px-2 text-indigo-600 hover:text-indigo-700">
                                <Edit size={14} />
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDelete(student._id, `${student.firstName} ${student.surname}`)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination controls */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center text-sm px-2">
                  Page {page} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
