'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Download,
  RefreshCw,
  FileSpreadsheet,
  Play,
  History,
  FileWarning,
  Loader2,
  Calendar,
  User,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import api from '@/lib/api';

const SCHEMA_FIELDS = [
  { key: 'srNumber', name: 'SR Number (Unique)*', required: true },
  { key: 'grNumber', name: 'GR Number (Unique)*', required: true },
  { key: 'surname', name: 'Surname*', required: true },
  { key: 'firstName', name: 'First Name*', required: true },
  { key: 'fatherName', name: 'Father Name*', required: true },
  { key: 'grandFatherName', name: 'Grandfather Name*', required: true },
  { key: 'motherName', name: 'Mother Name*', required: true },
  { key: 'gender', name: 'Gender (Male/Female)*', required: true },
  { key: 'dob', name: 'Date of Birth (YYYY-MM-DD)*', required: true },
  { key: 'admissionDate', name: 'Admission Date (YYYY-MM-DD)*', required: true },
  { key: 'caste', name: 'Caste*', required: true },
  { key: 'casteCategory', name: 'Caste Category (General/OBC/SC/ST/EWS)*', required: true },
  { key: 'penNumber', name: 'PEN Number', required: false },
  { key: 'apaarId', name: 'APAAR ID', required: false },
  { key: 'udiseNumber', name: 'UDISE Number', required: false },
  { key: 'nameAsPerChildTracking', name: 'Student Name as per Child Tracking', required: false },
  { key: 'nameAsPerUdisePlus', name: 'Student Name as per UDISE+', required: false },
  { key: 'aadhaarNumber', name: 'Aadhaar Number (12 digits)*', required: true },
  { key: 'aadhaarName', name: 'Name as per Aadhaar*', required: true },
  { key: 'aadhaarDob', name: 'Date of Birth as per Aadhaar*', required: true },
  { key: 'bankAccountNumber', name: 'Bank Account Number*', required: true },
  { key: 'bankIfscCode', name: 'IFSC Code*', required: true },
  { key: 'bankAccountHolderName', name: 'Account Holder Name*', required: true },
  { key: 'motherAadhaarNumber', name: 'Mother Aadhaar Number*', required: true },
  { key: 'fatherAadhaarNumber', name: 'Father Aadhaar Number*', required: true },
  { key: 'mobileNumber1', name: 'Mobile Number 1*', required: true },
  { key: 'mobileNumber2', name: 'Mobile Number 2', required: false }
];

export default function BulkImportPage() {
  const router = useRouter();

  // Wizard state
  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1);
  const [file, setFile] = React.useState<File | null>(null);
  const [dragActive, setDragActive] = React.useState(false);

  // Mapping state
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [mapping, setMapping] = React.useState<Record<string, string>>({}); // fileHeader -> schemaKey

  // Validation response state
  const [rows, setRows] = React.useState<any[]>([]);
  const [summary, setSummary] = React.useState({
    totalRecords: 0,
    validRecords: 0,
    invalidRecords: 0,
    duplicateRecords: 0
  });

  // Loaders
  const [loading, setLoading] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [importHistory, setImportHistory] = React.useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(true);

  // Fetch past import history logs
  const fetchImportHistory = React.useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await api.get('/students/import/history');
      if (response.data?.success) {
        setImportHistory(response.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchImportHistory();
  }, [fetchImportHistory]);

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const ext = droppedFile.name.split('.').pop()?.toLowerCase();
      if (ext === 'xlsx' || ext === 'csv') {
        setFile(droppedFile);
        await uploadAndValidateFile(droppedFile);
      } else {
        alert('Invalid file format. Please upload an Excel (.xlsx) or CSV (.csv) file.');
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      await uploadAndValidateFile(selectedFile);
    }
  };

  // Upload and parse the file (Initial Dry Run Validation)
  const uploadAndValidateFile = async (targetFile: File, currentMapping?: Record<string, string>) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('file', targetFile);
    
    if (currentMapping) {
      formData.append('columnMapping', JSON.stringify(currentMapping));
    }

    try {
      const response = await api.post('/students/import/validate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data?.success) {
        const data = response.data;
        setHeaders(data.headers || []);
        setRows(data.rows || []);
        setSummary(data.summary || { totalRecords: 0, validRecords: 0, invalidRecords: 0, duplicateRecords: 0 });
        
        // Re-construct the mapping dictionary fileHeader -> schemaKey
        const newMapping: Record<string, string> = {};
        if (data.columnMapping) {
          Object.entries(data.columnMapping).forEach(([fileHeader, schemaKey]) => {
            newMapping[fileHeader] = schemaKey as string;
          });
        }
        setMapping(newMapping);

        // If we haven't matched columns or need review
        if (step === 1) {
          setStep(2);
        }
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Error occurred while validating spreadsheet data.');
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  // Triggers when user overrides mapped headers manually
  const handleMappingChange = (fileHeader: string, schemaKey: string) => {
    setMapping((prev) => {
      const next = { ...prev };
      if (schemaKey === '') {
        delete next[fileHeader];
      } else {
        next[fileHeader] = schemaKey;
      }
      return next;
    });
  };

  // Re-run validation with the customized column mapping
  const handleRevalidate = async () => {
    if (!file) return;
    await uploadAndValidateFile(file, mapping);
    setStep(3); // proceed to dry-run validation preview grid
  };

  // Execute the import (writes valid records to MongoDB)
  const handleExecuteImport = async () => {
    if (!file || rows.length === 0) return;
    setImporting(true);
    
    // Prepare the list of failures to register on history
    const errorReport = rows
      .filter((r) => !r.isValid)
      .map((r) => ({
        rowNumber: r.rowNumber,
        identifier: r.data.srNumber || r.data.grNumber || 'Row ' + r.rowNumber,
        studentName: r.data.firstName ? `${r.data.firstName} ${r.data.surname || ''}` : 'Unknown Student',
        errors: r.errors
      }));

    try {
      const response = await api.post('/students/import/execute', {
        rows,
        fileName: file.name,
        totalRecords: summary.totalRecords,
        errorReport
      });

      if (response.data?.success) {
        setStep(4);
        fetchImportHistory();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to complete import.');
    } finally {
      setImporting(false);
    }
  };

  const resetImporter = () => {
    setFile(null);
    setHeaders([]);
    setMapping({});
    setRows([]);
    setSummary({
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      duplicateRecords: 0
    });
    setStep(1);
  };

  // Generate template URLs
  const getTemplateUrl = (format: 'xlsx' | 'csv') => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api';
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    return `${apiBase}/students/import/template?format=${format}&token=${token}`;
  };

  // Generate CSV error report download URL
  const getErrorReportUrl = (id: string) => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api';
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    return `${apiBase}/students/import/history/${id}/error-report?token=${token}`;
  };

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header section */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="space-y-1">
          <Link href="/students" className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-700 font-medium gap-1 mb-2">
            <ArrowLeft size={14} /> Back to Student Directory
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-50">Bulk Student Import</h1>
          <p className="text-gray-500">Upload school student roster spreadsheets and auto-assign document checkfolders.</p>
        </div>
      </div>

      {/* Stepper component */}
      <div className="relative flex justify-between max-w-xl mx-auto my-4">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-800 -translate-y-1/2 -z-10" />
        {[
          { label: 'Upload File', s: 1 },
          { label: 'Map Columns', s: 2 },
          { label: 'Verify & Dry Run', s: 3 },
          { label: 'Done', s: 4 }
        ].map((item) => (
          <div key={item.s} className="flex flex-col items-center gap-1.5 bg-white dark:bg-gray-950 px-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                step === item.s
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none scale-110'
                  : step > item.s
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'bg-white border-gray-300 text-gray-400 dark:bg-gray-900 dark:border-gray-800'
              }`}
            >
              {step > item.s ? <CheckCircle size={16} /> : item.s}
            </div>
            <span className={`text-xs font-medium ${step === item.s ? 'text-indigo-600 font-bold' : 'text-gray-400'}`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Step 1: Upload File */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card
              className={`border-2 border-dashed transition-all cursor-pointer relative overflow-hidden ${
                dragActive ? 'border-indigo-600 bg-indigo-50/20' : 'border-gray-300 dark:border-gray-800 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
            >
              <CardContent className="p-12 text-center flex flex-col items-center justify-center gap-4 min-h-[300px]">
                {loading ? (
                  <div className="space-y-4">
                    <Loader2 size={40} className="text-indigo-600 animate-spin mx-auto" />
                    <p className="font-semibold text-gray-700 dark:text-gray-300">Parsing spreadsheet data...</p>
                    <p className="text-xs text-gray-400">Verifying structures & checking duplicate SR/GR entries</p>
                  </div>
                ) : (
                  <>
                    <div className="p-4 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600">
                      <Upload size={32} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-gray-950 dark:text-gray-50">Drag & drop your file here</h3>
                      <p className="text-sm text-gray-500">Supports Microsoft Excel (.xlsx) or CSV (.csv) sheets</p>
                    </div>
                    <div className="flex items-center gap-2 w-full max-w-xs justify-center pt-2">
                      <label className="w-full">
                        <Button className="w-full bg-indigo-600 text-white font-semibold">Choose File</Button>
                        <input
                          type="file"
                          accept=".xlsx,.csv"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right sidebar: Templates & Tips */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Download Templates</CardTitle>
                <CardDescription>Get formatted template structures with 2 examples filled in.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  onClick={() => window.open(getTemplateUrl('xlsx'))}
                  className="w-full flex items-center justify-between group"
                >
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-emerald-600" />
                    Excel Template (.xlsx)
                  </span>
                  <Download size={14} className="opacity-65 group-hover:translate-y-0.5 transition-transform" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(getTemplateUrl('csv'))}
                  className="w-full flex items-center justify-between group"
                >
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-indigo-600" />
                    CSV Template (.csv)
                  </span>
                  <Download size={14} className="opacity-65 group-hover:translate-y-0.5 transition-transform" />
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                  <AlertCircle size={16} /> Import Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-amber-800/80 dark:text-amber-400/80 space-y-2 leading-relaxed">
                <p>1. <strong>SR Number</strong> and <strong>GR Number</strong> must be unique school identifiers.</p>
                <p>2. In case of duplicates, the system will update the existing student records.</p>
                <p>3. Format date fields strictly as <code>YYYY-MM-DD</code> or <code>DD/MM/YYYY</code>.</p>
                <p>4. Caste category must be one of: <code>General</code>, <code>OBC</code>, <code>SC</code>, <code>ST</code>, <code>EWS</code>.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === 2 && (
        <Card className="shadow-premium">
          <CardHeader>
            <CardTitle>Map Column Headers</CardTitle>
            <CardDescription>
              We automatically matched most columns. Check and adjust mappings below to ensure spreadsheet headers match the database schema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                    <TableRow>
                      <TableHead className="w-1/2">Database Student Field</TableHead>
                      <TableHead className="w-1/2">Spreadsheet Match</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {SCHEMA_FIELDS.map((field) => {
                      // Find which file header is currently mapped to this schema field key
                      const currentMappedHeader = Object.entries(mapping).find(
                        ([_, schemaKey]) => schemaKey === field.key
                      )?.[0] || '';

                      return (
                        <TableRow key={field.key} className="hover:bg-transparent">
                          <TableCell className="font-medium">
                            <span className="text-gray-900 dark:text-gray-200">{field.name}</span>
                          </TableCell>
                          <TableCell>
                            <select
                              value={currentMappedHeader}
                              onChange={(e) => {
                                // If the dropdown value is selected, we need to map that header to this field key.
                                const val = e.target.value;
                                if (val) {
                                  // Clear any header that was previously mapped to this field
                                  const oldHeader = Object.entries(mapping).find(
                                    ([_, schemaKey]) => schemaKey === field.key
                                  )?.[0];
                                  if (oldHeader) {
                                    handleMappingChange(oldHeader, '');
                                  }
                                  handleMappingChange(val, field.key);
                                } else {
                                  // If empty, delete mapping for whoever was mapped to this field
                                  const mappedHeader = Object.entries(mapping).find(
                                    ([_, schemaKey]) => schemaKey === field.key
                                  )?.[0];
                                  if (mappedHeader) {
                                    handleMappingChange(mappedHeader, '');
                                  }
                                }
                              }}
                              className="w-full text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all text-gray-700 dark:text-gray-300"
                            >
                              <option value="">-- Ignored / Not Mapped --</option>
                              {headers.map((h) => (
                                <option key={h} value={h}>
                                  {h}
                                </option>
                              ))}
                            </select>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-4">
                <Card className="bg-indigo-50/35 dark:bg-indigo-950/10 border-indigo-150 dark:border-indigo-900/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-1 text-indigo-900 dark:text-indigo-300">
                      Auto Column Mapping Complete
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-indigo-900/80 dark:text-indigo-400/80 space-y-2 leading-relaxed">
                    <p>The system automatically mapped matching names (e.g. <code>SR No</code> matched with <code>srNumber</code>).</p>
                    <p>Review the fields carefully. Columns marked with <strong>*</strong> are mandatory and must be matched to progress.</p>
                  </CardContent>
                </Card>

                <div className="flex gap-3 justify-end pt-4">
                  <Button variant="ghost" onClick={resetImporter}>Cancel</Button>
                  <Button onClick={handleRevalidate} className="bg-indigo-600 text-white font-semibold">
                    Confirm Mappings & Validate
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Dry-Run Validation Preview Grid */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Summary widgets */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Records', val: summary.totalRecords, color: 'text-gray-900 dark:text-gray-100', desc: 'Rows processed' },
              { label: 'Valid Records', val: summary.validRecords, color: 'text-emerald-600', desc: 'Ready to import' },
              { label: 'Invalid Records', val: summary.invalidRecords, color: 'text-rose-600', desc: 'Contain format errors' },
              { label: 'Updates (Duplicate SR/GR)', val: summary.duplicateRecords, color: 'text-amber-600', desc: 'Overwrites existing logs' }
            ].map((card, i) => (
              <Card key={i} className="shadow-sm">
                <CardContent className="p-5">
                  <span className="text-xs font-semibold text-gray-500 uppercase">{card.label}</span>
                  <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.val}</p>
                  <p className="text-xs text-gray-400 mt-1">{card.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabular Preview */}
          <Card>
            <CardContent className="p-6">
              <Tabs defaultValue="valid" className="space-y-4">
                <div className="flex justify-between items-center flex-wrap gap-4 border-b pb-2 dark:border-gray-800">
                  <TabsList>
                    <TabsTrigger value="valid" className="flex items-center gap-1.5">
                      Valid Rows <Badge variant="success" className="ml-1">{summary.validRecords}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="invalid" className="flex items-center gap-1.5">
                      Invalid Rows <Badge variant="destructive" className="ml-1">{summary.invalidRecords}</Badge>
                    </TabsTrigger>
                  </TabsList>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setStep(2)}>
                      <RefreshCw size={14} className="mr-1" /> Adjust Mappings
                    </Button>
                    <Button
                      disabled={summary.validRecords === 0 || importing}
                      onClick={handleExecuteImport}
                      size="sm"
                      className="bg-indigo-600 text-white font-semibold flex items-center gap-1.5"
                    >
                      {importing ? (
                        <>
                          <Loader2 size={14} className="animate-spin" /> Importing...
                        </>
                      ) : (
                        <>
                          <Play size={14} /> Import Valid Records
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <TabsContent value="valid" className="space-y-4">
                  {summary.validRecords === 0 ? (
                    <div className="text-center py-12 text-gray-500">No valid records found to import. Adjust column mappings or correct spreadsheet errors.</div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader className="bg-gray-50 dark:bg-gray-900/50 sticky top-0">
                          <TableRow>
                            <TableHead className="w-16">Row</TableHead>
                            <TableHead>Import Type</TableHead>
                            <TableHead>SR Number</TableHead>
                            <TableHead>GR Number</TableHead>
                            <TableHead>Student Name</TableHead>
                            <TableHead>Gender</TableHead>
                            <TableHead>Mobile 1</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows
                            .filter((r) => r.isValid)
                            .map((row) => (
                              <TableRow key={row.rowNumber}>
                                <TableCell className="font-medium text-gray-500">{row.rowNumber}</TableCell>
                                <TableCell>
                                  <Badge variant={row.type === 'update' ? 'warning' : 'success'}>
                                    {row.type === 'update' ? 'Update Overwrite' : 'New Registration'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-semibold text-gray-900 dark:text-gray-200">{row.data.srNumber}</TableCell>
                                <TableCell>{row.data.grNumber}</TableCell>
                                <TableCell>
                                  {row.data.firstName} {row.data.surname}
                                </TableCell>
                                <TableCell>{row.data.gender}</TableCell>
                                <TableCell>{row.data.mobileNumber1}</TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="invalid" className="space-y-4">
                  {summary.invalidRecords === 0 ? (
                    <div className="text-center py-12 text-gray-500">Zero errors! All records are format-validated.</div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader className="bg-gray-50 dark:bg-gray-900/50 sticky top-0">
                          <TableRow>
                            <TableHead className="w-16">Row</TableHead>
                            <TableHead>SR/GR</TableHead>
                            <TableHead>Student Name</TableHead>
                            <TableHead className="w-1/2">Validation Issues</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows
                            .filter((r) => !r.isValid)
                            .map((row) => (
                              <TableRow key={row.rowNumber} className="bg-rose-50/20 dark:bg-rose-950/5 hover:bg-rose-50/30 dark:hover:bg-rose-950/10">
                                <TableCell className="font-medium text-red-600">{row.rowNumber}</TableCell>
                                <TableCell className="font-mono text-xs text-gray-600 dark:text-gray-300">
                                  {row.data.srNumber || row.data.grNumber || 'Missing Keys'}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {row.data.firstName ? `${row.data.firstName} ${row.data.surname || ''}` : <em className="text-gray-400">Unnamed</em>}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col gap-1">
                                    {row.errors.map((err: string, i: number) => (
                                      <span key={i} className="text-xs text-red-600 font-medium flex items-center gap-1">
                                        <FileWarning size={12} className="shrink-0" />
                                        {err}
                                      </span>
                                    ))}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: Import Complete */}
      {step === 4 && (
        <Card className="max-w-xl mx-auto shadow-premium border-2 border-emerald-500/25 dark:border-emerald-500/10 bg-emerald-50/10 dark:bg-emerald-950/5">
          <CardContent className="p-10 text-center flex flex-col items-center justify-center gap-5">
            <div className="p-4 rounded-full bg-emerald-500 text-white animate-bounce">
              <CheckCircle size={44} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-950 dark:text-gray-50">Roster Successfully Imported!</h2>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                All valid students have been uploaded to MongoDB, and document checklist checkfolders are created in a `Pending` state.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-lg p-4 w-full flex justify-around text-sm">
              <div>
                <span className="text-xs text-gray-400">Imported Records</span>
                <p className="text-lg font-bold text-emerald-600">{summary.validRecords}</p>
              </div>
              <div className="border-l dark:border-gray-800" />
              <div>
                <span className="text-xs text-gray-400">Skipped (With Errors)</span>
                <p className="text-lg font-bold text-rose-500">{summary.invalidRecords}</p>
              </div>
            </div>
            <div className="flex gap-3 w-full pt-4">
              <Button variant="outline" className="w-1/2" onClick={resetImporter}>
                Import Another File
              </Button>
              <Link href="/students" className="w-1/2">
                <Button className="w-full bg-indigo-600 text-white font-semibold flex items-center justify-center gap-1.5">
                  Go to Directory <ChevronRight size={16} />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History panel at the bottom (shows when not actively validating/importing) */}
      {step === 1 && (
        <Card className="shadow-sm">
          <CardHeader className="flex justify-between flex-row items-center border-b pb-4 dark:border-gray-800">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History size={18} className="text-indigo-600" /> Import Logs & Audit History
              </CardTitle>
              <CardDescription>Review metrics and error reports of past student bulk imports.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {historyLoading ? (
              <div className="text-center py-6 text-gray-500 flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Retrieving audit trails...
              </div>
            ) : importHistory.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">No bulk student imports have been executed yet.</div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Filename</TableHead>
                      <TableHead>Imported By</TableHead>
                      <TableHead>Success Records</TableHead>
                      <TableHead>Failed Records</TableHead>
                      <TableHead className="text-right">Failure Reports</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importHistory.map((historyItem) => (
                      <TableRow key={historyItem._id}>
                        <TableCell className="font-medium">
                          <span className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                            <Calendar size={13} />
                            {new Date(historyItem.createdAt).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="font-semibold text-gray-900 dark:text-gray-200">
                          {historyItem.fileName}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 text-xs">
                            <User size={13} className="text-gray-400" />
                            {historyItem.importedBy?.name || 'System'}
                          </span>
                        </TableCell>
                        <TableCell className="text-emerald-600 font-bold">
                          {historyItem.successRecords}
                        </TableCell>
                        <TableCell className={historyItem.failedRecords > 0 ? 'text-rose-600 font-bold' : 'text-gray-500'}>
                          {historyItem.failedRecords}
                        </TableCell>
                        <TableCell className="text-right">
                          {historyItem.failedRecords > 0 ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(getErrorReportUrl(historyItem._id))}
                              className="text-indigo-600 hover:text-indigo-700 p-0 h-auto font-medium text-xs flex items-center gap-1 ml-auto"
                            >
                              <ExternalLink size={13} /> Download Error CSV
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
