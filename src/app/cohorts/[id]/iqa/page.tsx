'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { IqaSampleForm } from '@/components/cohorts/IqaSampleForm';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface IqaSample {
  id: string;
  samplePeriod: string;
  sampledAt: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ACTION_REQUIRED';
  learnersSelected: string[];
  criteriaSelected: string[];
  learnerNames: string[];
  findings: string | null;
  actionPoints: string | null;
  completedAt: string | null;
}

interface CohortData {
  id: string;
  name: string;
  code: string;
  course: {
    modules: {
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

const statusConfig: Record<IqaSample['status'], { bg: string; text: string; label: string }> = {
  PLANNED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Planned' },
  IN_PROGRESS: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'In Progress' },
  COMPLETED: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
  ACTION_REQUIRED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Action Required' },
};

export default function IqaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [cohort, setCohort] = useState<CohortData | null>(null);
  const [samples, setSamples] = useState<IqaSample[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSample, setSelectedSample] = useState<IqaSample | null>(null);
  const [editFindings, setEditFindings] = useState('');
  const [editActionPoints, setEditActionPoints] = useState('');
  const [editStatus, setEditStatus] = useState<IqaSample['status']>('PLANNED');
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [cohortRes, samplesRes] = await Promise.all([
        fetch(`/api/cohorts/${id}`),
        fetch(`/api/cohorts/${id}/iqa`),
      ]);

      if (!cohortRes.ok) throw new Error('Failed to load cohort');
      if (!samplesRes.ok) throw new Error('Failed to load IQA samples');

      const cohortData = await cohortRes.json();
      const samplesData = await samplesRes.json();

      setCohort(cohortData);
      setSamples(samplesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateSample = async (data: {
    samplePeriod: string;
    learnersSelected: string[];
    criteriaSelected: string[];
  }) => {
    const response = await fetch(`/api/cohorts/${id}/iqa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create sample');
    }

    await fetchData();
  };

  const handleOpenSample = (sample: IqaSample) => {
    setSelectedSample(sample);
    setEditFindings(sample.findings || '');
    setEditActionPoints(sample.actionPoints || '');
    setEditStatus(sample.status);
  };

  const handleSaveSample = async () => {
    if (!selectedSample) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/cohorts/${id}/iqa/${selectedSample.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editStatus,
          findings: editFindings || null,
          actionPoints: editActionPoints || null,
        }),
      });

      if (!response.ok) throw new Error('Failed to update sample');

      await fetchData();
      setSelectedSample(null);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-2 text-gray-500">Loading IQA samples...</p>
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

  // Extract criteria from course
  const criteria: { code: string; text: string; lessonTitle: string }[] = [];
  cohort.course.modules.forEach((module) => {
    module.lessons.forEach((lesson) => {
      lesson.ocnCriteria.forEach((code) => {
        if (!criteria.find((c) => c.code === code)) {
          criteria.push({ code, text: code, lessonTitle: lesson.title });
        }
      });
    });
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href={`/cohorts/${id}`} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="font-bold text-gray-900">Internal Quality Assurance</h1>
                <p className="text-xs text-gray-500">{cohort.name} ({cohort.code})</p>
              </div>
            </div>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Sample
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <BreadcrumbPage>IQA</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Info Card */}
        <div className="bg-purple-50 rounded-xl p-6 mb-8 border border-purple-100">
          <h2 className="font-semibold text-gray-900 mb-2">About IQA Sampling</h2>
          <p className="text-sm text-gray-600">
            Internal Quality Assurance involves sampling learner work to verify assessment decisions.
            Create samples by selecting learners and criteria to review, then record your findings
            and any action points.
          </p>
        </div>

        {/* Samples List */}
        {samples.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <p className="text-gray-500 mb-4">No IQA samples yet.</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
            >
              Create First Sample
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {samples.map((sample) => {
              const config = statusConfig[sample.status];
              return (
                <div
                  key={sample.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleOpenSample(sample)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{sample.samplePeriod}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.text}`}>
                          {config.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        Created {formatDate(sample.sampledAt)}
                        {sample.completedAt && ` • Completed ${formatDate(sample.completedAt)}`}
                      </p>
                      <div className="flex gap-4 mt-3 text-xs text-gray-400">
                        <span>{sample.learnersSelected.length} learners sampled</span>
                        <span>{sample.criteriaSelected.length} criteria reviewed</span>
                      </div>
                      {sample.learnerNames.length > 0 && (
                        <p className="text-xs text-gray-500 mt-2">
                          Learners: {sample.learnerNames.join(', ')}
                        </p>
                      )}
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Sample Modal */}
      <IqaSampleForm
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateSample}
        learners={cohort.learners}
        criteria={criteria}
      />

      {/* Sample Detail Modal */}
      {selectedSample && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setSelectedSample(null)} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedSample.samplePeriod}</h2>
                  <p className="text-sm text-gray-500">IQA Sample Details</p>
                </div>
                <button
                  onClick={() => setSelectedSample(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Learners Sampled</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {selectedSample.learnerNames.join(', ') || 'None'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Criteria Reviewed</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {selectedSample.criteriaSelected.join(', ') || 'None'}
                    </p>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <div className="flex gap-2">
                    {(Object.entries(statusConfig) as [IqaSample['status'], typeof statusConfig.PLANNED][]).map(
                      ([status, config]) => (
                        <button
                          key={status}
                          onClick={() => setEditStatus(status)}
                          className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                            editStatus === status
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

                {/* Findings */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Findings</label>
                  <textarea
                    value={editFindings}
                    onChange={(e) => setEditFindings(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                    placeholder="Record your findings from the sample review..."
                  />
                </div>

                {/* Action Points */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action Points</label>
                  <textarea
                    value={editActionPoints}
                    onChange={(e) => setEditActionPoints(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                    placeholder="List any actions required..."
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
                <button
                  onClick={() => setSelectedSample(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSample}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
