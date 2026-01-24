'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { AssessmentMatrix, Assessment, Learner, Criterion } from '@/components/cohorts/AssessmentMatrix';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface CohortData {
  id: string;
  name: string;
  code: string;
  course: {
    modules: {
      id: string;
      title: string;
      lessons: {
        id: string;
        title: string;
        ocnCriteria: string[];
      }[];
    }[];
  };
  learners: {
    id: string;
    firstName: string;
    lastName: string;
  }[];
}

const statusConfig = {
  NOT_STARTED: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Not Started' },
  IN_PROGRESS: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'In Progress' },
  SUBMITTED: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Submitted' },
  SIGNED_OFF: { bg: 'bg-green-100', text: 'text-green-700', label: 'Signed Off' },
  REQUIRES_REVISION: { bg: 'bg-red-100', text: 'text-red-700', label: 'Needs Revision' },
  VERIFIED: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Verified' },
};

export default function AssessmentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [cohort, setCohort] = useState<CohortData | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<{
    learnerId: string;
    criterion: Criterion;
    assessment: Assessment | null;
  } | null>(null);
  const [modalStatus, setModalStatus] = useState<Assessment['status']>('NOT_STARTED');
  const [modalNotes, setModalNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [cohortRes, assessmentsRes] = await Promise.all([
        fetch(`/api/cohorts/${id}`),
        fetch(`/api/cohorts/${id}/assessments`),
      ]);

      if (!cohortRes.ok) throw new Error('Failed to load cohort');
      if (!assessmentsRes.ok) throw new Error('Failed to load assessments');

      const cohortData = await cohortRes.json();
      const assessmentsData = await assessmentsRes.json();

      setCohort(cohortData);
      setAssessments(assessmentsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Extract criteria from course structure
  const criteria: Criterion[] = [];
  if (cohort) {
    cohort.course.modules.forEach((module) => {
      module.lessons.forEach((lesson) => {
        lesson.ocnCriteria.forEach((code) => {
          if (!criteria.find((c) => c.code === code)) {
            criteria.push({
              code,
              text: code, // In a real app, you'd have the full text from somewhere
              lessonId: lesson.id,
              lessonTitle: lesson.title,
            });
          }
        });
      });
    });
  }

  const handleCellClick = (learnerId: string, criterion: Criterion, assessment: Assessment | null) => {
    setSelectedCell({ learnerId, criterion, assessment });
    setModalStatus(assessment?.status || 'NOT_STARTED');
    setModalNotes(assessment?.evidenceNotes || '');
  };

  const handleSaveAssessment = async () => {
    if (!selectedCell || !cohort) return;

    setIsSaving(true);
    try {
      const learner = cohort.learners.find((l) => l.id === selectedCell.learnerId);

      const response = await fetch(`/api/cohorts/${id}/assessments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learnerId: selectedCell.learnerId,
          lessonId: selectedCell.criterion.lessonId,
          criterionCode: selectedCell.criterion.code,
          criterionText: selectedCell.criterion.text,
          status: modalStatus,
          evidenceNotes: modalNotes || undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to save assessment');

      const savedAssessment = await response.json();

      // Update local state
      setAssessments((prev) => {
        const existing = prev.findIndex(
          (a) => a.learnerId === selectedCell.learnerId && a.criterionCode === selectedCell.criterion.code
        );
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = savedAssessment;
          return updated;
        }
        return [...prev, savedAssessment];
      });

      setSelectedCell(null);
    } catch (err) {
      console.error('Failed to save assessment:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportCSV = () => {
    if (!cohort) return;

    const headers = ['Learner', 'Email', ...criteria.map((c) => c.code), 'Progress'];
    const rows = cohort.learners.map((learner) => {
      const learnerAssessments = assessments.filter((a) => a.learnerId === learner.id);
      const signedOff = learnerAssessments.filter((a) => ['SIGNED_OFF', 'VERIFIED'].includes(a.status)).length;
      const progress = criteria.length > 0 ? Math.round((signedOff / criteria.length) * 100) : 0;

      return [
        `${learner.firstName} ${learner.lastName}`,
        '', // Email not in our data, would need to fetch from learners API
        ...criteria.map((c) => {
          const a = learnerAssessments.find((assessment) => assessment.criterionCode === c.code);
          return a?.status || 'NOT_STARTED';
        }),
        `${progress}%`,
      ];
    });

    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cohort.code}-assessments.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-2 text-gray-500">Loading assessments...</p>
        </div>
      </div>
    );
  }

  if (error || !cohort) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-gray-500">{error || 'Failed to load'}</p>
          <Link
            href={`/cohorts/${id}`}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Back to Cohort
          </Link>
        </div>
      </div>
    );
  }

  const learners: Learner[] = cohort.learners.map((l) => ({
    id: l.id,
    firstName: l.firstName,
    lastName: l.lastName,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href={`/cohorts/${id}`} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="font-bold text-gray-900">Assessments</h1>
                <p className="text-xs text-gray-500">{cohort.name} ({cohort.code})</p>
              </div>
            </div>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/cohorts">Cohorts</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={`/cohorts/${id}`}>{cohort.name}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Assessments</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {criteria.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500">No OCN criteria defined for this course yet.</p>
            <p className="text-sm text-gray-400 mt-1">Criteria are extracted from lessons during Notion sync.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <AssessmentMatrix
              learners={learners}
              criteria={criteria}
              assessments={assessments}
              onCellClick={handleCellClick}
            />
          </div>
        )}
      </main>

      {/* Assessment Modal */}
      {selectedCell && cohort && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setSelectedCell(null)} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Update Assessment</h2>
                <button
                  onClick={() => setSelectedCell(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Learner & Criterion Info */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Learner:</span>{' '}
                    {cohort.learners.find((l) => l.id === selectedCell.learnerId)?.firstName}{' '}
                    {cohort.learners.find((l) => l.id === selectedCell.learnerId)?.lastName}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-medium">Criterion:</span> {selectedCell.criterion.code}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{selectedCell.criterion.lessonTitle}</p>
                </div>

                {/* Status Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(statusConfig) as [Assessment['status'], typeof statusConfig.NOT_STARTED][]).map(
                      ([status, config]) => (
                        <button
                          key={status}
                          onClick={() => setModalStatus(status)}
                          className={`px-3 py-2 text-xs rounded-lg border transition-all ${
                            modalStatus === status
                              ? `${config.bg} ${config.text} border-current font-medium`
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {config.label}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Evidence Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Evidence Notes</label>
                  <textarea
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                    placeholder="Add notes about the evidence..."
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setSelectedCell(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAssessment}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
