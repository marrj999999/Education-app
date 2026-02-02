/**
 * Tests for file upload API
 * Verifies evidence file upload and deletion functionality
 */

import { POST, DELETE } from '@/app/api/upload/route';
import { createMockSession, mockUsers } from './test-utils';

// Mock dependencies
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    cohortInstructor: {
      findUnique: jest.fn(),
    },
    learner: {
      findFirst: jest.fn(),
    },
    assessmentSignoff: {
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/storage', () => ({
  uploadEvidenceFile: jest.fn(),
  deleteEvidenceFile: jest.fn(),
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { uploadEvidenceFile, deleteEvidenceFile } from '@/lib/storage';

// Cast auth as jest.Mock to avoid strict typing issues with Session
const mockAuth = auth as jest.Mock;
const mockUpload = uploadEvidenceFile as jest.MockedFunction<typeof uploadEvidenceFile>;
const mockDelete = deleteEvidenceFile as jest.MockedFunction<typeof deleteEvidenceFile>;

describe('Upload API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/upload', () => {
    const createFormData = (overrides: Record<string, string | File> = {}) => {
      const formData = new FormData();
      formData.append('file', new File(['test content'], 'test.pdf', { type: 'application/pdf' }));
      formData.append('cohortId', 'cohort-123');
      formData.append('learnerId', 'learner-456');

      Object.entries(overrides).forEach(([key, value]) => {
        formData.set(key, value);
      });

      return formData;
    };

    const createRequest = (formData: FormData) => {
      return new Request('http://localhost/api/upload', {
        method: 'POST',
        body: formData,
      });
    };

    describe('Authentication', () => {
      it('should return 401 when not authenticated', async () => {
        mockAuth.mockResolvedValue(null);

        const request = createRequest(createFormData());
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
      });

      it('should allow authenticated users to proceed', async () => {
        mockAuth.mockResolvedValue(createMockSession(mockUsers.admin));
        (prisma.learner.findFirst as jest.Mock).mockResolvedValue({ id: 'learner-456' });
        mockUpload.mockResolvedValue({ success: true, url: '/uploads/test.pdf', filename: 'test.pdf' });

        const request = createRequest(createFormData());
        const response = await POST(request);

        expect(response.status).toBe(200);
      });
    });

    describe('Validation', () => {
      beforeEach(() => {
        mockAuth.mockResolvedValue(createMockSession(mockUsers.admin));
      });

      it('should return 400 when file is missing', async () => {
        const formData = new FormData();
        formData.append('cohortId', 'cohort-123');
        formData.append('learnerId', 'learner-456');

        const request = createRequest(formData);
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Missing required fields');
      });

      it('should return 400 when cohortId is missing', async () => {
        const formData = new FormData();
        formData.append('file', new File(['content'], 'test.pdf'));
        formData.append('learnerId', 'learner-456');

        const request = createRequest(formData);
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Missing required fields');
      });

      it('should return 400 when learnerId is missing', async () => {
        const formData = new FormData();
        formData.append('file', new File(['content'], 'test.pdf'));
        formData.append('cohortId', 'cohort-123');

        const request = createRequest(formData);
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Missing required fields');
      });
    });

    describe('Authorization', () => {
      it('should allow SUPER_ADMIN to upload for any cohort', async () => {
        mockAuth.mockResolvedValue(createMockSession(mockUsers.superAdmin));
        (prisma.learner.findFirst as jest.Mock).mockResolvedValue({ id: 'learner-456' });
        mockUpload.mockResolvedValue({ success: true, url: '/uploads/test.pdf', filename: 'test.pdf' });

        const request = createRequest(createFormData());
        const response = await POST(request);

        expect(response.status).toBe(200);
        expect(prisma.cohortInstructor.findUnique).not.toHaveBeenCalled();
      });

      it('should allow ADMIN to upload for any cohort', async () => {
        mockAuth.mockResolvedValue(createMockSession(mockUsers.admin));
        (prisma.learner.findFirst as jest.Mock).mockResolvedValue({ id: 'learner-456' });
        mockUpload.mockResolvedValue({ success: true, url: '/uploads/test.pdf', filename: 'test.pdf' });

        const request = createRequest(createFormData());
        const response = await POST(request);

        expect(response.status).toBe(200);
        expect(prisma.cohortInstructor.findUnique).not.toHaveBeenCalled();
      });

      it('should check instructor assignment for INSTRUCTOR role', async () => {
        mockAuth.mockResolvedValue(createMockSession(mockUsers.instructor));
        (prisma.cohortInstructor.findUnique as jest.Mock).mockResolvedValue({ userId: 'instructor-id', cohortId: 'cohort-123' });
        (prisma.learner.findFirst as jest.Mock).mockResolvedValue({ id: 'learner-456' });
        mockUpload.mockResolvedValue({ success: true, url: '/uploads/test.pdf', filename: 'test.pdf' });

        const request = createRequest(createFormData());
        const response = await POST(request);

        expect(response.status).toBe(200);
        expect(prisma.cohortInstructor.findUnique).toHaveBeenCalledWith({
          where: { cohortId_userId: { cohortId: 'cohort-123', userId: 'instructor-id' } }
        });
      });

      it('should return 403 for unassigned instructor', async () => {
        mockAuth.mockResolvedValue(createMockSession(mockUsers.instructor));
        (prisma.cohortInstructor.findUnique as jest.Mock).mockResolvedValue(null);

        const request = createRequest(createFormData());
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('Not authorized for this cohort');
      });
    });

    describe('Learner verification', () => {
      beforeEach(() => {
        mockAuth.mockResolvedValue(createMockSession(mockUsers.admin));
      });

      it('should return 404 when learner not found in cohort', async () => {
        (prisma.learner.findFirst as jest.Mock).mockResolvedValue(null);

        const request = createRequest(createFormData());
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Learner not found in cohort');
      });

      it('should verify learner exists in specified cohort', async () => {
        (prisma.learner.findFirst as jest.Mock).mockResolvedValue({ id: 'learner-456' });
        mockUpload.mockResolvedValue({ success: true, url: '/uploads/test.pdf', filename: 'test.pdf' });

        const request = createRequest(createFormData());
        await POST(request);

        expect(prisma.learner.findFirst).toHaveBeenCalledWith({
          where: { id: 'learner-456', cohortId: 'cohort-123' }
        });
      });
    });

    describe('File upload', () => {
      beforeEach(() => {
        mockAuth.mockResolvedValue(createMockSession(mockUsers.admin));
        (prisma.learner.findFirst as jest.Mock).mockResolvedValue({ id: 'learner-456' });
      });

      it('should return 400 when upload fails', async () => {
        mockUpload.mockResolvedValue({ success: false, error: 'File too large' });

        const request = createRequest(createFormData());
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('File too large');
      });

      it('should return upload URL and filename on success', async () => {
        mockUpload.mockResolvedValue({
          success: true,
          url: '/uploads/cohort-123/learner-456/test.pdf',
          filename: 'test.pdf'
        });

        const request = createRequest(createFormData());
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.url).toBe('/uploads/cohort-123/learner-456/test.pdf');
        expect(data.filename).toBe('test.pdf');
      });

      it('should update assessment when criterionCode provided', async () => {
        mockUpload.mockResolvedValue({
          success: true,
          url: '/uploads/test.pdf',
          filename: 'test.pdf'
        });

        const formData = createFormData();
        formData.append('criterionCode', 'CRIT-001');
        const request = createRequest(formData);
        await POST(request);

        expect(prisma.assessmentSignoff.updateMany).toHaveBeenCalledWith({
          where: { learnerId: 'learner-456', criterionCode: 'CRIT-001' },
          data: { evidenceFiles: { push: '/uploads/test.pdf' } }
        });
      });

      it('should create audit log on successful upload', async () => {
        mockUpload.mockResolvedValue({
          success: true,
          url: '/uploads/test.pdf',
          filename: 'test.pdf'
        });

        const request = createRequest(createFormData());
        await POST(request);

        expect(prisma.auditLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            userId: 'admin-id',
            action: 'EVIDENCE_UPLOADED',
            entity: 'ASSESSMENT'
          })
        });
      });
    });
  });

  describe('DELETE /api/upload', () => {
    const createDeleteRequest = (body: Record<string, unknown>) => {
      return new Request('http://localhost/api/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    };

    describe('Authentication', () => {
      it('should return 401 when not authenticated', async () => {
        mockAuth.mockResolvedValue(null);

        const request = createDeleteRequest({ url: '/uploads/test.pdf' });
        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
      });
    });

    describe('Validation', () => {
      beforeEach(() => {
        mockAuth.mockResolvedValue(createMockSession(mockUsers.admin));
      });

      it('should return 400 when url is missing', async () => {
        const request = createDeleteRequest({});
        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Missing url');
      });
    });

    describe('Authorization', () => {
      it('should allow SUPER_ADMIN to delete any file', async () => {
        mockAuth.mockResolvedValue(createMockSession(mockUsers.superAdmin));
        mockDelete.mockResolvedValue(true);

        const request = createDeleteRequest({
          url: '/uploads/test.pdf',
          cohortId: 'cohort-123'
        });
        const response = await DELETE(request);

        expect(response.status).toBe(200);
        expect(prisma.cohortInstructor.findUnique).not.toHaveBeenCalled();
      });

      it('should check instructor assignment for INSTRUCTOR role', async () => {
        mockAuth.mockResolvedValue(createMockSession(mockUsers.instructor));
        (prisma.cohortInstructor.findUnique as jest.Mock).mockResolvedValue({ userId: 'instructor-id' });
        mockDelete.mockResolvedValue(true);

        const request = createDeleteRequest({
          url: '/uploads/test.pdf',
          cohortId: 'cohort-123'
        });
        const response = await DELETE(request);

        expect(response.status).toBe(200);
        expect(prisma.cohortInstructor.findUnique).toHaveBeenCalled();
      });

      it('should return 403 for unassigned instructor', async () => {
        mockAuth.mockResolvedValue(createMockSession(mockUsers.instructor));
        (prisma.cohortInstructor.findUnique as jest.Mock).mockResolvedValue(null);

        const request = createDeleteRequest({
          url: '/uploads/test.pdf',
          cohortId: 'cohort-123'
        });
        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('Not authorized');
      });
    });

    describe('File deletion', () => {
      beforeEach(() => {
        mockAuth.mockResolvedValue(createMockSession(mockUsers.admin));
      });

      it('should return 404 when file not found', async () => {
        mockDelete.mockResolvedValue(false);

        const request = createDeleteRequest({ url: '/uploads/nonexistent.pdf' });
        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('File not found');
      });

      it('should return success when file deleted', async () => {
        mockDelete.mockResolvedValue(true);

        const request = createDeleteRequest({ url: '/uploads/test.pdf' });
        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      });

      it('should remove URL from assessment evidenceFiles when criterionCode provided', async () => {
        mockDelete.mockResolvedValue(true);
        (prisma.assessmentSignoff.findFirst as jest.Mock).mockResolvedValue({
          id: 'assessment-123',
          evidenceFiles: ['/uploads/test.pdf', '/uploads/other.pdf']
        });

        const request = createDeleteRequest({
          url: '/uploads/test.pdf',
          learnerId: 'learner-456',
          criterionCode: 'CRIT-001'
        });
        await DELETE(request);

        expect(prisma.assessmentSignoff.update).toHaveBeenCalledWith({
          where: { id: 'assessment-123' },
          data: { evidenceFiles: ['/uploads/other.pdf'] }
        });
      });

      it('should create audit log on successful deletion', async () => {
        mockDelete.mockResolvedValue(true);

        const request = createDeleteRequest({
          url: '/uploads/test.pdf',
          cohortId: 'cohort-123'
        });
        await DELETE(request);

        expect(prisma.auditLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            userId: 'admin-id',
            action: 'EVIDENCE_DELETED',
            entity: 'ASSESSMENT'
          })
        });
      });
    });

    describe('Error handling', () => {
      it('should return 500 on unexpected errors', async () => {
        mockAuth.mockResolvedValue(createMockSession(mockUsers.admin));
        mockDelete.mockRejectedValue(new Error('Disk error'));

        const request = createDeleteRequest({ url: '/uploads/test.pdf' });
        const response = await DELETE(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Failed to delete file');
      });
    });
  });
});
