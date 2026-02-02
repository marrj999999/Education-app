/**
 * Curriculum Sync - Syncs Notion content to database
 *
 * This module handles the synchronization of courses, modules, lessons,
 * and blocks from Notion to the local database.
 */

import { prisma } from '@/lib/db';
import { getPage, getPageBlocks, getCourseStructure } from '@/lib/notion';
import { COURSES } from '@/lib/courses';
import { transformBlocks, calculateTotalDuration, extractOcnCriteria, TransformedBlock } from './block-transformer';
import type { Module, Lesson } from '@/lib/types';
import { BlockType } from '@prisma/client';

export interface SyncOptions {
  courseSlug?: string; // Sync single course, or all if omitted
  forceFullSync?: boolean; // Ignore last sync timestamp
  dryRun?: boolean; // Preview changes without applying
}

export interface SyncResult {
  success: boolean;
  coursesProcessed: number;
  modulesProcessed: number;
  lessonsProcessed: number;
  blocksProcessed: number;
  errors: SyncError[];
  duration: number;
  changes: {
    created: { courses: number; modules: number; lessons: number; blocks: number };
    updated: { courses: number; modules: number; lessons: number; blocks: number };
    deleted: { courses: number; modules: number; lessons: number; blocks: number };
  };
}

export interface SyncError {
  level: 'course' | 'module' | 'lesson' | 'block';
  notionId: string;
  message: string;
  recoverable: boolean;
}

// Simple in-memory lock to prevent concurrent syncs
let syncLock = false;
let lastSyncTime: Date | null = null;

/**
 * Acquire sync lock
 */
async function acquireSyncLock(): Promise<boolean> {
  if (syncLock) {
    return false;
  }
  syncLock = true;
  return true;
}

/**
 * Release sync lock
 */
function releaseSyncLock(): void {
  syncLock = false;
  lastSyncTime = new Date();
}

/**
 * Check if sync is currently running
 */
export function isSyncRunning(): boolean {
  return syncLock;
}

/**
 * Get last sync time
 */
export function getLastSyncTime(): Date | null {
  return lastSyncTime;
}

/**
 * Main sync function - syncs curriculum from Notion to database
 */
export async function syncCurriculum(options: SyncOptions = {}): Promise<SyncResult> {
  const startTime = Date.now();
  const result: SyncResult = {
    success: false,
    coursesProcessed: 0,
    modulesProcessed: 0,
    lessonsProcessed: 0,
    blocksProcessed: 0,
    errors: [],
    duration: 0,
    changes: {
      created: { courses: 0, modules: 0, lessons: 0, blocks: 0 },
      updated: { courses: 0, modules: 0, lessons: 0, blocks: 0 },
      deleted: { courses: 0, modules: 0, lessons: 0, blocks: 0 }
    }
  };

  // Acquire lock
  const lockAcquired = await acquireSyncLock();
  if (!lockAcquired) {
    result.errors.push({
      level: 'course',
      notionId: 'system',
      message: 'Sync already in progress',
      recoverable: true
    });
    result.duration = Date.now() - startTime;
    return result;
  }

  try {
    // Get courses to sync
    const coursesToSync = options.courseSlug
      ? COURSES.filter(c => c.slug === options.courseSlug && c.enabled)
      : COURSES.filter(c => c.enabled);

    if (coursesToSync.length === 0) {
      result.errors.push({
        level: 'course',
        notionId: 'system',
        message: options.courseSlug
          ? `Course "${options.courseSlug}" not found or not enabled`
          : 'No enabled courses found',
        recoverable: false
      });
      result.duration = Date.now() - startTime;
      return result;
    }

    // Sync each course
    for (const courseConfig of coursesToSync) {
      try {
        await syncCourse(courseConfig, options, result);
        result.coursesProcessed++;
      } catch (error) {
        result.errors.push({
          level: 'course',
          notionId: courseConfig.notionNavId,
          message: error instanceof Error ? error.message : 'Unknown error',
          recoverable: false
        });
      }
    }

    result.success = result.errors.filter(e => !e.recoverable).length === 0;
  } catch (error) {
    result.success = false;
    result.errors.push({
      level: 'course',
      notionId: 'system',
      message: error instanceof Error ? error.message : 'Unknown error',
      recoverable: false
    });
  } finally {
    releaseSyncLock();
    result.duration = Date.now() - startTime;
  }

  return result;
}

/**
 * Sync a single course
 */
async function syncCourse(
  courseConfig: typeof COURSES[0],
  options: SyncOptions,
  result: SyncResult
): Promise<void> {
  console.log(`[Sync] Starting sync for course: ${courseConfig.slug}`);

  // Fetch course page from Notion
  const coursePage = await getPage(courseConfig.notionNavId);
  if (!coursePage) {
    throw new Error(`Could not fetch course page from Notion: ${courseConfig.notionNavId}`);
  }

  // Upsert course in database
  const existingCourse = await prisma.curriculumCourse.findUnique({
    where: { notionPageId: courseConfig.notionNavId }
  });

  if (options.dryRun) {
    console.log(`[Sync][DryRun] Would ${existingCourse ? 'update' : 'create'} course: ${courseConfig.slug}`);
  } else {
    const courseData = {
      slug: courseConfig.slug,
      title: coursePage.title || courseConfig.title,
      description: courseConfig.description,
      durationWeeks: parseInt(courseConfig.duration) || 6,
      level: courseConfig.level,
      accreditation: courseConfig.accreditation,
      syncedAt: new Date()
    };

    const course = await prisma.curriculumCourse.upsert({
      where: { notionPageId: courseConfig.notionNavId },
      update: courseData,
      create: {
        ...courseData,
        notionPageId: courseConfig.notionNavId
      }
    });

    if (existingCourse) {
      result.changes.updated.courses++;
    } else {
      result.changes.created.courses++;
    }

    // Get course structure (modules and lessons) from Notion
    const structure = await getCourseStructure(courseConfig);
    if (!structure?.modules) {
      console.log(`[Sync] No modules found for course: ${courseConfig.slug}`);
      return;
    }

    // Sync modules
    for (let moduleIndex = 0; moduleIndex < structure.modules.length; moduleIndex++) {
      const moduleData = structure.modules[moduleIndex];
      try {
        await syncModule(course.id, moduleData, moduleIndex, options, result);
        result.modulesProcessed++;
      } catch (error) {
        result.errors.push({
          level: 'module',
          notionId: moduleData.id,
          message: error instanceof Error ? error.message : 'Unknown error',
          recoverable: true
        });
      }
    }

    // Clean up orphaned modules (modules that no longer exist in Notion)
    if (!options.dryRun) {
      const moduleNotionIds = structure.modules.map(m => m.id);
      const deletedModules = await prisma.curriculumModule.deleteMany({
        where: {
          courseId: course.id,
          notionPageId: { notIn: moduleNotionIds }
        }
      });
      result.changes.deleted.modules += deletedModules.count;
    }
  }
}

/**
 * Sync a single module
 */
async function syncModule(
  courseId: string,
  moduleData: Module,
  sortOrder: number,
  options: SyncOptions,
  result: SyncResult
): Promise<void> {
  console.log(`[Sync] Syncing module: ${moduleData.title}`);

  // Extract week number from title if present (e.g., "Week 1: Introduction" -> 1)
  const weekMatch = moduleData.title.match(/week\s*(\d+)/i);
  const weekNumber = weekMatch ? parseInt(weekMatch[1]) : sortOrder + 1;

  const existingModule = await prisma.curriculumModule.findUnique({
    where: { notionPageId: moduleData.id }
  });

  if (options.dryRun) {
    console.log(`[Sync][DryRun] Would ${existingModule ? 'update' : 'create'} module: ${moduleData.title}`);
  } else {
    const moduleDbData = {
      title: moduleData.title,
      description: moduleData.description,
      sortOrder,
      weekNumber,
      syncedAt: new Date()
    };

    const curriculumModule = await prisma.curriculumModule.upsert({
      where: { notionPageId: moduleData.id },
      update: moduleDbData,
      create: {
        ...moduleDbData,
        notionPageId: moduleData.id,
        courseId
      }
    });

    if (existingModule) {
      result.changes.updated.modules++;
    } else {
      result.changes.created.modules++;
    }

    // Sync lessons
    if (moduleData.lessons) {
      for (let lessonIndex = 0; lessonIndex < moduleData.lessons.length; lessonIndex++) {
        const lessonData = moduleData.lessons[lessonIndex];
        try {
          await syncLesson(curriculumModule.id, lessonData, lessonIndex, options, result);
          result.lessonsProcessed++;
        } catch (error) {
          result.errors.push({
            level: 'lesson',
            notionId: lessonData.id,
            message: error instanceof Error ? error.message : 'Unknown error',
            recoverable: true
          });
        }
      }

      // Clean up orphaned lessons
      if (!options.dryRun) {
        const lessonNotionIds = moduleData.lessons.map(l => l.id);
        const deletedLessons = await prisma.curriculumLesson.deleteMany({
          where: {
            moduleId: curriculumModule.id,
            notionPageId: { notIn: lessonNotionIds }
          }
        });
        result.changes.deleted.lessons += deletedLessons.count;
      }
    }
  }
}

/**
 * Sync a single lesson with its blocks
 */
async function syncLesson(
  moduleId: string,
  lessonData: Lesson,
  sortOrder: number,
  options: SyncOptions,
  result: SyncResult
): Promise<void> {
  console.log(`[Sync] Syncing lesson: ${lessonData.title}`);

  // Fetch lesson blocks from Notion
  const blocks = await getPageBlocks(lessonData.id);

  // Transform blocks
  const transformedBlocks = transformBlocks(blocks);

  // Calculate duration and extract OCN criteria
  const totalDuration = calculateTotalDuration(transformedBlocks);
  const ocnCriteria = extractOcnCriteria(transformedBlocks);

  const existingLesson = await prisma.curriculumLesson.findUnique({
    where: { notionPageId: lessonData.id }
  });

  if (options.dryRun) {
    console.log(`[Sync][DryRun] Would ${existingLesson ? 'update' : 'create'} lesson: ${lessonData.title}`);
    console.log(`[Sync][DryRun]   - ${transformedBlocks.length} blocks`);
    console.log(`[Sync][DryRun]   - ${totalDuration} minutes duration`);
    console.log(`[Sync][DryRun]   - ${ocnCriteria.length} OCN criteria`);
  } else {
    const lessonDbData = {
      title: lessonData.title,
      description: null,
      sortOrder,
      durationMins: totalDuration || null,
      ocnCriteria,
      syncedAt: new Date()
    };

    const lesson = await prisma.curriculumLesson.upsert({
      where: { notionPageId: lessonData.id },
      update: lessonDbData,
      create: {
        ...lessonDbData,
        notionPageId: lessonData.id,
        moduleId
      }
    });

    if (existingLesson) {
      result.changes.updated.lessons++;
    } else {
      result.changes.created.lessons++;
    }

    // Sync blocks
    await syncBlocks(lesson.id, transformedBlocks, options, result);
  }
}

/**
 * Sync blocks for a lesson
 */
async function syncBlocks(
  lessonId: string,
  blocks: TransformedBlock[],
  options: SyncOptions,
  result: SyncResult
): Promise<void> {
  if (options.dryRun) {
    console.log(`[Sync][DryRun] Would sync ${blocks.length} blocks`);
    return;
  }

  // Get existing blocks
  const existingBlocks = await prisma.curriculumBlock.findMany({
    where: { lessonId },
    select: { id: true, notionBlockId: true }
  });

  const existingBlockMap = new Map(existingBlocks.map(b => [b.notionBlockId, b.id]));
  const newBlockIds = new Set(blocks.map(b => b.notionBlockId));

  // Upsert blocks
  for (const block of blocks) {
    const existingId = existingBlockMap.get(block.notionBlockId);

    const blockData = {
      sortOrder: block.sortOrder,
      blockType: block.blockType,
      content: block.content as object,
      durationMins: block.durationMins ?? null,
      isRequired: block.isRequired,
      syncedAt: new Date()
    };

    if (existingId) {
      await prisma.curriculumBlock.update({
        where: { id: existingId },
        data: blockData
      });
      result.changes.updated.blocks++;
    } else {
      await prisma.curriculumBlock.create({
        data: {
          ...blockData,
          notionBlockId: block.notionBlockId,
          lessonId
        }
      });
      result.changes.created.blocks++;
    }
    result.blocksProcessed++;
  }

  // Delete orphaned blocks
  const blocksToDelete = existingBlocks.filter(b => !newBlockIds.has(b.notionBlockId));
  if (blocksToDelete.length > 0) {
    await prisma.curriculumBlock.deleteMany({
      where: { id: { in: blocksToDelete.map(b => b.id) } }
    });
    result.changes.deleted.blocks += blocksToDelete.length;
  }
}

/**
 * Get sync status
 */
export function getSyncStatus(): {
  isRunning: boolean;
  lastSyncTime: Date | null;
} {
  return {
    isRunning: syncLock,
    lastSyncTime
  };
}
