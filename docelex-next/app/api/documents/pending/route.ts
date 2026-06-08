import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Document from '@/lib/models/Document';
import Student from '@/lib/models/Student'; // Imported so the ref resolver works

export async function GET() {
  try {
    await connectDB();

    // Query pending documents and populate student fields
    const pendingDocs = await Document.find({ status: 'Pending' })
      .populate('studentId', 'grNumber srNumber firstName surname fatherName class division')
      .sort({ uploadDate: 1 }); // Oldest uploads first

    return NextResponse.json({
      success: true,
      data: pendingDocs,
    });
  } catch (error: any) {
    console.error('Error fetching pending documents:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Server error' },
      { status: 500 }
    );
  }
}
