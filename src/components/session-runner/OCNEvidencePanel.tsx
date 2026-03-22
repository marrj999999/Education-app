'use client';

import { useState } from 'react';

interface Criterion {
  code: string;
  text: string;
}

interface Learner {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface SignoffRecord {
  learnerId: string;
  criterionCode: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'SIGNED_OFF' | 'REQUIRES_REVISION' | 'VERIFIED';
  evidenceNotes?: string;
}

interface OCNEvidencePanelProps {
  cohortId: string;
  lessonId: string;
  criteria: Criterion[];
  learners: Learner[];
  initialSignoffs?: SignoffRecord[];
  onSignoff?: (signoff: SignoffRecord) => void;
}

const statusConfig = {
  NOT_STARTED: { label: 'Not Started', bg: 'bg-surface-hover', text: 'text-text-secondary', icon: '○' },
  IN_PROGRESS: { label: 'In Progress', bg: 'bg-info-light', text: 'text-info-dark', icon: '◐' },
  SUBMITTED: { label: 'Submitted', bg: 'bg-warning-light', text: 'text-warning-dark', icon: '◑' },
  SIGNED_OFF: { label: 'Signed Off', bg: 'bg-success-light', text: 'text-success-dark', icon: '●' },
  REQUIRES_REVISION: { label: 'Revision', bg: 'bg-danger-light', text: 'text-danger-dark', icon: '◌' },
  VERIFIED: { label: 'Verified', bg: 'bg-assess-light', text: 'text-assess-dark', icon: '✓' },
};

export function OCNEvidencePanel({
  cohortId,
  lessonId,
  criteria,
  learners,
  initialSignoffs = [],
  onSignoff,
}: OCNEvidencePanelProps) {
  const [selectedLearner, setSelectedLearner] = useState<string | null>(
    learners.length > 0 ? learners[0].id : null
  );
  const [signoffs, setSignoffs] = useState<SignoffRecord[]>(initialSignoffs);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNotes, setShowNotes] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  const getSignoff = (learnerId: string, criterionCode: string): SignoffRecord | undefined => {
    return signoffs.find((s) => s.learnerId === learnerId && s.criterionCode === criterionCode);
  };

  const handleStatusChange = async (criterionCode: string, criterionText: string, newStatus: SignoffRecord['status']) => {
    if (!selectedLearner) return;

    setIsSubmitting(true);

    const signoff: SignoffRecord = {
      learnerId: selectedLearner,
      criterionCode,
      status: newStatus,
      evidenceNotes: noteText || undefined,
    };

    try {
      const response = await fetch(`/api/cohorts/${cohortId}/assessments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learnerId: selectedLearner,
          lessonId,
          criterionCode,
          criterionText,
          status: newStatus,
          evidenceNotes: noteText || undefined,
        }),
      });

      if (response.ok) {
        setSignoffs((prev) => {
          const existing = prev.findIndex(
            (s) => s.learnerId === selectedLearner && s.criterionCode === criterionCode
          );
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = signoff;
            return updated;
          }
          return [...prev, signoff];
        });

        if (onSignoff) {
          onSignoff(signoff);
        }

        setShowNotes(null);
        setNoteText('');
      }
    } catch (err) {
      console.error('Failed to update signoff:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedLearnerData = learners.find((l) => l.id === selectedLearner);

  // Calculate progress for selected learner
  const learnerSignoffs = signoffs.filter((s) => s.learnerId === selectedLearner);
  const completedCount = learnerSignoffs.filter((s) =>
    ['SIGNED_OFF', 'VERIFIED'].includes(s.status)
  ).length;
  const progressPercent = criteria.length > 0 ? Math.round((completedCount / criteria.length) * 100) : 0;

  return (
    <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-assess-light">
        <h3 className="font-semibold text-text-primary mb-3">OCN Evidence Sign-off</h3>

        {/* Learner Selector */}
        <div className="flex items-center gap-3">
          <select
            value={selectedLearner || ''}
            onChange={(e) => setSelectedLearner(e.target.value)}
            className="flex-1 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
          >
            {learners.map((learner) => (
              <option key={learner.id} value={learner.id}>
                {learner.firstName} {learner.lastName}
              </option>
            ))}
          </select>

          {/* Progress */}
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 bg-surface-active rounded-full overflow-hidden">
              <div
                className="h-full bg-assess transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-sm text-text-tertiary">{progressPercent}%</span>
          </div>
        </div>
      </div>

      {/* Criteria List */}
      {selectedLearnerData && (
        <div className="divide-y divide-border">
          {criteria.map((criterion) => {
            const currentSignoff = getSignoff(selectedLearner!, criterion.code);
            const currentStatus = currentSignoff?.status || 'NOT_STARTED';
            const config = statusConfig[currentStatus];

            return (
              <div key={criterion.code} className="p-4">
                <div className="flex items-start gap-3">
                  {/* Criterion Code */}
                  <span className="text-xs font-mono bg-assess-light text-assess-dark px-2 py-1 rounded shrink-0">
                    {criterion.code}
                  </span>

                  {/* Criterion Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-secondary">{criterion.text}</p>

                    {/* Status Buttons */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(Object.keys(statusConfig) as Array<keyof typeof statusConfig>).map((status) => {
                        const btnConfig = statusConfig[status];
                        const isActive = currentStatus === status;

                        return (
                          <button
                            key={status}
                            onClick={() => handleStatusChange(criterion.code, criterion.text, status)}
                            disabled={isSubmitting}
                            className={`px-2 py-1 text-xs rounded transition-all ${
                              isActive
                                ? `${btnConfig.bg} ${btnConfig.text} font-medium`
                                : 'bg-surface-hover text-text-tertiary hover:bg-surface-hover'
                            }`}
                          >
                            {btnConfig.icon} {btnConfig.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Notes Section */}
                    {showNotes === criterion.code ? (
                      <div className="mt-2">
                        <textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Add evidence notes..."
                          className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                          rows={2}
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => {
                              setShowNotes(null);
                              setNoteText('');
                            }}
                            className="px-3 py-1 text-xs text-text-secondary bg-surface-hover rounded hover:bg-surface-active transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleStatusChange(criterion.code, criterion.text, currentStatus)}
                            className="px-3 py-1 text-xs text-white bg-assess rounded hover:bg-assess-dark transition-colors"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setShowNotes(criterion.code);
                          setNoteText(currentSignoff?.evidenceNotes || '');
                        }}
                        className="mt-2 text-xs text-assess hover:text-assess-dark"
                      >
                        {currentSignoff?.evidenceNotes ? 'Edit notes' : '+ Add notes'}
                      </button>
                    )}

                    {/* Show existing notes */}
                    {currentSignoff?.evidenceNotes && showNotes !== criterion.code && (
                      <p className="mt-1 text-xs text-text-tertiary italic">
                        Notes: {currentSignoff.evidenceNotes}
                      </p>
                    )}
                  </div>

                  {/* Status Badge */}
                  <span className={`px-2 py-1 text-xs rounded-full ${config.bg} ${config.text} shrink-0`}>
                    {config.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {criteria.length === 0 && (
        <div className="p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-text-tertiary mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-text-tertiary">No OCN criteria for this lesson</p>
        </div>
      )}
    </div>
  );
}
