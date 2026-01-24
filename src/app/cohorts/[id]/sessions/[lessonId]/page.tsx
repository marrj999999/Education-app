'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';

interface Block {
  id: string;
  blockType: string;
  content: {
    text?: string;
    items?: string[];
    title?: string;
    rows?: Array<{ cells: string[] }>;
    headers?: string[];
    url?: string;
    level?: number;
    icon?: string;
    criteria?: Array<{ code: string; description: string }>;
  };
  durationMins: number | null;
  sortOrder: number;
}

interface LearnerAttendance {
  learner: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
  };
  attendance: {
    status: string;
    arrivedAt: string | null;
  } | null;
}

interface SessionData {
  id: string;
  scheduledDate: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  actualStart: string | null;
  actualEnd: string | null;
  cohort: {
    id: string;
    name: string;
    code: string;
    course: {
      id: string;
      title: string;
      slug: string;
    };
  };
  lesson: {
    id: string;
    title: string;
    durationMins: number | null;
    ocnCriteria: string[];
    blocks: Block[];
    module: {
      id: string;
      title: string;
      weekNumber: number | null;
    };
  };
  learnerAttendance: LearnerAttendance[];
  checklistByBlock: Record<string, { itemIndex: number; completed: boolean }[]>;
  timerStateByBlock: Record<string, { lastAction: string; elapsedSeconds: number | null }>;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  SCHEDULED: { bg: 'bg-blue-100', text: 'text-blue-700' },
  IN_PROGRESS: { bg: 'bg-green-100', text: 'text-green-700' },
  COMPLETED: { bg: 'bg-purple-100', text: 'text-purple-700' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-700' },
};

export default function SessionRunnerPage({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const { id: cohortId, lessonId } = use(params);
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAttendance, setShowAttendance] = useState(false);
  const [timerStates, setTimerStates] = useState<Record<string, { running: boolean; elapsed: number }>>({});
  const [checklistStates, setChecklistStates] = useState<Record<string, boolean[]>>({});

  const fetchSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // First get the session ID from the cohort's sessions
      const cohortResponse = await fetch(`/api/cohorts/${cohortId}`);
      const cohortData = await cohortResponse.json();

      if (!cohortResponse.ok) {
        setError(cohortData.error || 'Failed to load cohort');
        return;
      }

      const sessionRecord = cohortData.sessions?.find((s: { lessonId: string }) => s.lessonId === lessonId);
      if (!sessionRecord) {
        setError('Session not found for this lesson');
        return;
      }

      const response = await fetch(`/api/sessions/${sessionRecord.id}`);
      const data = await response.json();

      if (response.ok) {
        setSession(data);

        // Initialize timer states from server
        const timers: Record<string, { running: boolean; elapsed: number }> = {};
        for (const [blockId, state] of Object.entries(data.timerStateByBlock || {})) {
          const timerState = state as { lastAction: string; elapsedSeconds: number | null };
          timers[blockId] = {
            running: timerState.lastAction === 'START' || timerState.lastAction === 'RESUME',
            elapsed: timerState.elapsedSeconds || 0,
          };
        }
        setTimerStates(timers);

        // Initialize checklist states from server
        const checklists: Record<string, boolean[]> = {};
        for (const [blockId, items] of Object.entries(data.checklistByBlock || {})) {
          const checklistItems = items as { itemIndex: number; completed: boolean }[];
          const maxIndex = Math.max(...checklistItems.map(i => i.itemIndex), -1);
          checklists[blockId] = Array(maxIndex + 1).fill(false);
          for (const item of checklistItems) {
            checklists[blockId][item.itemIndex] = item.completed;
          }
        }
        setChecklistStates(checklists);
      } else {
        setError(data.error || 'Failed to load session');
      }
    } catch (err) {
      setError('Failed to load session');
      console.error('Error fetching session:', err);
    } finally {
      setIsLoading(false);
    }
  }, [cohortId, lessonId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Timer tick effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerStates(prev => {
        const next = { ...prev };
        for (const blockId in next) {
          if (next[blockId].running) {
            next[blockId] = { ...next[blockId], elapsed: next[blockId].elapsed + 1 };
          }
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleTimerAction = async (blockId: string, action: 'START' | 'PAUSE' | 'RESUME' | 'RESET') => {
    if (!session) return;

    const currentState = timerStates[blockId] || { running: false, elapsed: 0 };

    // Optimistic update
    setTimerStates(prev => ({
      ...prev,
      [blockId]: {
        running: action === 'START' || action === 'RESUME',
        elapsed: action === 'RESET' ? 0 : currentState.elapsed,
      },
    }));

    // Send to server
    try {
      await fetch(`/api/sessions/${session.id}/timer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId,
          action,
          elapsedSeconds: action === 'RESET' ? 0 : currentState.elapsed,
        }),
      });
    } catch (err) {
      console.error('Failed to log timer action:', err);
    }
  };

  const handleChecklistToggle = async (blockId: string, itemIndex: number) => {
    if (!session) return;

    const currentState = checklistStates[blockId] || [];
    const newCompleted = !currentState[itemIndex];

    // Optimistic update
    setChecklistStates(prev => {
      const blockState = [...(prev[blockId] || [])];
      blockState[itemIndex] = newCompleted;
      return { ...prev, [blockId]: blockState };
    });

    // Send to server
    try {
      await fetch(`/api/sessions/${session.id}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockId, itemIndex, completed: newCompleted }),
      });
    } catch (err) {
      console.error('Failed to update checklist:', err);
    }
  };

  const handleAttendanceChange = async (learnerId: string, status: string) => {
    if (!session) return;

    try {
      await fetch(`/api/cohorts/${cohortId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          learnerId,
          status,
          arrivedAt: status === 'LATE' ? new Date().toISOString() : undefined,
        }),
      });
      fetchSession();
    } catch (err) {
      console.error('Failed to update attendance:', err);
    }
  };

  const handleSessionStatusChange = async (status: 'IN_PROGRESS' | 'COMPLETED') => {
    if (!session) return;

    try {
      await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchSession();
    } catch (err) {
      console.error('Failed to update session status:', err);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-2 text-gray-500">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-gray-500">{error || 'Session not found'}</p>
          <Link
            href={`/cohorts/${cohortId}`}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Back to Cohort
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href={`/cohorts/${cohortId}`} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="font-bold text-gray-900">{session.lesson.title}</h1>
                <p className="text-xs text-gray-500">{session.cohort.name} | {session.lesson.module.title}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAttendance(!showAttendance)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  showAttendance
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Attendance
              </button>

              {session.status === 'SCHEDULED' && (
                <button
                  onClick={() => handleSessionStatusChange('IN_PROGRESS')}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  Start Session
                </button>
              )}

              {session.status === 'IN_PROGRESS' && (
                <button
                  onClick={() => handleSessionStatusChange('COMPLETED')}
                  className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                >
                  End Session
                </button>
              )}

              <span className={`text-xs px-3 py-1 rounded-full ${statusColors[session.status].bg} ${statusColors[session.status].text}`}>
                {session.status.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Attendance Panel */}
      {showAttendance && (
        <div className="bg-white border-b border-gray-200 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap gap-2">
              {session.learnerAttendance.map(({ learner, attendance }) => (
                <div
                  key={learner.id}
                  className="flex items-center gap-2 bg-gray-50 rounded-lg p-2"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium">
                    {learner.firstName[0]}{learner.lastName[0]}
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {learner.firstName}
                  </span>
                  <div className="flex gap-1">
                    {(['PRESENT', 'LATE', 'ABSENT'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => handleAttendanceChange(learner.id, status)}
                        className={`w-6 h-6 rounded flex items-center justify-center text-xs transition-colors ${
                          attendance?.status === status
                            ? status === 'PRESENT'
                              ? 'bg-green-500 text-white'
                              : status === 'LATE'
                              ? 'bg-amber-500 text-white'
                              : 'bg-red-500 text-white'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                        title={status}
                      >
                        {status === 'PRESENT' ? 'P' : status === 'LATE' ? 'L' : 'A'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Lesson Content */}
        <div className="space-y-6">
          {session.lesson.blocks.map((block) => (
            <div key={block.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Section Timer */}
              {block.blockType === 'SECTION_TIMER' && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">{block.content.title || block.content.text}</h3>
                    <span className="text-sm text-gray-500">
                      {block.durationMins && `${block.durationMins} min`}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-mono font-bold text-gray-900">
                      {formatTime(timerStates[block.id]?.elapsed || 0)}
                    </div>
                    {block.durationMins && (
                      <div className="flex-1">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              (timerStates[block.id]?.elapsed || 0) > block.durationMins * 60
                                ? 'bg-red-500'
                                : 'bg-green-500'
                            }`}
                            style={{
                              width: `${Math.min(100, ((timerStates[block.id]?.elapsed || 0) / (block.durationMins * 60)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      {!timerStates[block.id]?.running ? (
                        <button
                          onClick={() => handleTimerAction(block.id, timerStates[block.id]?.elapsed ? 'RESUME' : 'START')}
                          className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleTimerAction(block.id, 'PAUSE')}
                          className="p-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => handleTimerAction(block.id, 'RESET')}
                        className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Checklist */}
              {block.blockType === 'CHECKLIST' && (
                <div className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">{block.content.title || 'Checklist'}</h3>
                  <div className="space-y-2">
                    {(block.content.items || []).map((item, index) => {
                      const isChecked = checklistStates[block.id]?.[index] || false;
                      return (
                        <label
                          key={index}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleChecklistToggle(block.id, index)}
                            className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                          <span className={isChecked ? 'text-gray-500 line-through' : 'text-gray-900'}>
                            {item}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Materials Table */}
              {block.blockType === 'MATERIALS_TABLE' && (
                <div className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Materials</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          {(block.content.headers || []).map((header, i) => (
                            <th key={i} className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(block.content.rows || []).map((row, i) => (
                          <tr key={i}>
                            {row.cells.map((cell, j) => (
                              <td key={j} className="py-2 px-3 text-sm text-gray-700">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Key Point */}
              {block.blockType === 'KEY_POINT' && (
                <div className="p-6 bg-amber-50 border-l-4 border-amber-400">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-amber-500 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                    <p className="text-gray-800">{block.content.text}</p>
                  </div>
                </div>
              )}

              {/* Activity */}
              {block.blockType === 'ACTIVITY' && (
                <div className="p-6 bg-green-50 border-l-4 border-green-400">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-medium text-green-800 mb-1">Activity</p>
                      <p className="text-gray-700">{block.content.text}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Discussion */}
              {block.blockType === 'DISCUSSION' && (
                <div className="p-6 bg-blue-50 border-l-4 border-blue-400">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <div>
                      <p className="font-medium text-blue-800 mb-1">Discussion</p>
                      <p className="text-gray-700">{block.content.text}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Assessment Grid */}
              {block.blockType === 'ASSESSMENT_GRID' && (
                <div className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Assessment Criteria</h3>
                  <div className="space-y-2">
                    {(block.content.criteria || []).map((criterion, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <span className="text-xs font-mono bg-purple-100 text-purple-700 px-2 py-1 rounded">
                          {criterion.code}
                        </span>
                        <p className="text-sm text-gray-700">{criterion.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Generic content blocks */}
              {['PARAGRAPH', 'HEADING_1', 'HEADING_2', 'HEADING_3', 'CALLOUT'].includes(block.blockType) && (
                <div className="p-6">
                  {block.blockType === 'HEADING_1' && (
                    <h1 className="text-2xl font-bold text-gray-900">{block.content.text}</h1>
                  )}
                  {block.blockType === 'HEADING_2' && (
                    <h2 className="text-xl font-bold text-gray-900">{block.content.text}</h2>
                  )}
                  {block.blockType === 'HEADING_3' && (
                    <h3 className="text-lg font-semibold text-gray-900">{block.content.text}</h3>
                  )}
                  {block.blockType === 'PARAGRAPH' && (
                    <p className="text-gray-700">{block.content.text}</p>
                  )}
                  {block.blockType === 'CALLOUT' && (
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                      {block.content.icon && <span className="text-xl">{block.content.icon}</span>}
                      <p className="text-gray-700">{block.content.text}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Table */}
              {block.blockType === 'TABLE' && (
                <div className="p-6 overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {(block.content.headers || []).map((header, i) => (
                          <th key={i} className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(block.content.rows || []).map((row, i) => (
                        <tr key={i}>
                          {row.cells.map((cell, j) => (
                            <td key={j} className="py-2 px-3 text-sm text-gray-700">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Image */}
              {block.blockType === 'IMAGE' && block.content.url && (
                <div className="p-6">
                  <img
                    src={block.content.url}
                    alt=""
                    className="max-w-full rounded-lg"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* OCN Criteria Footer */}
        {session.lesson.ocnCriteria.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">OCN Criteria Covered</h3>
            <div className="flex flex-wrap gap-2">
              {session.lesson.ocnCriteria.map((code) => (
                <span key={code} className="text-xs font-mono bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
                  {code}
                </span>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
