'use client';

import { useState } from 'react';

export interface EnrichedLearner {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  ocnLearnerId: string | null;
  status: 'ENROLLED' | 'ACTIVE' | 'DEFERRED' | 'WITHDRAWN' | 'COMPLETED' | 'FAILED';
  enrolledAt: string;
  notes: string | null;
  attendanceRate: number | null;
  assessmentProgress: number | null;
  attendanceCount: {
    present: number;
    late: number;
    absent: number;
    excused: number;
  };
  assessmentCount: {
    total: number;
    signedOff: number;
    inProgress: number;
    requiresRevision: number;
  };
}

interface LearnerTableProps {
  learners: EnrichedLearner[];
  onEdit: (learner: EnrichedLearner) => void;
  onDelete: (learner: EnrichedLearner) => void;
  onStatusChange: (learner: EnrichedLearner, newStatus: EnrichedLearner['status']) => void;
}

const statusConfig: Record<EnrichedLearner['status'], { bg: string; text: string; label: string }> = {
  ENROLLED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Enrolled' },
  ACTIVE: { bg: 'bg-green-100', text: 'text-green-700', label: 'Active' },
  DEFERRED: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Deferred' },
  WITHDRAWN: { bg: 'bg-red-100', text: 'text-red-700', label: 'Withdrawn' },
  COMPLETED: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Completed' },
  FAILED: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Failed' },
};

type SortField = 'name' | 'email' | 'status' | 'attendance' | 'progress';
type SortDirection = 'asc' | 'desc';

function SortIcon({
  field,
  currentField,
  direction
}: {
  field: SortField;
  currentField: SortField;
  direction: SortDirection;
}) {
  return (
    <span className="ml-1 inline-block">
      {currentField === field ? (
        direction === 'asc' ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )
      ) : (
        <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )}
    </span>
  );
}

export function LearnerTable({ learners, onEdit, onDelete, onStatusChange }: LearnerTableProps) {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedLearners = learners
    .filter((learner) => {
      const matchesSearch =
        searchQuery === '' ||
        `${learner.firstName} ${learner.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        learner.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || learner.status === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
          break;
        case 'email':
          comparison = a.email.localeCompare(b.email);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'attendance':
          comparison = (a.attendanceRate ?? -1) - (b.attendanceRate ?? -1);
          break;
        case 'progress':
          comparison = (a.assessmentProgress ?? -1) - (b.assessmentProgress ?? -1);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
        >
          <option value="all">All Statuses</option>
          {Object.entries(statusConfig).map(([value, config]) => (
            <option key={value} value={value}>
              {config.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  Learner
                  <SortIcon field="name" currentField={sortField} direction={sortDirection} />
                </div>
              </th>
              <th
                className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center">
                  Status
                  <SortIcon field="status" currentField={sortField} direction={sortDirection} />
                </div>
              </th>
              <th
                className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('attendance')}
              >
                <div className="flex items-center">
                  Attendance
                  <SortIcon field="attendance" currentField={sortField} direction={sortDirection} />
                </div>
              </th>
              <th
                className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('progress')}
              >
                <div className="flex items-center">
                  Progress
                  <SortIcon field="progress" currentField={sortField} direction={sortDirection} />
                </div>
              </th>
              <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {filteredAndSortedLearners.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">
                  {searchQuery || statusFilter !== 'all' ? 'No learners match your filters' : 'No learners enrolled yet'}
                </td>
              </tr>
            ) : (
              filteredAndSortedLearners.map((learner) => (
                <tr key={learner.id} className="hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium shrink-0">
                        {learner.firstName[0]}
                        {learner.lastName[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {learner.firstName} {learner.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{learner.email}</p>
                        {learner.ocnLearnerId && (
                          <p className="text-xs text-gray-400">OCN: {learner.ocnLearnerId}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <select
                      value={learner.status}
                      onChange={(e) => onStatusChange(learner, e.target.value as EnrichedLearner['status'])}
                      className={`text-xs px-2 py-1 rounded-full border-0 cursor-pointer ${statusConfig[learner.status].bg} ${statusConfig[learner.status].text}`}
                    >
                      {Object.entries(statusConfig).map(([value, config]) => (
                        <option key={value} value={value}>
                          {config.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-4 px-4">
                    {learner.attendanceRate !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              learner.attendanceRate >= 80
                                ? 'bg-green-500'
                                : learner.attendanceRate >= 60
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${learner.attendanceRate}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">{learner.attendanceRate}%</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      P:{learner.attendanceCount.present} L:{learner.attendanceCount.late} A:
                      {learner.attendanceCount.absent}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    {learner.assessmentProgress !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 transition-all"
                            style={{ width: `${learner.assessmentProgress}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">{learner.assessmentProgress}%</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      {learner.assessmentCount.signedOff}/{learner.assessmentCount.total} signed off
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => onEdit(learner)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit learner"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => onDelete(learner)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete learner"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="text-sm text-gray-500">
        Showing {filteredAndSortedLearners.length} of {learners.length} learners
      </div>
    </div>
  );
}
