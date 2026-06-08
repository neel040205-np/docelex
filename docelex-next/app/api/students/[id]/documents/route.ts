import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Document from '@/lib/models/Document';
import Student from '@/lib/models/Student';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;

    const studentExists = await Student.exists({ _id: id });
    if (!studentExists) {
      return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 });
    }

    const documents = await Document.find({ studentId: id });
    return NextResponse.json({
      success: true,
      data: documents,
    });
  } catch (error: any) {
    console.error('Error fetching student documents:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Server error' },
      { status: 500 }
    );
  }
}
