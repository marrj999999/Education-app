'use client';

import { useState } from 'react';

interface Learner {
  id: string;
  firstName: string;
  lastName: string;
}

interface Criterion {
  code: string;
  text: string;
  lessonTitle: string;
}

interface IqaSampleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    samplePeriod: string;
    learnersSelected: string[];
    criteriaSelected: string[];
  }) => Promise<void>;
  learners: Learner[];
  criteria: Criterion[];
}

export function IqaSampleForm({
  isOpen,
  onClose,
  onCreate,
  learners,
  criteria,
}: IqaSampleFormProps) {
  const [samplePeriod, setSamplePeriod] = useState('');
  const [selectedLearners, setSelectedLearners] = useState<string[]>([]);
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!samplePeriod || selectedLearners.length === 0 || selectedCriteria.length === 0) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onCreate({
        samplePeriod,
        learnersSelected: selectedLearners,
        criteriaSelected: selectedCriteria,
      });

      // Reset form
      setSamplePeriod('');
      setSelectedLearners([]);
      setSelectedCriteria([]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create IQA sample');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleLearner = (learnerId: string) => {
    setSelectedLearners((prev) =>
      prev.includes(learnerId) ? prev.filter((id) => id !== learnerId) : [...prev, learnerId]
    );
  };

  const toggleCriterion = (criterionCode: string) => {
    setSelectedCriteria((prev) =>
      prev.includes(criterionCode)
        ? prev.filter((code) => code !== criterionCode)
        : [...prev, criterionCode]
    );
  };

  const selectRandomLearners = (count: number) => {
    const shuffled = [...learners].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(count, learners.length)).map((l) => l.id);
    setSelectedLearners(selected);
  };

  const selectRandomCriteria = (count: number) => {
    const shuffled = [...criteria].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(count, criteria.length)).map((c) => c.code);
    setSelectedCriteria(selected);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

        <div className="relative bg-[var(--surface)] rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Create IQA Sample</h2>
            <button
              onClick={onClose}
              className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Sample Period */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Sample Period <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={samplePeriod}
                onChange={(e) => setSamplePeriod(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                placeholder="e.g., Week 3-4, January 2025"
              />
            </div>

            {/* Learner Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  Select Learners <span className="text-red-500">*</span>
                  <span className="ml-2 text-[var(--text-tertiary)]">({selectedLearners.length} selected)</span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => selectRandomLearners(3)}
                    className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                  >
                    Random 3
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedLearners(learners.map((l) => l.id))}
                    className="text-xs px-2 py-1 bg-[var(--surface-hover)] text-[var(--text-secondary)] rounded hover:bg-[var(--surface-active)] transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedLearners([])}
                    className="text-xs px-2 py-1 bg-[var(--surface-hover)] text-[var(--text-secondary)] rounded hover:bg-[var(--surface-active)] transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="border border-[var(--border)] rounded-lg max-h-40 overflow-y-auto">
                {learners.map((learner) => (
                  <label
                    key={learner.id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--surface-hover)] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedLearners.includes(learner.id)}
                      onChange={() => toggleLearner(learner.id)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-[var(--text-secondary)]">
                      {learner.firstName} {learner.lastName}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Criteria Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  Select Criteria <span className="text-red-500">*</span>
                  <span className="ml-2 text-[var(--text-tertiary)]">({selectedCriteria.length} selected)</span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => selectRandomCriteria(5)}
                    className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                  >
                    Random 5
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCriteria(criteria.map((c) => c.code))}
                    className="text-xs px-2 py-1 bg-[var(--surface-hover)] text-[var(--text-secondary)] rounded hover:bg-[var(--surface-active)] transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCriteria([])}
                    className="text-xs px-2 py-1 bg-[var(--surface-hover)] text-[var(--text-secondary)] rounded hover:bg-[var(--surface-active)] transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="border border-[var(--border)] rounded-lg max-h-48 overflow-y-auto">
                {criteria.map((criterion) => (
                  <label
                    key={criterion.code}
                    className="flex items-start gap-3 px-3 py-2 hover:bg-[var(--surface-hover)] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCriteria.includes(criterion.code)}
                      onChange={() => toggleCriterion(criterion.code)}
                      className="w-4 h-4 mt-0.5 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-sm font-mono text-purple-700">{criterion.code}</span>
                      <p className="text-xs text-[var(--text-tertiary)]">{criterion.lessonTitle}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t bg-[var(--surface-hover)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !samplePeriod || selectedLearners.length === 0 || selectedCriteria.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Sample'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
