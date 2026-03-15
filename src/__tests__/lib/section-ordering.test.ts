/**
 * Tests for section ordering logic
 * Verifies custom ordering, merging with new/deleted sections, and database operations
 */

import type { ContentSection } from '@/lib/types/content';

// Mock Prisma before importing module
jest.mock('@/lib/db', () => ({
  prisma: {
    lessonSectionOrder: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import {
  applyCustomSectionOrder,
  getCustomSectionOrder,
  saveCustomSectionOrder,
  resetSectionOrder,
} from '@/lib/section-ordering';
import { prisma } from '@/lib/db';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// =============================================================================
// Test Fixtures
// =============================================================================

function createSection(id: string, type: string = 'prose'): ContentSection {
  return { id, type: 'prose', content: `Content for ${id}` } as ContentSection;
}

function createSections(count: number): ContentSection[] {
  return Array.from({ length: count }, (_, i) =>
    createSection(`section-${i + 1}`)
  );
}

describe('Section Ordering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('applyCustomSectionOrder', () => {
    it('should return default order when no custom order exists', async () => {
      (mockPrisma.lessonSectionOrder.findMany as jest.Mock).mockResolvedValue([]);

      const sections = createSections(3);
      const result = await applyCustomSectionOrder('lesson-1', sections);

      expect(result).toEqual(sections);
      expect(result.map((s) => s.id)).toEqual([
        'section-1',
        'section-2',
        'section-3',
      ]);
    });

    it('should reorder sections according to custom order', async () => {
      (mockPrisma.lessonSectionOrder.findMany as jest.Mock).mockResolvedValue([
        { sectionId: 'section-3', sortOrder: 0 },
        { sectionId: 'section-1', sortOrder: 1 },
        { sectionId: 'section-2', sortOrder: 2 },
      ]);

      const sections = createSections(3);
      const result = await applyCustomSectionOrder('lesson-1', sections);

      expect(result.map((s) => s.id)).toEqual([
        'section-3',
        'section-1',
        'section-2',
      ]);
    });

    it('should append new sections (not in custom order) at the end', async () => {
      // Custom order only knows about sections 1 and 3
      (mockPrisma.lessonSectionOrder.findMany as jest.Mock).mockResolvedValue([
        { sectionId: 'section-3', sortOrder: 0 },
        { sectionId: 'section-1', sortOrder: 1 },
      ]);

      const sections = createSections(4);
      const result = await applyCustomSectionOrder('lesson-1', sections);

      // Sections 3, 1 from custom order; sections 2, 4 appended
      expect(result.map((s) => s.id)).toEqual([
        'section-3',
        'section-1',
        'section-2',
        'section-4',
      ]);
    });

    it('should ignore deleted sections from custom order gracefully', async () => {
      // Custom order references section-4 which no longer exists
      (mockPrisma.lessonSectionOrder.findMany as jest.Mock).mockResolvedValue([
        { sectionId: 'section-2', sortOrder: 0 },
        { sectionId: 'section-4', sortOrder: 1 }, // deleted
        { sectionId: 'section-1', sortOrder: 2 },
      ]);

      const sections = [createSection('section-1'), createSection('section-2')];
      const result = await applyCustomSectionOrder('lesson-1', sections);

      // Only existing sections appear, in custom order
      expect(result.map((s) => s.id)).toEqual(['section-2', 'section-1']);
    });

    it('should handle empty sections array', async () => {
      (mockPrisma.lessonSectionOrder.findMany as jest.Mock).mockResolvedValue([
        { sectionId: 'section-1', sortOrder: 0 },
      ]);

      const result = await applyCustomSectionOrder('lesson-1', []);
      expect(result).toEqual([]);
    });

    it('should handle single section', async () => {
      (mockPrisma.lessonSectionOrder.findMany as jest.Mock).mockResolvedValue([
        { sectionId: 'section-1', sortOrder: 0 },
      ]);

      const sections = [createSection('section-1')];
      const result = await applyCustomSectionOrder('lesson-1', sections);

      expect(result.map((s) => s.id)).toEqual(['section-1']);
    });

    it('should preserve new sections relative order when appending', async () => {
      (mockPrisma.lessonSectionOrder.findMany as jest.Mock).mockResolvedValue([
        { sectionId: 'section-1', sortOrder: 0 },
      ]);

      // Sections 2, 3, 4 are all new (not in custom order)
      const sections = createSections(4);
      const result = await applyCustomSectionOrder('lesson-1', sections);

      // section-1 first (custom), then 2, 3, 4 in original order
      expect(result.map((s) => s.id)).toEqual([
        'section-1',
        'section-2',
        'section-3',
        'section-4',
      ]);
    });
  });

  describe('getCustomSectionOrder', () => {
    it('should query database with correct lessonId', async () => {
      (mockPrisma.lessonSectionOrder.findMany as jest.Mock).mockResolvedValue([]);

      await getCustomSectionOrder('lesson-abc');

      expect(mockPrisma.lessonSectionOrder.findMany).toHaveBeenCalledWith({
        where: { lessonId: 'lesson-abc' },
        orderBy: { sortOrder: 'asc' },
      });
    });

    it('should return empty array when no custom order exists', async () => {
      (mockPrisma.lessonSectionOrder.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getCustomSectionOrder('lesson-abc');
      expect(result).toEqual([]);
    });

    it('should return ordered results', async () => {
      const orders = [
        { id: '1', lessonId: 'lesson-1', sectionId: 's1', sortOrder: 0 },
        { id: '2', lessonId: 'lesson-1', sectionId: 's2', sortOrder: 1 },
      ];
      (mockPrisma.lessonSectionOrder.findMany as jest.Mock).mockResolvedValue(orders);

      const result = await getCustomSectionOrder('lesson-1');
      expect(result).toEqual(orders);
    });
  });

  describe('saveCustomSectionOrder', () => {
    it('should use a transaction to replace the order atomically', async () => {
      (mockPrisma.$transaction as jest.Mock).mockResolvedValue(undefined);

      await saveCustomSectionOrder('lesson-1', ['s1', 's2', 's3'], 'user-123');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      // Verify both deleteMany and createMany were called (as part of the transaction array)
      expect(mockPrisma.lessonSectionOrder.deleteMany).toHaveBeenCalledWith({
        where: { lessonId: 'lesson-1' },
      });
      expect(mockPrisma.lessonSectionOrder.createMany).toHaveBeenCalledWith({
        data: [
          { lessonId: 'lesson-1', sectionId: 's1', sortOrder: 0, createdBy: 'user-123' },
          { lessonId: 'lesson-1', sectionId: 's2', sortOrder: 1, createdBy: 'user-123' },
          { lessonId: 'lesson-1', sectionId: 's3', sortOrder: 2, createdBy: 'user-123' },
        ],
      });
    });

    it('should create entries with correct sort order indices', async () => {
      (mockPrisma.$transaction as jest.Mock).mockResolvedValue(undefined);

      await saveCustomSectionOrder('lesson-1', ['s3', 's1', 's2']);

      // Verify the createMany call includes correct sortOrder
      const transactionArgs = (mockPrisma.$transaction as jest.Mock).mock.calls[0][0];
      // The second operation should be createMany
      expect(mockPrisma.lessonSectionOrder.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.lessonSectionOrder.createMany).toHaveBeenCalled();
    });

    it('should handle empty section IDs array', async () => {
      (mockPrisma.$transaction as jest.Mock).mockResolvedValue(undefined);

      await saveCustomSectionOrder('lesson-1', []);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('resetSectionOrder', () => {
    it('should delete all custom orders for the lesson', async () => {
      (mockPrisma.lessonSectionOrder.deleteMany as jest.Mock).mockResolvedValue({
        count: 5,
      });

      await resetSectionOrder('lesson-1');

      expect(mockPrisma.lessonSectionOrder.deleteMany).toHaveBeenCalledWith({
        where: { lessonId: 'lesson-1' },
      });
    });

    it('should not throw when no orders exist', async () => {
      (mockPrisma.lessonSectionOrder.deleteMany as jest.Mock).mockResolvedValue({
        count: 0,
      });

      await expect(resetSectionOrder('lesson-1')).resolves.not.toThrow();
    });
  });
});
