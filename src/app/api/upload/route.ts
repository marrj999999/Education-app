import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { uploadEvidenceFile, deleteEvidenceFile } from '@/lib/storage';

/**
 * POST /api/upload
 *
 * Upload an evidence file for an assessment.
 * Requires cohortId, learnerId, and file in form data.
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const cohortId = formData.get('cohortId') as string | null;
    const learnerId = formData.get('learnerId') as string | null;
    const criterionCode = formData.get('criterionCode') as string | null;

    if (!file || !cohortId || !learnerId) {
      return NextResponse.json(
        { error: 'Missing required fields: file, cohortId, learnerId' },
        { status: 400 }
      );
    }

    // Verify user has access to this cohort
    if (!['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
      const assignment = await prisma.cohortInstructor.findUnique({
        where: { cohortId_userId: { cohortId, userId: session.user.id } }
      });

      if (!assignment) {
        return NextResponse.json({ error: 'Not authorized for this cohort' }, { status: 403 });
      }
    }

    // Verify learner exists in cohort
    const learner = await prisma.learner.findFirst({
      where: { id: learnerId, cohortId }
    });

    if (!learner) {
      return NextResponse.json({ error: 'Learner not found in cohort' }, { status: 404 });
    }

    // Upload file
    const result = await uploadEvidenceFile(cohortId, learnerId, file);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // If criterionCode provided, update the assessment's evidenceFiles array
    if (criterionCode && result.url) {
      await prisma.assessmentSignoff.updateMany({
        where: {
          learnerId,
          criterionCode
        },
        data: {
          evidenceFiles: {
            push: result.url
          }
        }
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'EVIDENCE_UPLOADED',
        entity: 'ASSESSMENT',
        entityId: learnerId,
        details: {
          cohortId,
          learnerId,
          criterionCode,
          filename: result.filename,
          url: result.url
        }
      }
    });

    return NextResponse.json({
      success: true,
      url: result.url,
      filename: result.filename
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to process upload' }, { status: 500 });
  }
}

/**
 * DELETE /api/upload
 *
 * Delete an evidence file.
 */
export async function DELETE(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { url, cohortId, learnerId, criterionCode } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    // Verify user has access (admin or assigned instructor)
    if (cohortId && !['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
      const assignment = await prisma.cohortInstructor.findUnique({
        where: { cohortId_userId: { cohortId, userId: session.user.id } }
      });

      if (!assignment) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }
    }

    // Delete file
    const deleted = await deleteEvidenceFile(url);

    if (!deleted) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // If criterionCode provided, remove from assessment's evidenceFiles array
    if (criterionCode && learnerId) {
      const assessment = await prisma.assessmentSignoff.findFirst({
        where: { learnerId, criterionCode }
      });

      if (assessment) {
        const updatedFiles = assessment.evidenceFiles.filter((f: string) => f !== url);
        await prisma.assessmentSignoff.update({
          where: { id: assessment.id },
          data: { evidenceFiles: updatedFiles }
        });
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'EVIDENCE_DELETED',
        entity: 'ASSESSMENT',
        entityId: learnerId || 'unknown',
        details: { url, cohortId, learnerId, criterionCode }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
