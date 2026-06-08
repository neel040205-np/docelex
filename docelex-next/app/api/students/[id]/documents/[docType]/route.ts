import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Document, { DocumentType } from '@/lib/models/Document';
import Student from '@/lib/models/Student';
import fs from 'fs';
import path from 'path';

// Valid document types
const VALID_DOC_TYPES = [
  'birthCertificate',
  'incomeCertificate',
  'rationCard',
  'studentCasteCertificate',
  'fatherCasteCertificate',
  'studentBankPassbook',
  'fatherBankPassbook',
  'motherBankPassbook',
  'motherAadhaar',
  'fatherAadhaar',
  'studentAadhaar',
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docType: string }> }
) {
  try {
    await connectDB();
    const { id, docType } = await params;

    if (!VALID_DOC_TYPES.includes(docType)) {
      return NextResponse.json(
        { success: false, message: `Invalid document type: ${docType}` },
        { status: 400 }
      );
    }

    const studentExists = await Student.exists({ _id: id });
    if (!studentExists) {
      return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 });
    }

    // Create uploads folder if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public/uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    let fileUrl = '';
    let publicId = '';
    let originalName = '';

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const driveUrl = formData.get('driveUrl') as string | null;
      const driveFileName = formData.get('driveFileName') as string | null;

      if (file) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const fileExt = path.extname(file.name) || '.pdf';
        const fileName = `${id}-${docType}-${Date.now()}${fileExt}`;
        const filePath = path.join(uploadsDir, fileName);

        fs.writeFileSync(filePath, buffer);

        fileUrl = `/uploads/${fileName}`;
        publicId = fileName;
        originalName = file.name;
      } else if (driveUrl) {
        // Form data representation of Drive URL
        fileUrl = driveUrl;
        publicId = `drive-${Date.now()}`;
        originalName = driveFileName || `${docType}_Google_Drive_Link.pdf`;
      } else {
        return NextResponse.json(
          { success: false, message: 'No file or Drive URL provided in form data' },
          { status: 400 }
        );
      }
    } else if (contentType.includes('application/json')) {
      const body = await req.json();
      const { cameraDataUrl, driveUrl, fileName } = body;

      if (driveUrl) {
        fileUrl = driveUrl;
        publicId = `drive-${Date.now()}`;
        originalName = fileName || `${docType}_Google_Drive_Link.pdf`;
      } else if (cameraDataUrl) {
        // Base64 format: data:image/jpeg;base64,...
        const matches = cameraDataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          return NextResponse.json(
            { success: false, message: 'Invalid camera image format' },
            { status: 400 }
          );
        }

        const buffer = Buffer.from(matches[2], 'base64');
        const fileName = `${id}-${docType}-${Date.now()}.jpg`;
        const filePath = path.join(uploadsDir, fileName);

        fs.writeFileSync(filePath, buffer);

        fileUrl = `/uploads/${fileName}`;
        publicId = fileName;
        originalName = fileName;
      } else {
        return NextResponse.json(
          { success: false, message: 'No Google Drive URL or Camera base64 data provided' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, message: 'Unsupported content type' },
        { status: 400 }
      );
    }

    // Check if document already exists
    const existingDoc = await Document.findOne({ studentId: id, documentType: docType });

    if (existingDoc) {
      // Physically delete the old local file if there is one
      if (existingDoc.publicId && !existingDoc.publicId.startsWith('drive-')) {
        const oldFilePath = path.join(uploadsDir, existingDoc.publicId);
        try {
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        } catch (err: any) {
          console.error('Error deleting old physical file:', err.message);
        }
      }

      // Update the existing document details
      existingDoc.fileUrl = fileUrl;
      existingDoc.publicId = publicId;
      existingDoc.uploadDate = new Date();
      existingDoc.status = 'Pending'; // Reset to pending verification upon re-upload
      existingDoc.remarks = '';
      existingDoc.verifiedBy = '';

      await existingDoc.save();

      return NextResponse.json({
        success: true,
        message: 'Document re-uploaded successfully',
        data: existingDoc,
      });
    } else {
      // Create new document record
      const newDoc = await Document.create({
        studentId: id,
        documentType: docType as DocumentType,
        fileUrl,
        publicId,
        uploadDate: new Date(),
        status: 'Pending',
        remarks: '',
        verifiedBy: '',
      });

      return NextResponse.json({
        success: true,
        message: 'Document uploaded successfully',
        data: newDoc,
      }, { status: 201 });
    }
  } catch (error: any) {
    console.error('Error uploading student document:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docType: string }> }
) {
  try {
    await connectDB();
    const { id, docType } = await params;

    const document = await Document.findOne({ studentId: id, documentType: docType });
    if (!document) {
      return NextResponse.json(
        { success: false, message: 'Document record not found' },
        { status: 404 }
      );
    }

    // Physically delete file if stored locally
    if (document.publicId && !document.publicId.startsWith('drive-')) {
      const filePath = path.join(process.cwd(), 'public/uploads', document.publicId);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err: any) {
        console.error('Error deleting local file:', err.message);
      }
    }

    await Document.findByIdAndDelete(document._id);

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting student document:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Server error' },
      { status: 500 }
    );
  }
}
