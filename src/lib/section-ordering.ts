/**
 * Section Ordering Helper
 *
 * Applies custom section ordering (stored in database) as an overlay
 * on top of the default Notion-parsed section order.
 *
 * This approach:
 * - Does NOT modify Notion data
 * - Stores custom orders in a separate table (lesson_section_orders)
 * - Gracefully handles new sections from Notion (appended at end)
 * - Gracefully ignores deleted sections (removed from order)
 */

import { prisma } from '@/lib/db';
import type { ContentSection } from '@/lib/types/content';

/**
 * Apply custom section ordering to parsed sections if a custom order exists.
 *
 * @param lessonId - The Notion page ID of the lesson
 * @param sections - The parsed sections in default order
 * @returns Sections reordered according to custom order, or default order if none exists
 */
export async function applyCustomSectionOrder(
  lessonId: string,
  sections: ContentSection[]
): Promise<ContentSection[]> {
  // Fetch custom order from database
  const customOrders = await prisma.lessonSectionOrder.findMany({
    where: { lessonId },
    orderBy: { sortOrder: 'asc' },
  });

  // If no custom order exists, return default order
  if (customOrders.length === 0) {
    return sections;
  }

  // Create a map of sectionId -> desired order
  const orderMap = new Map(
    customOrders.map((order) => [order.sectionId, order.sortOrder])
  );

  // Create a map of section ID -> section for quick lookup
  const sectionMap = new Map(sections.map((section) => [section.id, section]));

  // Separate sections into:
  // 1. Sections with custom order
  // 2. New sections (not in custom order, from recent Notion updates)
  const orderedSections: ContentSection[] = [];
  const newSections: ContentSection[] = [];

  for (const section of sections) {
    if (orderMap.has(section.id)) {
      orderedSections.push(section);
    } else {
      newSections.push(section);
    }
  }

  // Sort ordered sections by their custom order
  orderedSections.sort((a, b) => {
    const orderA = orderMap.get(a.id) ?? Infinity;
    const orderB = orderMap.get(b.id) ?? Infinity;
    return orderA - orderB;
  });

  // Return ordered sections followed by new sections
  // (New sections appear at the end, preserving their relative order)
  return [...orderedSections, ...newSections];
}

/**
 * Get the custom section order for a lesson (if any)
 */
export async function getCustomSectionOrder(lessonId: string) {
  return prisma.lessonSectionOrder.findMany({
    where: { lessonId },
    orderBy: { sortOrder: 'asc' },
  });
}

/**
 * Save a new custom section order for a lesson.
 * This replaces any existing custom order.
 *
 * @param lessonId - The Notion page ID of the lesson
 * @param sectionIds - Array of section IDs in the desired order
 * @param createdBy - Optional user ID who created this order
 */
export async function saveCustomSectionOrder(
  lessonId: string,
  sectionIds: string[],
  createdBy?: string
): Promise<void> {
  // Use a transaction to atomically replace the order
  await prisma.$transaction([
    // Delete existing custom order
    prisma.lessonSectionOrder.deleteMany({
      where: { lessonId },
    }),
    // Insert new order
    prisma.lessonSectionOrder.createMany({
      data: sectionIds.map((sectionId, index) => ({
        lessonId,
        sectionId,
        sortOrder: index,
        createdBy,
      })),
    }),
  ]);
}

/**
 * Reset section order to default (Notion order) by deleting custom order
 */
export async function resetSectionOrder(lessonId: string): Promise<void> {
  await prisma.lessonSectionOrder.deleteMany({
    where: { lessonId },
  });
}
