'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { studentSchema, type StudentSchemaInput } from '@/lib/schema';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ArrowLeft, ArrowRight, Save, User } from 'lucide-react';
import api from '@/lib/api';

interface StudentFormProps {
  initialData?: any;
  onSubmitSuccess: (studentId: string) => void;
}

export default function StudentForm({ initialData, onSubmitSuccess }: StudentFormProps) {
  const [activeTab, setActiveTab] = React.useState('basic');
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');

  const defaultValues = React.useMemo(() => {
    if (initialData) {
      return {
        ...initialData,
        dob: initialData.dob ? new Date(initialData.dob).toISOString().split('T')[0] : '',
        admissionDate: initialData.admissionDate ? new Date(initialData.admissionDate).toISOString().split('T')[0] : '',
        aadhaarDob: initialData.aadhaarDob ? new Date(initialData.aadhaarDob).toISOString().split('T')[0] : '',
      };
    }
    return {
      srNumber: '',
      grNumber: '',
      surname: '',
      firstName: '',
      fatherName: '',
      grandFatherName: '',
      motherName: '',
      gender: 'Male',
      dob: '',
      admissionDate: '',
      caste: '',
      casteCategory: 'General',
      penNumber: '',
      apaarId: '',
      udiseNumber: '',
      nameAsPerChildTracking: '',
      nameAsPerUdisePlus: '',
      aadhaarNumber: '',
      aadhaarName: '',
      aadhaarDob: '',
      bankAccountNumber: '',
      bankIfscCode: '',
      bankAccountHolderName: '',
      motherAadhaarNumber: '',
      fatherAadhaarNumber: '',
      mobileNumber1: '',
      mobileNumber2: '',
    };
  }, [initialData]);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<StudentSchemaInput>({
    resolver: zodResolver(studentSchema),
    defaultValues: defaultValues as any,
  });

  const handleNextTab = async (current: string, next: string) => {
    let fieldsToValidate: any[] = [];
    if (current === 'basic') {
      fieldsToValidate = [
        'srNumber', 'grNumber', 'surname', 'firstName', 'fatherName',
        'grandFatherName', 'motherName', 'gender', 'dob', 'admissionDate',
        'caste', 'casteCategory'
      ];
    } else if (current === 'aadhaar') {
      fieldsToValidate = ['aadhaarNumber', 'aadhaarName', 'aadhaarDob'];
    } else if (current === 'bank') {
      fieldsToValidate = ['bankAccountNumber', 'bankIfscCode', 'bankAccountHolderName'];
    }

    const isValid = await trigger(fieldsToValidate as any);
    if (isValid) {
      setActiveTab(next);
    }
  };

  const handleFormSubmit = async (values: StudentSchemaInput) => {
    setLoading(true);
    setErrorMsg('');
    try {
      let response;
      if (initialData?._id) {
        response = await api.put(`/students/${initialData._id}`, values);
      } else {
        response = await api.post('/students', values);
      }

      if (response.data?.success) {
        onSubmitSuccess(response.data.data._id);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to submit student details. Please verify fields.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 w-full mb-6">
            <TabsTrigger value="basic">1. Basic Details</TabsTrigger>
            <TabsTrigger value="aadhaar">2. Aadhaar Details</TabsTrigger>
            <TabsTrigger value="bank">3. Bank Details</TabsTrigger>
            <TabsTrigger value="family">4. Family Details</TabsTrigger>
          </TabsList>

          {/* SECTION 1: STUDENT BASIC DETAILS */}
          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>Student Basic Details</CardTitle>
                <CardDescription>Enter primary registry metadata and academic identifier keys.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="srNumber">SR Number *</Label>
                    <Input id="srNumber" {...register('srNumber')} />
                    {errors.srNumber && <p className="text-xs text-red-600">{errors.srNumber.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grNumber">GR Number *</Label>
                    <Input id="grNumber" {...register('grNumber')} />
                    {errors.grNumber && <p className="text-xs text-red-600">{errors.grNumber.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admissionDate">Admission Date *</Label>
                    <Input id="admissionDate" type="date" {...register('admissionDate')} />
                    {errors.admissionDate && <p className="text-xs text-red-600">{errors.admissionDate.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="surname">Surname *</Label>
                    <Input id="surname" {...register('surname')} />
                    {errors.surname && <p className="text-xs text-red-600">{errors.surname.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input id="firstName" {...register('firstName')} />
                    {errors.firstName && <p className="text-xs text-red-600">{errors.firstName.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fatherName">Father's Name *</Label>
                    <Input id="fatherName" {...register('fatherName')} />
                    {errors.fatherName && <p className="text-xs text-red-600">{errors.fatherName.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grandFatherName">Grand Father's Name *</Label>
                    <Input id="grandFatherName" {...register('grandFatherName')} />
                    {errors.grandFatherName && <p className="text-xs text-red-600">{errors.grandFatherName.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="motherName">Mother's Name *</Label>
                    <Input id="motherName" {...register('motherName')} />
                    {errors.motherName && <p className="text-xs text-red-600">{errors.motherName.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender *</Label>
                    <Select id="gender" {...register('gender')}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </Select>
                    {errors.gender && <p className="text-xs text-red-600">{errors.gender.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth *</Label>
                    <Input id="dob" type="date" {...register('dob')} />
                    {errors.dob && <p className="text-xs text-red-600">{errors.dob.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="casteCategory">Caste Category *</Label>
                    <Select id="casteCategory" {...register('casteCategory')}>
                      <option value="General">General</option>
                      <option value="OBC">OBC</option>
                      <option value="SC">SC</option>
                      <option value="ST">ST</option>
                      <option value="EWS">EWS</option>
                    </Select>
                    {errors.casteCategory && <p className="text-xs text-red-600">{errors.casteCategory.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="caste">Caste *</Label>
                    <Input id="caste" placeholder="E.g. Patel / Rajput" {...register('caste')} />
                    {errors.caste && <p className="text-xs text-red-600">{errors.caste.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="penNumber">PEN Number (Permanent Education Number)</Label>
                    <Input id="penNumber" {...register('penNumber')} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="apaarId">APAAR ID</Label>
                    <Input id="apaarId" {...register('apaarId')} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="udiseNumber">UDISE Number</Label>
                    <Input id="udiseNumber" {...register('udiseNumber')} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nameAsPerChildTracking">Student Name as per Child Tracking</Label>
                    <Input id="nameAsPerChildTracking" {...register('nameAsPerChildTracking')} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nameAsPerUdisePlus">Student Name as per UDISE+</Label>
                    <Input id="nameAsPerUdisePlus" {...register('nameAsPerUdisePlus')} />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="button" onClick={() => handleNextTab('basic', 'aadhaar')} className="flex items-center gap-2">
                    Next Section <ArrowRight size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SECTION 2: AADHAAR DETAILS */}
          <TabsContent value="aadhaar">
            <Card>
              <CardHeader>
                <CardTitle>Aadhaar Verification Details</CardTitle>
                <CardDescription>Enter demographic details matching the student's physical Aadhaar card.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="aadhaarNumber">Aadhaar Number *</Label>
                  <Input id="aadhaarNumber" maxLength={12} placeholder="E.g. 123456789012" {...register('aadhaarNumber')} />
                  {errors.aadhaarNumber && <p className="text-xs text-red-600">{errors.aadhaarNumber.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aadhaarName">Name as per Aadhaar *</Label>
                  <Input id="aadhaarName" placeholder="Full name exactly as printed on card" {...register('aadhaarName')} />
                  {errors.aadhaarName && <p className="text-xs text-red-600">{errors.aadhaarName.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aadhaarDob">Date of Birth as per Aadhaar *</Label>
                  <Input id="aadhaarDob" type="date" {...register('aadhaarDob')} />
                  {errors.aadhaarDob && <p className="text-xs text-red-600">{errors.aadhaarDob.message}</p>}
                </div>

                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={() => setActiveTab('basic')} className="flex items-center gap-2">
                    <ArrowLeft size={16} /> Back
                  </Button>
                  <Button type="button" onClick={() => handleNextTab('aadhaar', 'bank')} className="flex items-center gap-2">
                    Next Section <ArrowRight size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SECTION 3: BANK DETAILS */}
          <TabsContent value="bank">
            <Card>
              <CardHeader>
                <CardTitle>Student Bank Details</CardTitle>
                <CardDescription>Configure bank account details for government scholarships and direct benefit transfers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankAccountNumber">Student Bank Account Number *</Label>
                    <Input id="bankAccountNumber" {...register('bankAccountNumber')} />
                    {errors.bankAccountNumber && <p className="text-xs text-red-600">{errors.bankAccountNumber.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bankIfscCode">IFSC Code *</Label>
                    <Input id="bankIfscCode" placeholder="E.g. SBIN0012345" {...register('bankIfscCode')} />
                    {errors.bankIfscCode && <p className="text-xs text-red-600">{errors.bankIfscCode.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankAccountHolderName">Account Holder Name *</Label>
                  <Input id="bankAccountHolderName" {...register('bankAccountHolderName')} />
                  {errors.bankAccountHolderName && <p className="text-xs text-red-600">{errors.bankAccountHolderName.message}</p>}
                </div>

                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={() => setActiveTab('aadhaar')} className="flex items-center gap-2">
                    <ArrowLeft size={16} /> Back
                  </Button>
                  <Button type="button" onClick={() => handleNextTab('bank', 'family')} className="flex items-center gap-2">
                    Next Section <ArrowRight size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SECTION 4: FAMILY DETAILS */}
          <TabsContent value="family">
            <Card>
              <CardHeader>
                <CardTitle>Family Aadhaar & Contact Details</CardTitle>
                <CardDescription>Enter parental identifiers and primary contact information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="motherAadhaarNumber">Mother's Aadhaar Number *</Label>
                    <Input id="motherAadhaarNumber" maxLength={12} placeholder="12 digit number" {...register('motherAadhaarNumber')} />
                    {errors.motherAadhaarNumber && <p className="text-xs text-red-600">{errors.motherAadhaarNumber.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fatherAadhaarNumber">Father's Aadhaar Number *</Label>
                    <Input id="fatherAadhaarNumber" maxLength={12} placeholder="12 digit number" {...register('fatherAadhaarNumber')} />
                    {errors.fatherAadhaarNumber && <p className="text-xs text-red-600">{errors.fatherAadhaarNumber.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mobileNumber1">Mobile Number 1 *</Label>
                    <Input id="mobileNumber1" maxLength={10} placeholder="10 digit number" {...register('mobileNumber1')} />
                    {errors.mobileNumber1 && <p className="text-xs text-red-600">{errors.mobileNumber1.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mobileNumber2">Mobile Number 2 (Optional)</Label>
                    <Input id="mobileNumber2" maxLength={10} placeholder="10 digit number" {...register('mobileNumber2')} />
                    {errors.mobileNumber2 && <p className="text-xs text-red-600">{errors.mobileNumber2.message}</p>}
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={() => setActiveTab('bank')} className="flex items-center gap-2">
                    <ArrowLeft size={16} /> Back
                  </Button>
                  <Button type="submit" disabled={loading} className="flex items-center gap-2">
                    <Save size={16} /> {loading ? 'Submitting...' : 'Save Student Records'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
}
