import { notFound } from 'next/navigation';
import { getCourseBySlug } from '@/lib/courses';
import { getCourseStructure, getFullCourseStructure } from '@/lib/notion';
import CourseClientLayout from '@/components/CourseClientLayout';

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

  if (!course.isHandbook) {
    try {
      if (course.notionNavId) {
        const courseData = await getCourseStructure(course);
        modules = courseData.modules;
      } else {
        const courseData = await getFullCourseStructure();
        modules = courseData.modules;
      }
    } catch (error) {
      console.error('Failed to fetch course structure for sidebar:', error);
    }
  }

  return (
    <CourseClientLayout modules={modules} course={course}>
      {children}
    </CourseClientLayout>
  );
}
