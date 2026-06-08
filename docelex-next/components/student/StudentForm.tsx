'use strict';
'use client';

import React, { useState } from 'react';
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
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudentFormProps {
  initialValues?: Partial<StudentFormValues> & { _id?: string };
  isEditMode?: boolean;
}

type TabKey = 'basic' | 'aadhaar' | 'bank' | 'family';

interface TabItem {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: (keyof StudentFormValues)[];
}

export function StudentForm({ initialValues, isEditMode = false }: StudentFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('basic');
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      // Redirect to profile page on successful registration or edit
      const studentId = isEditMode ? initialValues?._id : result.data._id;
      router.push(`/students/${studentId}`);
      router.refresh();
    } catch (err: any) {
      setServerError(err.message || 'An unexpected error occurred');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
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
    </div>
  );
}
