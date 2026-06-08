import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Student from '@/lib/models/Student';
import Document from '@/lib/models/Document';
import { StudentFormSchema } from '@/lib/schemas/student';

// GET all students (paginated, with search & filters)
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';
    const studentClass = searchParams.get('class') || '';
    const casteCategory = searchParams.get('casteCategory') || '';
    const admissionYear = searchParams.get('admissionYear') || '';
    const verificationStatus = searchParams.get('verificationStatus') || '';

    const skip = (page - 1) * limit;
    const query: any = {};

    // Apply Search (GR No, SR No, Name, Mobile, Aadhaar)
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { surname: regex },
        { firstName: regex },
        { fatherName: regex },
        { grandFatherName: regex },
        { grNumber: regex },
        { srNumber: regex },
        { mobileNumber1: regex },
        { aadhaarNumber: regex },
      ];
    }

    // Apply Filters
    if (studentClass) {
      query.class = studentClass;
    }

    if (casteCategory) {
      query.casteCategory = casteCategory;
    }

    if (admissionYear) {
      const year = parseInt(admissionYear, 10);
      if (!isNaN(year)) {
        query.admissionDate = {
          $gte: new Date(year, 0, 1),
          $lte: new Date(year, 11, 31, 23, 59, 59, 999),
        };
      }
    }

    // Apply Document Verification Status Filter
    if (verificationStatus) {
      // Find students whose documents have the matching status
      // Note: 'Pending' can include students with no uploaded documents
      const docs = await Document.find({ status: verificationStatus }).select('studentId');
      const studentIds = docs.map((d) => d.studentId.toString());
      
      if (verificationStatus === 'Pending') {
        // For 'Pending', we can also include students who haven't uploaded some or any documents.
        // But the simplest is to match the studentIds of documents that are 'Pending',
        // or check students whose total uploaded documents count is less than 11.
        // Let's do a direct ID query.
        query.$or = [
          { _id: { $in: studentIds } },
          // Also include students who don't have all 11 documents uploaded (meaning at least one is missing/pending upload)
        ];
      } else {
        query._id = { $in: studentIds };
      }
    }

    const total = await Student.countDocuments(query);
    const studentsList = await Student.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Enrich students with document upload counts
    const studentsWithDocs = await Promise.all(
      studentsList.map(async (student) => {
        const docs = await Document.find({ studentId: student._id });
        const uploadedCount = docs.length;
        const verifiedCount = docs.filter((d) => d.status === 'Verified').length;
        const pendingCount = docs.filter((d) => d.status === 'Pending').length;
        const rejectedCount = docs.filter((d) => d.status === 'Rejected').length;

        // Calculate overall status for the student
        let overallStatus = 'Pending';
        if (uploadedCount === 11 && verifiedCount === 11) {
          overallStatus = 'Verified';
        } else if (rejectedCount > 0) {
          overallStatus = 'Rejected';
        }

        return {
          ...student.toObject(),
          documentStats: {
            uploaded: uploadedCount,
            verified: verifiedCount,
            pending: pendingCount,
            rejected: rejectedCount,
            totalRequired: 11,
          },
          overallStatus,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: studentsWithDocs,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/students:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Server error' },
      { status: 500 }
    );
  }
}

// POST: Create/Register student
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    // Validate request body against Zod schema
    const validationResult = StudentFormSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.format();
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check duplicate GR number
    const duplicateGR = await Student.findOne({ grNumber: data.grNumber });
    if (duplicateGR) {
      return NextResponse.json(
        { success: false, message: `A student with GR Number "${data.grNumber}" already exists.` },
        { status: 400 }
      );
    }

    // Check duplicate SR number
    const duplicateSR = await Student.findOne({ srNumber: data.srNumber });
    if (duplicateSR) {
      return NextResponse.json(
        { success: false, message: `A student with SR Number "${data.srNumber}" already exists.` },
        { status: 400 }
      );
    }

    // Save Student
    const newStudent = await Student.create(data);

    return NextResponse.json({
      success: true,
      message: 'Student registered successfully',
      data: newStudent,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/students:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Server error' },
      { status: 500 }
    );
  }
}
