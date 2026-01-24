'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import CourseSidebar from './CourseSidebar';
import TopNav from './TopNav';
import { useProgress } from '@/context/ProgressContext';
import type { Module, Course } from '@/lib/types';

interface CourseClientLayoutProps {
  children: React.ReactNode;
  modules: Module[];
  course: Course;
}

export default function CourseClientLayout({ children, modules, course }: CourseClientLayoutProps) {
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { setTotalLessons } = useProgress();

  // Calculate total lessons and update context
  useEffect(() => {
    const total = modules.reduce((acc, module) => acc + module.lessons.length, 0);
    setTotalLessons(total);
  }, [modules, setTotalLessons]);

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
