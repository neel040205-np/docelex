import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Document from '@/lib/models/Document';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  try {
    await connectDB();
    const { docId } = await params;
    const body = await req.json();

    const { status, remarks, verifiedBy } = body;

    if (!status || !['Pending', 'Verified', 'Rejected'].includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Invalid or missing status value' },
        { status: 400 }
      );
    }

    const document = await Document.findById(docId);
    if (!document) {
      return NextResponse.json({ success: false, message: 'Document not found' }, { status: 404 });
    }

    // Update fields
    document.status = status;
    document.remarks = remarks || '';
    document.verifiedBy = verifiedBy || 'Administrator';
    document.uploadDate = document.uploadDate; // Preserve upload date

    await document.save();

    return NextResponse.json({
      success: true,
      message: `Document status updated to ${status}`,
      data: document,
    });
  } catch (error: any) {
    console.error('Error verifying document:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Server error' },
      { status: 500 }
    );
  }
}
