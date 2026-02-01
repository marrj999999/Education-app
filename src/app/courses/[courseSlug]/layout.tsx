import { notFound } from 'next/navigation';
import { getCourseBySlug } from '@/lib/courses';
import { getCourseStructure, getFullCourseStructure } from '@/lib/notion';
import { fetchCourseNavigation } from '@/lib/notion/fetch-course-structure';
import CourseClientLayout from '@/components/CourseClientLayout';
import type { CourseStructure } from '@/lib/types/navigation';

interface CourseLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    courseSlug: string;
  }>;
}

export const revalidate = 60;

export default async function CourseLayout({ children, params }: CourseLayoutProps) {
  const { courseSlug } = await params;

  // Get course configuration
  const course = getCourseBySlug(courseSlug);

  if (!course || !course.enabled) {
    notFound();
  }

  // Fetch course modules for sidebar (skip for handbook courses - they use HandbookSidebar)
  let modules: Awaited<ReturnType<typeof getFullCourseStructure>>['modules'] = [];
  let navigationStructure: CourseStructure | null = null;

  if (!course.isHandbook) {
    try {
      if (course.notionNavId) {
        const courseData = await getCourseStructure(course);
        modules = courseData.modules;

        // Also fetch navigation structure for new navigation system
        try {
          navigationStructure = await fetchCourseNavigation(courseSlug);
        } catch (navError) {
          console.error('Failed to fetch navigation structure:', navError);
          // Continue without navigation structure - will use fallback
        }
      } else {
        const courseData = await getFullCourseStructure();
        modules = courseData.modules;
      }
    } catch (error) {
      console.error('Failed to fetch course structure for sidebar:', error);
    }
  }

  return (
    <CourseClientLayout
      modules={modules}
      course={course}
      navigationStructure={navigationStructure}
    >
      {children}
    </CourseClientLayout>
  );
}
