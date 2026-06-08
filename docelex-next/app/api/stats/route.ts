import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Student from '@/lib/models/Student';
import Document from '@/lib/models/Document';

export async function GET() {
  try {
    await connectDB();

    const totalStudents = await Student.countDocuments();
    
    // Aggregation of document statuses
    const docStatuses = await Document.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const statusCounts = {
      Pending: 0,
      Verified: 0,
      Rejected: 0,
    };

    docStatuses.forEach((statusGroup) => {
      if (statusGroup._id in statusCounts) {
        statusCounts[statusGroup._id as keyof typeof statusCounts] = statusGroup.count;
      }
    });

    const totalUploaded = statusCounts.Pending + statusCounts.Verified + statusCounts.Rejected;
    const totalRequiredDocs = totalStudents * 11; // 11 required docs per student
    const completenessRate = totalRequiredDocs > 0 ? Math.round((totalUploaded / totalRequiredDocs) * 100) : 0;

    // Caste category counts
    const casteGroups = await Student.aggregate([
      {
        $group: {
          _id: '$casteCategory',
          count: { $sum: 1 },
        },
      },
    ]);

    const casteCategoryCounts = {
      General: 0,
      OBC: 0,
      SC: 0,
      ST: 0,
      EWS: 0,
    };

    casteGroups.forEach((group) => {
      if (group._id in casteCategoryCounts) {
        casteCategoryCounts[group._id as keyof typeof casteCategoryCounts] = group.count;
      }
    });

    // Class distribution
    const classGroups = await Student.aggregate([
      {
        $group: {
          _id: '$class',
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const classDistribution = classGroups.map((g) => ({
      className: g._id,
      count: g.count,
    }));

    // Document types verification summary
    const docTypeSummary = await Document.aggregate([
      {
        $group: {
          _id: '$documentType',
          verified: {
            $sum: { $cond: [{ $eq: ['$status', 'Verified'] }, 1, 0] },
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] },
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] },
          },
          total: { $sum: 1 },
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalStudents,
        totalUploaded,
        completenessRate,
        pendingVerifications: statusCounts.Pending,
        verifiedDocs: statusCounts.Verified,
        rejectedDocs: statusCounts.Rejected,
        casteCategoryCounts,
        classDistribution,
        docTypeSummary,
      },
    });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Server error fetching stats' },
      { status: 500 }
    );
  }
}
