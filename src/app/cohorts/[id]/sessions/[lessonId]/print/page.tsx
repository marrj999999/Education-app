'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { AttendanceRegister } from '@/components/print/AttendanceRegister';
import { MaterialsList } from '@/components/print/MaterialsList';
import { SessionOutline } from '@/components/print/SessionOutline';
import { AssessmentCriteria } from '@/components/print/AssessmentCriteria';

interface CohortData {
  id: string;
  name: string;
  code: string;
  learners: {
    id: string;
    firstName: string;
    lastName: string;
  }[];
  course: {
    modules: {
      title: string;
      weekNumber: number | null;
      lessons: {
        id: string;
        title: string;
        durationMins: number | null;
        ocnCriteria: string[];
      }[];
    }[];
  };
  sessions: {
    id: string;
    lessonId: string;
    scheduledDate: string;
  }[];
}

interface Block {
  id: string;
  blockType: string;
  content: {
    text?: string;
    title?: string;
    items?: { text: string; checked?: boolean }[];
    rows?: Record<string, string>[];
  };
  durationMins: number | null;
}

interface LessonData {
  id: string;
  title: string;
  durationMins: number | null;
  ocnCriteria: string[];
  module: {
    title: string;
    weekNumber: number | null;
  };
  blocks: Block[];
}

export default function PrintPage({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const { id, lessonId } = use(params);
  const [cohort, setCohort] = useState<CohortData | null>(null);
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const cohortRes = await fetch(`/api/cohorts/${id}`);
      if (!cohortRes.ok) throw new Error('Failed to load cohort');
      const cohortData = await cohortRes.json();
      setCohort(cohortData);

      // Find lesson in cohort data or fetch separately
      let foundLesson: LessonData | null = null;
      for (const courseModule of cohortData.course.modules) {
        const lessonMatch = courseModule.lessons.find((l: { id: string }) => l.id === lessonId);
        if (lessonMatch) {
          foundLesson = {
            ...lessonMatch,
            module: {
              title: courseModule.title,
              weekNumber: courseModule.weekNumber,
            },
            blocks: [], // We'll need to fetch blocks separately if needed
          };
          break;
        }
      }

      if (foundLesson) {
        setLesson(foundLesson);
      } else {
        throw new Error('Lesson not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [id, lessonId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-2 text-gray-500">Loading print pack...</p>
        </div>
      </div>
    );
  }

  if (error || !cohort || !lesson) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Failed to load'}</p>
          <Link
            href={`/cohorts/${id}/sessions/${lessonId}`}
            className="text-blue-600 hover:underline"
          >
            Back to Session
          </Link>
        </div>
      </div>
    );
  }

  // Find session date
  const session = cohort.sessions.find((s) => s.lessonId === lessonId);
  const sessionDate = session ? formatDate(session.scheduledDate) : 'Not scheduled';

  // Extract materials from blocks (mock data - in real app would parse from MATERIALS_TABLE blocks)
  const materials = [
    { name: 'Laptop/Computer', quantity: '1 per learner', notes: 'With internet access' },
    { name: 'Workbook', quantity: '1 per learner', notes: '' },
    { name: 'Whiteboard markers', quantity: '3', notes: 'Multiple colors' },
  ];

  // Extract sections (mock data - in real app would parse from SECTION_TIMER blocks)
  const sections = [
    { title: 'Introduction', durationMins: 10, type: 'SECTION_TIMER', content: 'Welcome and overview' },
    { title: 'Main Activity', durationMins: 30, type: 'ACTIVITY', content: 'Hands-on practice' },
    { title: 'Key Concepts', durationMins: 15, type: 'KEY_POINT', content: 'Review key takeaways' },
    { title: 'Q&A', durationMins: 10, type: 'SECTION_TIMER', content: 'Questions and discussion' },
    { title: 'Wrap Up', durationMins: 5, type: 'SECTION_TIMER', content: 'Summary and next steps' },
  ];

  // Extract criteria
  const criteria = lesson.ocnCriteria.map((code) => ({
    code,
    text: `Assessment criterion ${code}`, // In real app, would have full text
  }));

  return (
    <div className="min-h-screen bg-white">
      {/* Print Controls - Hidden when printing */}
      <div className="print:hidden bg-gray-100 border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href={`/cohorts/${id}/sessions/${lessonId}`}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Session
          </Link>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print All
          </button>
        </div>
      </div>

      {/* Print Content */}
      <div className="max-w-4xl mx-auto px-8 py-8 space-y-8 print:p-0 print:space-y-0">
        {/* Header - Shows on each printed page */}
        <div className="text-center print:text-left print:mb-4">
          <h1 className="text-2xl font-bold print:text-lg">{lesson.title}</h1>
          <p className="text-gray-600 print:text-sm">
            {cohort.name} ({cohort.code}) | {sessionDate}
          </p>
        </div>

        {/* Attendance Register */}
        <div className="print:break-after-page">
          <AttendanceRegister
            cohortName={cohort.name}
            cohortCode={cohort.code}
            lessonTitle={lesson.title}
            sessionDate={sessionDate}
            learners={cohort.learners}
          />
        </div>

        {/* Session Outline */}
        <div className="print:break-after-page">
          <SessionOutline
            lessonTitle={lesson.title}
            moduleTitle={lesson.module.title}
            totalDurationMins={lesson.durationMins}
            sections={sections}
          />
        </div>

        {/* Materials List */}
        {materials.length > 0 && (
          <div className="print:break-after-page">
            <MaterialsList lessonTitle={lesson.title} materials={materials} />
          </div>
        )}

        {/* Assessment Criteria */}
        {criteria.length > 0 && (
          <div>
            <AssessmentCriteria lessonTitle={lesson.title} criteria={criteria} />
          </div>
        )}
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            font-size: 12pt;
          }
          .print-section {
            page-break-inside: avoid;
          }
          @page {
            margin: 1.5cm;
          }
        }
      `}</style>
    </div>
  );
}
