import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Student from '@/lib/models/Student';
import Document from '@/lib/models/Document';
import { StudentFormSchema } from '@/lib/schemas/student';
import fs from 'fs';
import path from 'path';

// GET student details by ID (including document records)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;

    const student = await Student.findById(id);
    if (!student) {
      return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 });
    }

    // Retrieve documents
    const documents = await Document.find({ studentId: id });

    return NextResponse.json({
      success: true,
      data: {
        student,
        documents,
      },
    });
  } catch (error: any) {
    console.error(`Error in GET /api/students/[id]:`, error);
    return NextResponse.json(
      { success: false, message: error.message || 'Server error' },
      { status: 500 }
    );
  }
}

// PUT student details by ID
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const student = await Student.findById(id);
    if (!student) {
      return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 });
    }

    // Validate request body
    const validationResult = StudentFormSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.format();
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check duplicate GR number if changed
    if (data.grNumber !== student.grNumber) {
      const duplicateGR = await Student.findOne({ grNumber: data.grNumber });
      if (duplicateGR) {
        return NextResponse.json(
          { success: false, message: `A student with GR Number "${data.grNumber}" already exists.` },
          { status: 400 }
        );
      }
    }

    // Check duplicate SR number if changed
    if (data.srNumber !== student.srNumber) {
      const duplicateSR = await Student.findOne({ srNumber: data.srNumber });
      if (duplicateSR) {
        return NextResponse.json(
          { success: false, message: `A student with SR Number "${data.srNumber}" already exists.` },
          { status: 400 }
        );
      }
    }

    // Update Student
    const updatedStudent = await Student.findByIdAndUpdate(id, data, { new: true });

    return NextResponse.json({
      success: true,
      message: 'Student profile updated successfully',
      data: updatedStudent,
    });
  } catch (error: any) {
    console.error(`Error in PUT /api/students/[id]:`, error);
    return NextResponse.json(
      { success: false, message: error.message || 'Server error' },
      { status: 500 }
    );
  }
}

// DELETE student and associated documents/files
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;

    const student = await Student.findById(id);
    if (!student) {
      return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 });
    }

    // Find all documents for student to delete files physically
    const documents = await Document.find({ studentId: id });

    // Physically delete local files
    documents.forEach((doc) => {
      if (doc.publicId && !doc.publicId.startsWith('drive-')) {
        const filePath = path.join(process.cwd(), 'public/uploads', doc.publicId);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Local file deleted successfully: ${filePath}`);
          }
        } catch (err: any) {
          console.error(`Error deleting local file: ${filePath}`, err.message);
        }
      }
    });

    // Delete document records
    await Document.deleteMany({ studentId: id });

    // Delete Student record
    await Student.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Student and all associated files deleted successfully',
    });
  } catch (error: any) {
    console.error(`Error in DELETE /api/students/[id]:`, error);
    return NextResponse.json(
      { success: false, message: error.message || 'Server error' },
      { status: 500 }
    );
  }
}
