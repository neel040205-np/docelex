'use strict';
'use client';

import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { StudentFormSchema, StudentFormValues } from '@/lib/schemas/student';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { 
  User, 
  CreditCard, 
  Building2, 
  Users2, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Upload,
  Camera,
  Link2,
  Eye,
  Trash2,
  RotateCcw,
  FileText,
  Clock,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface StudentFormProps {
  initialValues?: Partial<StudentFormValues> & { _id?: string };
  initialDocuments?: any[];
  isEditMode?: boolean;
}

type TabKey = 'basic' | 'aadhaar' | 'bank' | 'family';

interface TabItem {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: (keyof StudentFormValues)[];
}

export function StudentForm({ initialValues, initialDocuments = [], isEditMode = false }: StudentFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('basic');
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState<string | null>(null);

  // Existing documents
  const initialAadhaarDoc = initialDocuments?.find((d) => d.documentType === 'studentAadhaar');
  const initialBankDoc = initialDocuments?.find((d) => d.documentType === 'studentBankPassbook');

  const [changeAadhaar, setChangeAadhaar] = useState(false);
  const [changeBank, setChangeBank] = useState(false);

  // Document Upload States
  const [aadhaarUpload, setAadhaarUpload] = useState<{
    source: 'device' | 'camera' | 'drive';
    file?: File;
    cameraDataUrl?: string;
    driveUrl?: string;
    fileName?: string;
  } | null>(null);

  const [bankPassbookUpload, setBankPassbookUpload] = useState<{
    source: 'device' | 'camera' | 'drive';
    file?: File;
    cameraDataUrl?: string;
    driveUrl?: string;
    fileName?: string;
  } | null>(null);

  // Reusable Modals States
  const [activeUploadDoc, setActiveUploadDoc] = useState<'aadhaar' | 'bank' | null>(null);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [driveModalOpen, setDriveModalOpen] = useState(false);
  const [driveUrl, setDriveUrl] = useState('');
  const [driveFileName, setDriveFileName] = useState('');

  // Camera preview states inside dialog (for preview before upload in form)
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async (docType: 'aadhaar' | 'bank') => {
    setActiveUploadDoc(docType);
    setCapturedPhotoUrl(null);
    setCameraModalOpen(true);
    try {
      setTimeout(async () => {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        setCameraStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 150);
    } catch (err: any) {
      setCameraModalOpen(false);
      alert('Unable to access device camera. Please check browser permissions.');
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setCameraModalOpen(false);
    setCapturedPhotoUrl(null);
  };

  const captureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Data = canvas.toDataURL('image/jpeg');
    setCapturedPhotoUrl(base64Data);

    // Stop camera stream since we captured the picture
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  const retakePhoto = async () => {
    setCapturedPhotoUrl(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error(err);
    }
  };

  const confirmPhoto = () => {
    if (!capturedPhotoUrl) return;
    const payload = { source: 'camera' as const, cameraDataUrl: capturedPhotoUrl };
    if (activeUploadDoc === 'aadhaar') {
      setAadhaarUpload(payload);
    } else {
      setBankPassbookUpload(payload);
    }
    stopCamera();
  };

  const triggerDriveLink = (docType: 'aadhaar' | 'bank') => {
    setActiveUploadDoc(docType);
    setDriveUrl('');
    setDriveFileName('');
    setDriveModalOpen(true);
  };

  const submitDriveLink = () => {
    if (!driveUrl) {
      alert('Google Drive Link is required.');
      return;
    }
    if (!driveUrl.startsWith('https://')) {
      alert('Please enter a secure Google Drive link starting with https://');
      return;
    }

    const payload = {
      source: 'drive' as const,
      driveUrl,
      fileName: driveFileName || (activeUploadDoc === 'aadhaar' ? 'Aadhaar_Card_Link.pdf' : 'Bank_Passbook_Link.pdf')
    };

    if (activeUploadDoc === 'aadhaar') {
      setAadhaarUpload(payload);
    } else {
      setBankPassbookUpload(payload);
    }
    setDriveModalOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, docType: 'aadhaar' | 'bank') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds the 10MB limit.');
      return;
    }

    const payload = { source: 'device' as const, file };
    if (docType === 'aadhaar') {
      setAadhaarUpload(payload);
    } else {
      setBankPassbookUpload(payload);
    }
  };

  const uploadDocument = async (studentId: string, docType: string, uploadState: any) => {
    if (!uploadState) return;

    const url = `/api/students/${studentId}/documents/${docType}`;

    if (uploadState.source === 'device') {
      const formData = new FormData();
      formData.append('file', uploadState.file);
      const res = await fetch(url, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || `Failed to upload ${docType}`);
      }
    } else if (uploadState.source === 'camera') {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cameraDataUrl: uploadState.cameraDataUrl }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || `Failed to upload ${docType}`);
      }
    } else if (uploadState.source === 'drive') {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driveUrl: uploadState.driveUrl, fileName: uploadState.fileName }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || `Failed to upload ${docType}`);
      }
    }
  };

  // Format initial date values to YYYY-MM-DD for HTML5 date inputs
  const formatInitialDate = (dateVal: any) => {
    if (!dateVal) return '';
    try {
      const d = new Date(dateVal);
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const formattedInitialValues = initialValues ? {
    ...initialValues,
    dob: formatInitialDate(initialValues.dob),
    admissionDate: formatInitialDate(initialValues.admissionDate),
    dobAsPerAadhaar: formatInitialDate(initialValues.dobAsPerAadhaar),
  } : undefined;

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
  } = useForm<StudentFormValues>({
    resolver: zodResolver(StudentFormSchema),
    defaultValues: (formattedInitialValues as any) || {
      gender: 'Male',
      casteCategory: 'General',
    },
  });

  const tabs: TabItem[] = [
    {
      key: 'basic',
      label: 'Student Basic Details',
      icon: User,
      fields: [
        'srNumber', 'grNumber', 'surname', 'firstName', 'fatherName', 'grandFatherName',
        'motherName', 'gender', 'dob', 'admissionDate', 'class', 'division', 'caste',
        'casteCategory', 'penNumber', 'apaarId', 'udiseNumber',
        'nameAsPerChildTracking', 'nameAsPerUdisePlus'
      ],
    },
    {
      key: 'aadhaar',
      label: 'Aadhaar Details',
      icon: CreditCard,
      fields: ['aadhaarNumber', 'nameAsPerAadhaar', 'dobAsPerAadhaar'],
    },
    {
      key: 'bank',
      label: 'Bank Details',
      icon: Building2,
      fields: ['bankAccountNumber', 'ifscCode', 'accountHolderName'],
    },
    {
      key: 'family',
      label: 'Family Details',
      icon: Users2,
      fields: ['motherAadhaar', 'fatherAadhaar', 'mobileNumber1', 'mobileNumber2'],
    },
  ];

  // Helper to check if a tab contains validation errors
  const hasTabErrors = (tabKey: TabKey) => {
    const tab = tabs.find((t) => t.key === tabKey);
    if (!tab) return false;
    return tab.fields.some((field) => !!errors[field]);
  };

  // Switch tabs after validating the current tab fields
  const handleTabChange = async (targetTab: TabKey) => {
    const currentTabItem = tabs.find((t) => t.key === activeTab);
    if (currentTabItem) {
      // Trigger validation for fields in current tab
      const isTabValid = await trigger(currentTabItem.fields);
      if (!isTabValid) {
        // If there are errors, block transition to help users fix it
        return;
      }
    }
    setActiveTab(targetTab);
  };

  const handleNext = async () => {
    const currentIndex = tabs.findIndex((t) => t.key === activeTab);
    const currentTabItem = tabs[currentIndex];
    
    const isTabValid = await trigger(currentTabItem.fields);
    if (!isTabValid) return;

    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1].key);
    }
  };

  const handleBack = () => {
    const currentIndex = tabs.findIndex((t) => t.key === activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1].key);
    }
  };

  const onSubmit = async (data: StudentFormValues) => {
    setIsSubmitting(true);
    setServerError(null);
    setSubmitProgress('Saving student master profile...');

    const url = isEditMode
      ? `/api/students/${initialValues?._id}`
      : '/api/students';
    const method = isEditMode ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Operation failed');
      }

      const studentId = isEditMode ? initialValues?._id : result.data._id;

      // Handle Aadhaar upload if selected
      if (aadhaarUpload) {
        setSubmitProgress('Uploading Aadhaar Card document...');
        await uploadDocument(studentId, 'studentAadhaar', aadhaarUpload);
      }

      // Handle Bank Passbook upload if selected
      if (bankPassbookUpload) {
        setSubmitProgress('Uploading Student Bank Passbook...');
        await uploadDocument(studentId, 'studentBankPassbook', bankPassbookUpload);
      }

      setSubmitProgress('Done! Redirecting...');
      router.push(`/students/${studentId}`);
      router.refresh();
    } catch (err: any) {
      setServerError(err.message || 'An unexpected error occurred');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
      setSubmitProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Server Error Message */}
      {serverError && (
        <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-900 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Registration Alert</AlertTitle>
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      {/* Tabs navigation */}
      <div className="grid grid-cols-4 gap-2 bg-muted p-1.5 rounded-xl border border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.key;
          const hasErrors = hasTabErrors(tab.key);

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                "flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer",
                isSelected
                  ? "bg-background text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground",
                hasErrors && "border border-destructive bg-destructive/5 text-destructive hover:bg-destructive/10"
              )}
            >
              <Icon className={cn("h-4.5 w-4.5", hasErrors ? "text-destructive" : isSelected ? "text-primary" : "text-muted-foreground")} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Form Form Body */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* SECTION 1: BASIC DETAILS */}
        {activeTab === 'basic' && (
          <Card className="border-border shadow-xs">
            <CardHeader className="border-b border-border bg-slate-50/50 px-6 py-4">
              <CardTitle className="text-base font-bold text-foreground">SECTION 1: STUDENT BASIC DETAILS</CardTitle>
              <CardDescription>Enter structural school record identifiers and personal parameters.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-5 p-6">
              {/* SR & GR Numbers */}
              <div className="space-y-1.5">
                <Label htmlFor="srNumber" className="font-semibold text-xs text-muted-foreground">SR Number (Unique) <span className="text-destructive">*</span></Label>
                <Input id="srNumber" placeholder="e.g. SR-9941" {...register('srNumber')} className={errors.srNumber ? 'border-destructive focus-visible:ring-destructive' : ''} />
                {errors.srNumber && <p className="text-[11px] font-medium text-destructive">{errors.srNumber.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="grNumber" className="font-semibold text-xs text-muted-foreground">GR Number (Unique) <span className="text-destructive">*</span></Label>
                <Input id="grNumber" placeholder="e.g. GR-2026-112" {...register('grNumber')} className={errors.grNumber ? 'border-destructive focus-visible:ring-destructive' : ''} />
                {errors.grNumber && <p className="text-[11px] font-medium text-destructive">{errors.grNumber.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="surname" className="font-semibold text-xs text-muted-foreground">Surname <span className="text-destructive">*</span></Label>
                <Input id="surname" placeholder="e.g. Patel" {...register('surname')} className={errors.surname ? 'border-destructive focus-visible:ring-destructive' : ''} />
                {errors.surname && <p className="text-[11px] font-medium text-destructive">{errors.surname.message}</p>}
              </div>

              {/* Names */}
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="font-semibold text-xs text-muted-foreground">First Name <span className="text-destructive">*</span></Label>
                <Input id="firstName" placeholder="e.g. Aarav" {...register('firstName')} className={errors.firstName ? 'border-destructive focus-visible:ring-destructive' : ''} />
                {errors.firstName && <p className="text-[11px] font-medium text-destructive">{errors.firstName.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fatherName" className="font-semibold text-xs text-muted-foreground">Father's Name <span className="text-destructive">*</span></Label>
                <Input id="fatherName" placeholder="e.g. Rajeshbhai" {...register('fatherName')} className={errors.fatherName ? 'border-destructive focus-visible:ring-destructive' : ''} />
                {errors.fatherName && <p className="text-[11px] font-medium text-destructive">{errors.fatherName.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="grandFatherName" className="font-semibold text-xs text-muted-foreground">Grandfather's Name <span className="text-destructive">*</span></Label>
                <Input id="grandFatherName" placeholder="e.g. Devjibhai" {...register('grandFatherName')} className={errors.grandFatherName ? 'border-destructive focus-visible:ring-destructive' : ''} />
                {errors.grandFatherName && <p className="text-[11px] font-medium text-destructive">{errors.grandFatherName.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="motherName" className="font-semibold text-xs text-muted-foreground">Mother's Name <span className="text-destructive">*</span></Label>
                <Input id="motherName" placeholder="e.g. Sonalben" {...register('motherName')} className={errors.motherName ? 'border-destructive focus-visible:ring-destructive' : ''} />
                {errors.motherName && <p className="text-[11px] font-medium text-destructive">{errors.motherName.message}</p>}
              </div>

              {/* Gender */}
              <div className="space-y-1.5">
                <Label htmlFor="gender" className="font-semibold text-xs text-muted-foreground">Gender <span className="text-destructive">*</span></Label>
                <select
                  id="gender"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...register('gender')}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                {errors.gender && <p className="text-[11px] font-medium text-destructive">{errors.gender.message}</p>}
              </div>

              {/* Dates */}
              <div className="space-y-1.5">
                <Label htmlFor="dob" className="font-semibold text-xs text-muted-foreground">Date of Birth <span className="text-destructive">*</span></Label>
                <Input id="dob" type="date" {...register('dob')} className={errors.dob ? 'border-destructive focus-visible:ring-destructive' : ''} />
                {errors.dob && <p className="text-[11px] font-medium text-destructive">{errors.dob.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="admissionDate" className="font-semibold text-xs text-muted-foreground">Admission Date <span className="text-destructive">*</span></Label>
                <Input id="admissionDate" type="date" {...register('admissionDate')} className={errors.admissionDate ? 'border-destructive focus-visible:ring-destructive' : ''} />
                {errors.admissionDate && <p className="text-[11px] font-medium text-destructive">{errors.admissionDate.message}</p>}
              </div>

              {/* Class & Division */}
              <div className="space-y-1.5">
                <Label htmlFor="class" className="font-semibold text-xs text-muted-foreground">Class <span className="text-destructive">*</span></Label>
                <Input id="class" placeholder="e.g. Class 5" {...register('class')} className={errors.class ? 'border-destructive focus-visible:ring-destructive' : ''} />
                {errors.class && <p className="text-[11px] font-medium text-destructive">{errors.class.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="division" className="font-semibold text-xs text-muted-foreground">Division</Label>
                <Input id="division" placeholder="e.g. A" {...register('division')} />
              </div>

              {/* Caste & Category */}
              <div className="space-y-1.5">
                <Label htmlFor="caste" className="font-semibold text-xs text-muted-foreground">Caste <span className="text-destructive">*</span></Label>
                <Input id="caste" placeholder="e.g. Hindu-Leva Patel" {...register('caste')} className={errors.caste ? 'border-destructive focus-visible:ring-destructive' : ''} />
                {errors.caste && <p className="text-[11px] font-medium text-destructive">{errors.caste.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="casteCategory" className="font-semibold text-xs text-muted-foreground">Caste Category <span className="text-destructive">*</span></Label>
                <select
                  id="casteCategory"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...register('casteCategory')}
                >
                  <option value="General">General</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                  <option value="EWS">EWS</option>
                </select>
                {errors.casteCategory && <p className="text-[11px] font-medium text-destructive">{errors.casteCategory.message}</p>}
              </div>

              {/* ERP IDs */}
              <div className="space-y-1.5">
                <Label htmlFor="penNumber" className="font-semibold text-xs text-muted-foreground">PEN Number</Label>
                <Input id="penNumber" placeholder="Permanent Education Number" {...register('penNumber')} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="apaarId" className="font-semibold text-xs text-muted-foreground">APAAR ID</Label>
                <Input id="apaarId" placeholder="APAAR Education Card ID" {...register('apaarId')} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="udiseNumber" className="font-semibold text-xs text-muted-foreground">UDISE Number</Label>
                <Input id="udiseNumber" placeholder="School UDISE ID" {...register('udiseNumber')} />
              </div>

              {/* Alternate Tracking names */}
              <div className="space-y-1.5">
                <Label htmlFor="nameAsPerChildTracking" className="font-semibold text-xs text-muted-foreground">Student Name as per Child Tracking</Label>
                <Input id="nameAsPerChildTracking" placeholder="Tracking DB Name" {...register('nameAsPerChildTracking')} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nameAsPerUdisePlus" className="font-semibold text-xs text-muted-foreground">Student Name as per UDISE+</Label>
                <Input id="nameAsPerUdisePlus" placeholder="UDISE+ Portal Name" {...register('nameAsPerUdisePlus')} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* SECTION 2: AADHAAR DETAILS */}
        {activeTab === 'aadhaar' && (
          <Card className="border-border shadow-xs">
            <CardHeader className="border-b border-border bg-slate-50/50 px-6 py-4">
              <CardTitle className="text-base font-bold text-foreground">SECTION 2: AADHAAR DETAILS</CardTitle>
              <CardDescription>Configure the student's unique identification parameters.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-5 p-6">
              <div className="space-y-1.5">
                <Label htmlFor="aadhaarNumber" className="font-semibold text-xs text-muted-foreground">Aadhaar Number (12 digits) <span className="text-destructive">*</span></Label>
                <Input id="aadhaarNumber" placeholder="e.g. 123456789012" maxLength={12} {...register('aadhaarNumber')} className={errors.aadhaarNumber ? 'border-destructive focus-visible:ring-destructive' : ''} />
                {errors.aadhaarNumber && <p className="text-[11px] font-medium text-destructive">{errors.aadhaarNumber.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nameAsPerAadhaar" className="font-semibold text-xs text-muted-foreground">Name as per Aadhaar <span className="text-destructive">*</span></Label>
                <Input id="nameAsPerAadhaar" placeholder="Exactly as printed" {...register('nameAsPerAadhaar')} className={errors.nameAsPerAadhaar ? 'border-destructive focus-visible:ring-destructive' : ''} />
                {errors.nameAsPerAadhaar && <p className="text-[11px] font-medium text-destructive">{errors.nameAsPerAadhaar.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dobAsPerAadhaar" className="font-semibold text-xs text-muted-foreground">Date of Birth as per Aadhaar <span className="text-destructive">*</span></Label>
                <Input id="dobAsPerAadhaar" type="date" {...register('dobAsPerAadhaar')} className={errors.dobAsPerAadhaar ? 'border-destructive focus-visible:ring-destructive' : ''} />
                {errors.dobAsPerAadhaar && <p className="text-[11px] font-medium text-destructive">{errors.dobAsPerAadhaar.message}</p>}
              </div>

              {/* Aadhaar Upload block */}
              <div className="md:col-span-3 border border-border/85 rounded-xl p-5 bg-slate-50/20 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-foreground">Aadhaar Document Upload</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Please provide a PDF or Image scan of the student's Aadhaar Card.</p>
                </div>

                {initialAadhaarDoc && !changeAadhaar ? (
                  <div className="flex items-center justify-between border border-emerald-100 bg-emerald-50/30 dark:bg-emerald-950/10 dark:border-emerald-900/30 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">Existing Aadhaar Document</p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{initialAadhaarDoc.publicId}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={initialAadhaarDoc.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background hover:bg-accent hover:text-accent-foreground px-3 text-xs font-semibold cursor-pointer">
                        View
                      </a>
                      <button type="button" onClick={() => setChangeAadhaar(true)} className="inline-flex h-8 items-center justify-center rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 text-xs font-semibold cursor-pointer border border-rose-100 dark:border-rose-900/50">
                        Change File
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {aadhaarUpload ? (
                      <div className="flex items-center justify-between border border-dashed border-primary/40 bg-primary/5 p-4 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">
                              {aadhaarUpload.source === 'device' ? aadhaarUpload.file?.name : aadhaarUpload.source === 'camera' ? 'Captured Webcam Image' : aadhaarUpload.fileName}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 capitalize">
                              Source: {aadhaarUpload.source} {aadhaarUpload.file && `(${Math.round(aadhaarUpload.file.size / 1024)} KB)`}
                            </p>
                          </div>
                        </div>
                        <button type="button" onClick={() => setAadhaarUpload(null)} className="inline-flex h-8 items-center justify-center rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 text-xs font-semibold cursor-pointer">
                          Clear
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveUploadDoc('aadhaar');
                            const fileInput = document.getElementById('aadhaarFileInput');
                            fileInput?.click();
                          }}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold px-3.5 cursor-pointer shadow-xs transition-colors"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          Upload File
                        </button>

                        <button
                          type="button"
                          onClick={() => startCamera('aadhaar')}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground text-xs font-semibold px-3 cursor-pointer transition-colors"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          Webcam Capture
                        </button>

                        <button
                          type="button"
                          onClick={() => triggerDriveLink('aadhaar')}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground text-xs font-semibold px-3 cursor-pointer transition-colors"
                        >
                          <Link2 className="h-3.5 w-3.5" />
                          Google Drive Link
                        </button>

                        <input
                          type="file"
                          id="aadhaarFileInput"
                          className="hidden"
                          accept=".pdf,image/*"
                          onChange={(e) => handleFileChange(e, 'aadhaar')}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* SECTION 3: BANK DETAILS */}
        {activeTab === 'bank' && (
          <Card className="border-border shadow-xs">
            <CardHeader className="border-b border-border bg-slate-50/50 px-6 py-4">
              <CardTitle className="text-base font-bold text-foreground">SECTION 3: BANK DETAILS</CardTitle>
              <CardDescription>Setup bank account vectors for government educational subsidies.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-5 p-6">
              <div className="space-y-1.5">
                <Label htmlFor="bankAccountNumber" className="font-semibold text-xs text-muted-foreground">Student Bank Account Number <span className="text-destructive">*</span></Label>
                <Input id="bankAccountNumber" placeholder="Account Number" {...register('bankAccountNumber')} className={errors.bankAccountNumber ? 'border-destructive focus-visible:ring-destructive' : ''} />
                {errors.bankAccountNumber && <p className="text-[11px] font-medium text-destructive">{errors.bankAccountNumber.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ifscCode" className="font-semibold text-xs text-muted-foreground">IFSC Code <span className="text-destructive">*</span></Label>
                <Input id="ifscCode" placeholder="e.g. SBIN0001234" maxLength={11} {...register('ifscCode')} className={errors.ifscCode ? 'border-destructive focus-visible:ring-destructive' : ''} />
                {errors.ifscCode && <p className="text-[11px] font-medium text-destructive">{errors.ifscCode.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="accountHolderName" className="font-semibold text-xs text-muted-foreground">Account Holder Name <span className="text-destructive">*</span></Label>
                <Input id="accountHolderName" placeholder="Beneficiary name" {...register('accountHolderName')} className={errors.accountHolderName ? 'border-destructive focus-visible:ring-destructive' : ''} />
                {errors.accountHolderName && <p className="text-[11px] font-medium text-destructive">{errors.accountHolderName.message}</p>}
              </div>

              {/* Bank Passbook Upload block */}
              <div className="md:col-span-3 border border-border/85 rounded-xl p-5 bg-slate-50/20 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-foreground">Bank Passbook Document Upload</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Please provide a PDF or Image scan of the student's Bank Passbook.</p>
                </div>

                {initialBankDoc && !changeBank ? (
                  <div className="flex items-center justify-between border border-emerald-100 bg-emerald-50/30 dark:bg-emerald-950/10 dark:border-emerald-900/30 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">Existing Bank Passbook Document</p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{initialBankDoc.publicId}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={initialBankDoc.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background hover:bg-accent hover:text-accent-foreground px-3 text-xs font-semibold cursor-pointer">
                        View
                      </a>
                      <button type="button" onClick={() => setChangeBank(true)} className="inline-flex h-8 items-center justify-center rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 text-xs font-semibold cursor-pointer border border-rose-100 dark:border-rose-900/50">
                        Change File
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bankPassbookUpload ? (
                      <div className="flex items-center justify-between border border-dashed border-primary/40 bg-primary/5 p-4 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">
                              {bankPassbookUpload.source === 'device' ? bankPassbookUpload.file?.name : bankPassbookUpload.source === 'camera' ? 'Captured Webcam Image' : bankPassbookUpload.fileName}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 capitalize">
                              Source: {bankPassbookUpload.source} {bankPassbookUpload.file && `(${Math.round(bankPassbookUpload.file.size / 1024)} KB)`}
                            </p>
                          </div>
                        </div>
                        <button type="button" onClick={() => setBankPassbookUpload(null)} className="inline-flex h-8 items-center justify-center rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 text-xs font-semibold cursor-pointer">
                          Clear
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveUploadDoc('bank');
                            const fileInput = document.getElementById('bankFileInput');
                            fileInput?.click();
                          }}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold px-3.5 cursor-pointer shadow-xs transition-colors"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          Upload File
                        </button>

                        <button
                          type="button"
                          onClick={() => startCamera('bank')}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground text-xs font-semibold px-3 cursor-pointer transition-colors"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          Webcam Capture
                        </button>

                        <button
                          type="button"
                          onClick={() => triggerDriveLink('bank')}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground text-xs font-semibold px-3 cursor-pointer transition-colors"
                        >
                          <Link2 className="h-3.5 w-3.5" />
                          Google Drive Link
                        </button>

                        <input
                          type="file"
                          id="bankFileInput"
                          className="hidden"
                          accept=".pdf,image/*"
                          onChange={(e) => handleFileChange(e, 'bank')}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* SECTION 4: FAMILY DETAILS */}
        {activeTab === 'family' && (
          <Card className="border-border shadow-xs">
            <CardHeader className="border-b border-border bg-slate-50/50 px-6 py-4">
              <CardTitle className="text-base font-bold text-foreground">SECTION 4: FAMILY DETAILS</CardTitle>
              <CardDescription>Setup parent identification parameters and active communication channels.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5 p-6">
              <div className="space-y-1.5">
                <Label htmlFor="motherAadhaar" className="font-semibold text-xs text-muted-foreground">Mother's Aadhaar Number (12 digits) <span className="text-destructive">*</span></Label>
                <Input id="motherAadhaar" placeholder="12 digit identifier" maxLength={12} {...register('motherAadhaar')} className={errors.motherAadhaar ? 'border-destructive focus-visible:ring-destructive' : ''} />
                {errors.motherAadhaar && <p className="text-[11px] font-medium text-destructive">{errors.motherAadhaar.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fatherAadhaar" className="font-semibold text-xs text-muted-foreground">Father's Aadhaar Number (12 digits) <span className="text-destructive">*</span></Label>
                <Input id="fatherAadhaar" placeholder="12 digit identifier" maxLength={12} {...register('fatherAadhaar')} className={errors.fatherAadhaar ? 'border-destructive focus-visible:ring-destructive' : ''} />
                {errors.fatherAadhaar && <p className="text-[11px] font-medium text-destructive">{errors.fatherAadhaar.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mobileNumber1" className="font-semibold text-xs text-muted-foreground">Mobile Number 1 <span className="text-destructive">*</span></Label>
                <Input id="mobileNumber1" placeholder="Primary 10 digit phone number" maxLength={10} {...register('mobileNumber1')} className={errors.mobileNumber1 ? 'border-destructive focus-visible:ring-destructive' : ''} />
                {errors.mobileNumber1 && <p className="text-[11px] font-medium text-destructive">{errors.mobileNumber1.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mobileNumber2" className="font-semibold text-xs text-muted-foreground">Mobile Number 2 (Secondary)</Label>
                <Input id="mobileNumber2" placeholder="Alternate 10 digit phone number" maxLength={10} {...register('mobileNumber2')} className={errors.mobileNumber2 ? 'border-destructive focus-visible:ring-destructive' : ''} />
                {errors.mobileNumber2 && <p className="text-[11px] font-medium text-destructive">{errors.mobileNumber2.message}</p>}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Buttons navigation */}
        <div className="flex items-center justify-between border-t border-border pt-4">
          <button
            type="button"
            onClick={handleBack}
            disabled={activeTab === 'basic'}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-background hover:bg-accent px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:pointer-events-none cursor-pointer transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          {activeTab !== 'family' ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary hover:bg-primary/95 px-5 py-2 text-sm font-semibold text-primary-foreground cursor-pointer transition-colors duration-200"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-6 py-2 text-sm font-semibold text-white cursor-pointer disabled:opacity-50 disabled:pointer-events-none shadow-sm shadow-emerald-600/10 transition-colors duration-200"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Profile...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4.5 w-4.5" />
                  {isEditMode ? 'Save Profile Details' : 'Register Student'}
                </>
              )}
            </button>
          )}
        </div>
      </form>

      {/* Webcam Scanner Modal */}
      <Dialog open={cameraModalOpen} onOpenChange={(open) => { if (!open) stopCamera(); }}>
        <DialogContent className="max-w-lg p-0 overflow-hidden bg-zinc-950 flex flex-col h-[70vh]">
          <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/80 to-transparent p-4 z-10 flex items-center justify-between text-white">
            <div>
              <DialogTitle className="font-bold text-sm">Webcam Document Scanner</DialogTitle>
              <DialogDescription className="text-[10px] text-zinc-400">
                Align document inside camera frame
              </DialogDescription>
            </div>
            <button 
              type="button"
              onClick={stopCamera}
              className="h-8 w-8 rounded-full bg-zinc-900/80 flex items-center justify-center hover:bg-zinc-800 transition-colors cursor-pointer text-white"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-zinc-950">
            {capturedPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={capturedPhotoUrl}
                alt="Captured document snapshot preview"
                className="w-full h-full object-contain"
              />
            ) : (
              <>
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />

                <div className="absolute inset-8 border-2 border-dashed border-primary/50 rounded-lg pointer-events-none flex items-center justify-center">
                  <span className="text-[10px] bg-black/60 text-white/80 px-3 py-1 rounded-full uppercase tracking-wider font-semibold border border-white/10">
                    Document Overlay Guide
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="bg-black p-5 flex justify-center items-center gap-4 border-t border-zinc-900 z-10">
            {capturedPhotoUrl ? (
              <>
                <button
                  type="button"
                  onClick={retakePhoto}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 px-4 text-xs font-semibold text-zinc-200 cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4 mr-1.5" />
                  Retake Photo
                </button>
                <button
                  type="button"
                  onClick={confirmPhoto}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-500 px-5 text-xs font-semibold text-white cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Confirm Photo
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={captureSnapshot}
                className="h-14 w-14 rounded-full border-4 border-white bg-red-655 flex items-center justify-center hover:bg-red-700 active:scale-95 transition-all shadow-md cursor-pointer"
                title="Capture Image"
              >
                <span className="h-4 w-4 bg-white rounded-full"></span>
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Google Drive Link Modal */}
      <Dialog open={driveModalOpen} onOpenChange={setDriveModalOpen}>
        <DialogContent className="max-w-md bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="font-bold">Google Drive Upload</DialogTitle>
            <DialogDescription>
              Link a shareable Google Drive file directly. Make sure the file sharing setting is set to **"Anyone with the link can view"**.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="driveUrl" className="font-semibold text-xs text-muted-foreground">Google Drive Link <span className="text-destructive">*</span></Label>
              <Input
                id="driveUrl"
                placeholder="https://drive.google.com/file/d/FILE_ID/view?usp=sharing"
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="driveFileName" className="font-semibold text-xs text-muted-foreground">Display Name</Label>
              <Input
                id="driveFileName"
                placeholder={activeUploadDoc === 'aadhaar' ? 'Aadhaar_Card_Link.pdf' : 'Bank_Passbook_Link.pdf'}
                value={driveFileName}
                onChange={(e) => setDriveFileName(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <button
              type="button"
              onClick={() => setDriveModalOpen(false)}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border hover:bg-accent px-4 py-2 text-xs font-semibold text-muted-foreground cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitDriveLink}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold px-4 py-2 cursor-pointer shadow-xs transition-colors"
            >
              Confirm Link
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Submit Progress Overlay */}
      {submitProgress && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-4 text-white p-6">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="font-bold text-sm tracking-wide animate-pulse">{submitProgress}</p>
        </div>
      )}
    </div>
  );
}
