'use client';

import { useState } from 'react';

export interface Assessment {
  id: string;
  learnerId: string;
  lessonId: string;
  criterionCode: string;
  criterionText: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'SIGNED_OFF' | 'REQUIRES_REVISION' | 'VERIFIED';
  evidenceNotes: string | null;
  signedOffAt: string | null;
  signedOffBy: string | null;
}

export interface Learner {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Criterion {
  code: string;
  text: string;
  lessonId: string;
  lessonTitle: string;
}

interface AssessmentMatrixProps {
  learners: Learner[];
  criteria: Criterion[];
  assessments: Assessment[];
  onCellClick: (learnerId: string, criterion: Criterion, currentAssessment: Assessment | null) => void;
}

const statusConfig: Record<Assessment['status'], { bg: string; text: string; label: string; icon: string }> = {
  NOT_STARTED: { bg: 'bg-surface-hover', text: 'text-text-tertiary', label: 'Not Started', icon: '○' },
  IN_PROGRESS: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'In Progress', icon: '◐' },
  SUBMITTED: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Submitted', icon: '◑' },
  SIGNED_OFF: { bg: 'bg-green-100', text: 'text-green-700', label: 'Signed Off', icon: '●' },
  REQUIRES_REVISION: { bg: 'bg-red-100', text: 'text-red-700', label: 'Revision', icon: '◌' },
  VERIFIED: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Verified', icon: '✓' },
};

export function AssessmentMatrix({ learners, criteria, assessments, onCellClick }: AssessmentMatrixProps) {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterLearner, setFilterLearner] = useState<string>('all');
  const [filterLesson, setFilterLesson] = useState<string>('all');

  // Get unique lessons for filter
  const uniqueLessons = Array.from(
    new Map(criteria.map((c) => [c.lessonId, { id: c.lessonId, title: c.lessonTitle }])).values()
  );

  // Filter criteria by lesson
  const filteredCriteria = criteria.filter((c) => filterLesson === 'all' || c.lessonId === filterLesson);

  // Filter learners
  const filteredLearners = learners.filter((l) => filterLearner === 'all' || l.id === filterLearner);

  // Helper to get assessment for a learner/criterion
  const getAssessment = (learnerId: string, criterionCode: string): Assessment | null => {
    return assessments.find((a) => a.learnerId === learnerId && a.criterionCode === criterionCode) || null;
  };

  // Calculate completion stats
  const calculateLearnerProgress = (learnerId: string): number => {
    const learnerAssessments = assessments.filter((a) => a.learnerId === learnerId);
    const completed = learnerAssessments.filter((a) => ['SIGNED_OFF', 'VERIFIED'].includes(a.status)).length;
    return criteria.length > 0 ? Math.round((completed / criteria.length) * 100) : 0;
  };

  const calculateCriterionProgress = (criterionCode: string): number => {
    const criterionAssessments = assessments.filter((a) => a.criterionCode === criterionCode);
    const completed = criterionAssessments.filter((a) => ['SIGNED_OFF', 'VERIFIED'].includes(a.status)).length;
    return learners.length > 0 ? Math.round((completed / learners.length) * 100) : 0;
  };

  // Apply status filter to cells
  const shouldShowCell = (assessment: Assessment | null): boolean => {
    if (filterStatus === 'all') return true;
    const status = assessment?.status || 'NOT_STARTED';
    return status === filterStatus;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-xs font-medium text-text-tertiary mb-1">Filter by Lesson</label>
          <select
            value={filterLesson}
            onChange={(e) => setFilterLesson(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
          >
            <option value="all">All Lessons</option>
            {uniqueLessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-tertiary mb-1">Filter by Learner</label>
          <select
            value={filterLearner}
            onChange={(e) => setFilterLearner(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
          >
            <option value="all">All Learners</option>
            {learners.map((learner) => (
              <option key={learner.id} value={learner.id}>
                {learner.firstName} {learner.lastName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-tertiary mb-1">Filter by Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
          >
            <option value="all">All Statuses</option>
            {Object.entries(statusConfig).map(([status, config]) => (
              <option key={status} value={status}>
                {config.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        {Object.entries(statusConfig).map(([status, config]) => (
          <div key={status} className="flex items-center gap-1">
            <span className={`w-5 h-5 flex items-center justify-center rounded ${config.bg} ${config.text}`}>
              {config.icon}
            </span>
            <span className="text-text-secondary">{config.label}</span>
          </div>
        ))}
      </div>

      {/* Matrix */}
      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full min-w-max">
          <thead>
            <tr className="bg-surface-hover">
              <th className="text-left py-3 px-4 text-xs font-medium text-text-tertiary uppercase sticky left-0 bg-surface-hover z-10 min-w-[200px]">
                Learner
              </th>
              {filteredCriteria.map((criterion) => (
                <th
                  key={criterion.code}
                  className="py-3 px-2 text-center text-xs font-medium text-text-tertiary"
                  title={`${criterion.text}\n\nLesson: ${criterion.lessonTitle}`}
                >
                  <div className="w-16">
                    <span className="block truncate">{criterion.code}</span>
                    <span className="block text-[10px] text-text-tertiary font-normal">{calculateCriterionProgress(criterion.code)}%</span>
                  </div>
                </th>
              ))}
              <th className="py-3 px-4 text-center text-xs font-medium text-text-tertiary uppercase bg-surface-hover">
                Progress
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {filteredLearners.map((learner) => {
              const progress = calculateLearnerProgress(learner.id);
              return (
                <tr key={learner.id} className="hover:bg-surface-hover">
                  <td className="py-3 px-4 sticky left-0 bg-surface z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium shrink-0">
                        {learner.firstName[0]}
                        {learner.lastName[0]}
                      </div>
                      <span className="font-medium text-text-primary text-sm">
                        {learner.firstName} {learner.lastName}
                      </span>
                    </div>
                  </td>
                  {filteredCriteria.map((criterion) => {
                    const assessment = getAssessment(learner.id, criterion.code);
                    const status = assessment?.status || 'NOT_STARTED';
                    const config = statusConfig[status];
                    const show = shouldShowCell(assessment);

                    return (
                      <td key={criterion.code} className="py-2 px-2 text-center">
                        {show ? (
                          <button
                            onClick={() => onCellClick(learner.id, criterion, assessment)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 hover:shadow ${config.bg} ${config.text}`}
                            title={`${learner.firstName} ${learner.lastName} - ${criterion.code}: ${config.label}`}
                          >
                            {config.icon}
                          </button>
                        ) : (
                          <span className="w-8 h-8 inline-block" />
                        )}
                      </td>
                    );
                  })}
                  <td className="py-3 px-4 text-center bg-surface-hover">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-12 h-2 bg-surface-active rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-text-secondary w-8">{progress}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="text-sm text-text-tertiary">
        {filteredLearners.length} learners × {filteredCriteria.length} criteria
      </div>
    </div>
  );
}
