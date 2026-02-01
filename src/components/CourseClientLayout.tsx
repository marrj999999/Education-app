'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import CourseSidebar from './CourseSidebar';
import TopNav from './TopNav';
import { useProgress } from '@/context/ProgressContext';
import { NavigationProvider } from '@/lib/context/NavigationContext';
import { Sidebar } from '@/components/navigation/Sidebar';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { QuickJump } from '@/components/navigation/QuickJump';
import { useNavigation } from '@/lib/context/NavigationContext';
import type { Module, Course } from '@/lib/types';
import type { CourseStructure } from '@/lib/types/navigation';

// Inner component that uses NavigationContext (must be inside NavigationProvider)
function CourseLayoutContent({
  course,
  children,
}: {
  course: Course;
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const { toggleSidebar, sidebarOpen } = useNavigation();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Fixed TopNav */}
      <TopNav
        onMenuToggle={toggleSidebar}
        showMenuButton={true}
        user={session?.user}
      />

      {/* Content area with new sidebar */}
      <div className="flex flex-1">
        <Sidebar course={course} />
        <main className="flex-1 lg:ml-0">
          {children}
        </main>
      </div>

      {/* QuickJump command palette */}
      <QuickJump />
    </div>
  );
}

interface CourseClientLayoutProps {
  children: React.ReactNode;
  modules: Module[];
  course: Course;
  navigationStructure?: CourseStructure | null;
}

export default function CourseClientLayout({
  children,
  modules,
  course,
  navigationStructure,
}: CourseClientLayoutProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { setTotalLessons } = useProgress();

  // Extract lessonId from pathname if on a lesson page
  const lessonIdMatch = pathname?.match(/\/lessons\/([^/]+)/);
  const currentLessonId = lessonIdMatch ? lessonIdMatch[1] : null;

  // Calculate total lessons and update context
  useEffect(() => {
    const total = modules.reduce((acc, module) => acc + module.lessons.length, 0);
    setTotalLessons(total);
  }, [modules, setTotalLessons]);

  // Determine if we should use the new navigation system
  const useNewNavigation = !!navigationStructure && navigationStructure.totalLessons > 0;

  // If new navigation is available, use NavigationProvider
  if (useNewNavigation) {
    return (
      <NavigationProvider
        courseSlug={course.slug}
        initialStructure={navigationStructure}
      >
        <CourseLayoutContent course={course}>
          {/* Breadcrumbs - show on lesson pages */}
          {currentLessonId && (
            <div className="border-b bg-white px-4 py-2">
              <Breadcrumbs />
            </div>
          )}
          {children}
        </CourseLayoutContent>
      </NavigationProvider>
    );
  }

  // Fallback to original layout (for backwards compatibility)
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Fixed TopNav - always visible */}
      <TopNav
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        showMenuButton={true}
        user={session?.user}
      />

      {/* Content area with sidebar */}
      <div className="flex flex-1">
        <CourseSidebar
          modules={modules}
          course={course}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="flex-1 lg:ml-0">
          {children}
        </main>
      </div>
    </div>
  );
}
