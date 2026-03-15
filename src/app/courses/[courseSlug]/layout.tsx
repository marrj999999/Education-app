import { notFound } from 'next/navigation';
import { getCourseBySlug } from '@/lib/courses';
import { getPayloadCourseStructure, getPayloadCourseNavigation } from '@/lib/payload/queries';
import CourseClientLayout from '@/components/CourseClientLayout';
import type { CourseStructure } from '@/lib/types/navigation';
import type { Module } from '@/lib/types';

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
  let modules: Module[] = [];
  let navigationStructure: CourseStructure | null = null;

  if (!course.isHandbook) {
    try {
      const courseData = await getPayloadCourseStructure(courseSlug);
      modules = courseData.modules;

      // Also fetch navigation structure for new navigation system
      try {
        navigationStructure = await getPayloadCourseNavigation(courseSlug);
      } catch (navError) {
        console.error('Failed to fetch navigation structure:', navError);
        // Continue without navigation structure - will use fallback
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
