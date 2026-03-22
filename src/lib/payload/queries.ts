import config from '@payload-config';
import { getPayload } from 'payload';
import type { ContentSection } from '@/lib/types/content';
import type { CourseStructure, NavigationModule } from '@/lib/types/navigation';
import type { Module, Lesson, CourseNavigation } from '@/lib/types';

let cachedPayload: Awaited<ReturnType<typeof getPayload>> | null = null;

async function getPayloadClient() {
  if (!cachedPayload) {
    cachedPayload = await getPayload({ config });
  }
  return cachedPayload;
}

// =============================================================================
// Core queries
// =============================================================================

/**
 * Get a lesson from Payload CMS by its slug.
 */
export async function getPayloadLesson(slug: string) {
  try {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: 'lessons',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 1,
    });
    if (result.docs.length === 0) return null;
    return result.docs[0];
  } catch (error) {
    console.error('[Payload] getPayloadLesson failed for slug:', slug, error);
    return null;
  }
}

/**
 * Get a lesson from Payload CMS by its ID.
 */
export async function getPayloadLessonById(id: string) {
  try {
    const payload = await getPayloadClient();
    const result = await payload.findByID({
      collection: 'lessons',
      id,
      depth: 1,
    });
    return result;
  } catch (error) {
    console.error('[Payload] getPayloadLessonById failed for id:', id, error);
    return null;
  }
}

/**
 * Get all courses from Payload CMS with their modules and lessons.
 */
export async function getPayloadCourses() {
  try {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: 'courses',
      sort: 'order',
      depth: 2,
      limit: 100,
    });
    return result.docs;
  } catch (error) {
    console.error('[Payload] getPayloadCourses failed:', error);
    return [];
  }
}

/**
 * Get a course by slug from Payload CMS.
 */
export async function getPayloadCourseBySlug(slug: string) {
  try {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: 'courses',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 2,
    });
    if (result.docs.length === 0) return null;
    return result.docs[0];
  } catch (error) {
    console.error('[Payload] getPayloadCourseBySlug failed for slug:', slug, error);
    return null;
  }
}

/**
 * Get modules for a course from Payload CMS.
 */
export async function getPayloadModules(courseId: string) {
  try {
    const payload = await getPayloadClient();
    const course = await payload.findByID({
      collection: 'courses',
      id: courseId,
      depth: 2,
    });
    if (!course?.modules) return [];
    if (typeof course.modules[0] === 'object') {
      return course.modules;
    }
    const modules = await Promise.all(
      (course.modules as string[]).map(async (moduleId) => {
        return payload.findByID({ collection: 'modules', id: moduleId, depth: 1 });
      })
    );
    return modules;
  } catch (error) {
    console.error('[Payload] getPayloadModules failed for courseId:', courseId, error);
    return [];
  }
}

// =============================================================================
// Course structure queries
// =============================================================================

/**
 * Get the full course structure from Payload CMS.
 * Returns CourseNavigation for sidebar / layout code.
 */
export async function getPayloadCourseStructure(courseSlug: string): Promise<CourseNavigation> {
  try {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: 'courses',
      where: { slug: { equals: courseSlug } },
      limit: 1,
      depth: 3, // course → modules → lessons
    });

    if (result.docs.length === 0) {
      return { modules: [], resources: [], handbooks: [] };
    }

    const course = result.docs[0] as any;
    const modules: Module[] = [];

    if (course.modules && Array.isArray(course.modules)) {
      for (let mi = 0; mi < course.modules.length; mi++) {
        const mod = course.modules[mi];
        if (typeof mod === 'string') continue;

        const lessons: Lesson[] = [];
        if (mod.lessons && Array.isArray(mod.lessons)) {
          for (let li = 0; li < mod.lessons.length; li++) {
            const lesson = mod.lessons[li];
            if (typeof lesson === 'string') continue;
            lessons.push({
              id: lesson.id,
              title: lesson.title,
              moduleId: mod.id,
              icon: lesson.icon || undefined,
              order: lesson.order ?? li,
            });
          }
        }

        modules.push({
          id: mod.id,
          title: mod.title,
          icon: mod.icon || undefined,
          lessons: lessons.sort((a, b) => a.order - b.order),
          order: mod.order ?? mi,
        });
      }
    }

    return {
      modules: modules.sort((a, b) => a.order - b.order),
      resources: [],
      handbooks: [],
    };
  } catch (error) {
    console.error('Failed to get course structure from Payload:', error);
    return { modules: [], resources: [], handbooks: [] };
  }
}

/**
 * Get the course navigation structure from Payload CMS.
 * Returns a CourseStructure object for the navigation system.
 */
export async function getPayloadCourseNavigation(courseSlug: string): Promise<CourseStructure> {
  const courseNav = await getPayloadCourseStructure(courseSlug);
  const course = await getPayloadCourseBySlug(courseSlug);
  const courseTitle = (course as any)?.title || courseSlug;
  const courseId = (course as any)?.id || courseSlug;

  const navModules: NavigationModule[] = courseNav.modules.map(mod => ({
    id: mod.id,
    name: mod.title,
    icon: mod.icon,
    units: [],
    standaloneLessons: mod.lessons.map(lesson => ({
      id: lesson.id,
      title: lesson.title,
      module: mod.title,
      unit: null,
      order: lesson.order,
      status: 'ready' as const,
      url: `/courses/${courseSlug}/lessons/${lesson.id}`,
      icon: lesson.icon,
    })),
  }));

  let totalLessons = 0;
  for (const mod of navModules) {
    totalLessons += mod.standaloneLessons.length;
  }

  return {
    courseId: String(courseId),
    courseSlug,
    courseTitle: String(courseTitle),
    modules: navModules,
    standaloneLessons: [],
    totalLessons,
  };
}

// =============================================================================
// Lesson content queries
// =============================================================================

/**
 * Get lesson content sections from Payload CMS.
 * Returns ContentSection[] for lesson display.
 */
export async function getPayloadLessonSections(lessonId: string): Promise<ContentSection[]> {
  try {
    const payload = await getPayloadClient();
    const lesson = await payload.findByID({
      collection: 'lessons',
      id: lessonId,
      depth: 1,
    });
    if (!lesson) return [];

    const blocks = (lesson as any).sections;
    if (!blocks || !Array.isArray(blocks)) return [];

    const sections: ContentSection[] = [];
    for (const block of blocks) {
      const section = payloadBlockToContentSection(block);
      if (section) sections.push(section);
    }
    return sections;
  } catch (error) {
    console.error('[Payload] getPayloadLessonSections failed for lessonId:', lessonId, error);
    return [];
  }
}

/**
 * Get lesson page metadata + sections from Payload CMS.
 */
export async function getPayloadLessonContent(lessonId: string) {
  try {
    const payload = await getPayloadClient();
    const lesson = await payload.findByID({
      collection: 'lessons',
      id: lessonId,
      depth: 2,
    });
    if (!lesson) return null;

    const lessonData = lesson as any;
    const page = {
      id: lesson.id,
      title: lessonData.title,
      icon: lessonData.icon || undefined,
      cover: lessonData.coverImage?.url || undefined,
      url: '',
      created_time: lessonData.createdAt || new Date().toISOString(),
      last_edited_time: lessonData.updatedAt || new Date().toISOString(),
    };

    const layoutVersion = lessonData.layoutVersion || 'standard-v1';
    const ocnUnitRef = lessonData.ocnUnitRef || undefined;
    const ocnLevel = lessonData.ocnLevel || undefined;
    const guidedLearningHours = lessonData.guidedLearningHours || undefined;

    // Extract sections directly from the already-fetched lesson (avoids redundant DB query)
    const blocks = lessonData.sections;
    const sections: ContentSection[] = [];
    if (blocks && Array.isArray(blocks)) {
      for (const block of blocks) {
        const section = payloadBlockToContentSection(block);
        if (section) sections.push(section);
      }
    }

    return { page, sections, layoutVersion, ocnUnitRef, ocnLevel, guidedLearningHours };
  } catch (error) {
    console.error('[Payload] getPayloadLessonContent failed for lessonId:', lessonId, error);
    return null;
  }
}

/**
 * Get sibling lessons for navigation (prev/next links).
 */
export async function getPayloadSiblingLessons(
  lessonId: string
): Promise<Array<{ id: string; title: string }>> {
  try {
    const payload = await getPayloadClient();
    const lesson = await payload.findByID({
      collection: 'lessons',
      id: lessonId,
      depth: 1,
    });
    if (!lesson) return [];

    const moduleId =
      typeof (lesson as any).module === 'object'
        ? (lesson as any).module.id
        : (lesson as any).module;
    if (!moduleId) return [];

    const mod = await payload.findByID({
      collection: 'modules',
      id: moduleId,
      depth: 1,
    });
    if (!mod || !(mod as any).lessons) return [];

    const lessons = (mod as any).lessons;
    if (!Array.isArray(lessons)) return [];

    return lessons
      .filter((l: any) => typeof l === 'object' && l.id)
      .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
      .map((l: any) => ({ id: l.id, title: l.title }));
  } catch (error) {
    console.error('[Payload] getPayloadSiblingLessons failed for lessonId:', lessonId, error);
    return [];
  }
}

// =============================================================================
// Handbook queries
// =============================================================================

/**
 * Get all handbook sections from Payload CMS.
 */
export async function getPayloadHandbookSections() {
  try {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: 'handbooks',
      sort: 'order',
      limit: 200,
      depth: 1,
    });
    return result.docs;
  } catch (error) {
    console.error('[Payload] getPayloadHandbookSections failed:', error);
    return [];
  }
}

/**
 * Get a single handbook section by slug.
 */
export async function getPayloadHandbookBySlug(slug: string) {
  try {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: 'handbooks',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 1,
    });
    if (result.docs.length === 0) return null;
    return result.docs[0];
  } catch (error) {
    console.error('[Payload] getPayloadHandbookBySlug failed for slug:', slug, error);
    return null;
  }
}

// =============================================================================
// Payload block → ContentSection transformer
// =============================================================================

function payloadBlockToContentSection(block: any): ContentSection | null {
  if (!block || !block.blockType) return null;
  const id = block.id || `block-${Math.random().toString(36).slice(2, 10)}`;

  switch (block.blockType) {
    case 'heading':
      return {
        id,
        type: 'heading',
        level: parseInt(block.level || '2', 10) as 1 | 2 | 3,
        text: block.text || '',
      };

    case 'prose':
      return {
        id,
        type: 'prose',
        content: extractTextFromLexical(block.content),
      };

    case 'timeline':
      return {
        id,
        type: 'timeline',
        title: block.title || undefined,
        rows: (block.rows || []).map((row: any) => ({
          time: row.time || '',
          activity: row.activity || '',
          duration: row.duration || '',
          notes: row.notes || undefined,
        })),
      };

    case 'checklist':
      return {
        id,
        type: 'checklist',
        category: block.category || 'materials',
        title: block.title || '',
        items: (block.items || []).map((item: any) => ({
          text: item.text || '',
          quantity: item.quantity || undefined,
        })),
      };

    case 'safety':
      return {
        id,
        type: 'safety',
        level: block.level || 'warning',
        title: block.title || undefined,
        content: block.content || '',
        items:
          block.items?.length > 0
            ? block.items.map((i: any) => i.text)
            : undefined,
      };

    case 'teachingStep':
      return {
        id,
        type: 'teaching-step',
        stepNumber: block.stepNumber || 1,
        title: block.title || undefined,
        instruction: block.instruction || '',
        duration: block.duration || undefined,
        teachingApproach: block.teachingApproach || undefined,
        differentiation: block.differentiation || undefined,
        paragraphs:
          block.paragraphs?.length > 0
            ? block.paragraphs.map((p: any) => p.text)
            : undefined,
        tips:
          block.tips?.length > 0
            ? block.tips.map((t: any) => t.text)
            : undefined,
        warnings:
          block.warnings?.length > 0
            ? block.warnings.map((w: any) => w.text)
            : undefined,
        activities:
          block.activities?.length > 0
            ? block.activities.map((a: any) => ({
                text: a.text || '',
                duration: a.duration || undefined,
              }))
            : undefined,
        resources:
          block.resources?.length > 0
            ? block.resources.map((r: any) => ({
                type: r.type || 'file',
                url: r.url || '',
                title: r.title || undefined,
                caption: r.caption || undefined,
              }))
            : undefined,
        tables:
          block.tables?.length > 0
            ? block.tables.map((t: any) => ({
                headers: t.headers || [],
                rows: t.rows || [],
              }))
            : undefined,
        quotes:
          block.quotes?.length > 0
            ? block.quotes.map((q: any) => q.text)
            : undefined,
      };

    case 'checkpoint':
      return {
        id,
        type: 'checkpoint',
        title: block.title || '',
        items: (block.items || []).map((item: any) => ({
          criterion: item.criterion || '',
          description: item.description || undefined,
        })),
      };

    case 'outcomes':
      return {
        id,
        type: 'outcomes',
        title: block.title || 'Learning Outcomes',
        items: (block.items || []).map((item: any) => item.text || ''),
      };

    case 'vocabulary':
      return {
        id,
        type: 'vocabulary',
        terms: (block.terms || []).map((t: any) => ({
          term: t.term || '',
          definition: t.definition || '',
        })),
      };

    case 'resource':
      return {
        id,
        type: 'resource',
        resourceType: block.resourceType || 'file',
        url: block.url || '',
        title: block.title || undefined,
        caption: block.caption || undefined,
      };

    default:
      console.warn(`Unknown Payload block type: ${block.blockType}`);
      return null;
  }
}

/**
 * Extract plain text from a Payload Lexical richText field.
 */
function extractTextFromLexical(lexicalData: any): string {
  if (!lexicalData?.root?.children) return '';

  function extractChildren(children: any[]): string {
    return children
      .map((child: any) => {
        if (child.type === 'text') return child.text || '';
        if (child.children) return extractChildren(child.children);
        return '';
      })
      .join('');
  }

  return lexicalData.root.children
    .map((node: any) => {
      if (node.children) return extractChildren(node.children);
      return '';
    })
    .join('\n\n');
}
