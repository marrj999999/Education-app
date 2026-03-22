'use client';

import { useSessionRunner } from './SessionRunnerContext';

interface Learner {
  id: string;
  firstName: string;
  lastName: string;
}

interface AttendanceQuickBarProps {
  learners: Learner[];
  className?: string;
}

const statusConfig = {
  PRESENT: { label: 'P', bg: 'bg-success', hoverBg: 'hover:bg-success', title: 'Present' },
  LATE: { label: 'L', bg: 'bg-warning', hoverBg: 'hover:bg-warning', title: 'Late' },
  ABSENT: { label: 'A', bg: 'bg-danger', hoverBg: 'hover:bg-danger', title: 'Absent' },
  EXCUSED: { label: 'E', bg: 'bg-info', hoverBg: 'hover:bg-info', title: 'Excused' },
};

export function AttendanceQuickBar({ learners, className = '' }: AttendanceQuickBarProps) {
  const { state, updateAttendance } = useSessionRunner();

  // Calculate summary
  const summary = state.attendance.reduce(
    (acc, record) => {
      if (record.status) {
        acc[record.status] = (acc[record.status] || 0) + 1;
      } else {
        acc.unmarked = (acc.unmarked || 0) + 1;
      }
      return acc;
    },
    { PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0, unmarked: 0 } as Record<string, number>
  );

  return (
    <div className={`bg-surface border-b border-border ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        {/* Summary Bar */}
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-text-secondary">Quick Attendance</h4>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-success">{summary.PRESENT} present</span>
            <span className="text-warning">{summary.LATE} late</span>
            <span className="text-danger">{summary.ABSENT} absent</span>
            {summary.EXCUSED > 0 && <span className="text-info">{summary.EXCUSED} excused</span>}
            {summary.unmarked > 0 && <span className="text-text-tertiary">{summary.unmarked} unmarked</span>}
          </div>
        </div>

        {/* Learner Grid */}
        <div className="flex flex-wrap gap-2">
          {learners.map((learner) => {
            const record = state.attendance.find((a) => a.learnerId === learner.id);
            const currentStatus = record?.status;

            return (
              <div
                key={learner.id}
                className="flex items-center gap-2 bg-surface-hover rounded-lg p-2 min-w-[180px]"
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-info flex items-center justify-center text-white text-xs font-medium shrink-0">
                  {learner.firstName[0]}
                  {learner.lastName[0]}
                </div>

                {/* Name */}
                <span className="text-sm font-medium text-text-primary truncate flex-1">
                  {learner.firstName}
                </span>

                {/* Status Buttons */}
                <div className="flex gap-1">
                  {(Object.entries(statusConfig) as [keyof typeof statusConfig, typeof statusConfig.PRESENT][]).map(
                    ([status, config]) => (
                      <button
                        key={status}
                        onClick={() => updateAttendance(learner.id, status as 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED')}
                        className={`w-6 h-6 rounded flex items-center justify-center text-xs font-medium transition-all ${
                          currentStatus === status
                            ? `${config.bg} text-white`
                            : `bg-surface-active text-text-tertiary ${config.hoverBg.replace('hover:', '')} hover:text-white`
                        }`}
                        title={config.title}
                      >
                        {config.label}
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mark All Actions */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
          <span className="text-xs text-text-tertiary">Mark all:</span>
          {(Object.entries(statusConfig) as [keyof typeof statusConfig, typeof statusConfig.PRESENT][]).map(
            ([status, config]) => (
              <button
                key={status}
                onClick={() => {
                  learners.forEach((learner) => {
                    updateAttendance(learner.id, status as 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED');
                  });
                }}
                className={`px-3 py-1 text-xs rounded ${config.bg} text-white ${config.hoverBg} transition-colors`}
              >
                {config.title}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
