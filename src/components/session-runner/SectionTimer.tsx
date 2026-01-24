'use client';

import { useEffect } from 'react';
import { useSessionRunner } from './SessionRunnerContext';

interface SectionTimerProps {
  blockId: string;
  title: string;
  targetDurationMins: number | null;
  initialElapsed?: number;
  initialRunning?: boolean;
}

export function SectionTimer({
  blockId,
  title,
  targetDurationMins,
  initialElapsed = 0,
  initialRunning = false,
}: SectionTimerProps) {
  const { state, initTimer, startTimer, pauseTimer, resetTimer } = useSessionRunner();

  // Initialize timer on mount
  useEffect(() => {
    initTimer(blockId, targetDurationMins ? targetDurationMins * 60 : null, initialElapsed, initialRunning);
  }, [blockId, targetDurationMins, initialElapsed, initialRunning, initTimer]);

  const timerState = state.timers[blockId];
  const elapsed = timerState?.elapsed || 0;
  const running = timerState?.running || false;
  const targetSeconds = targetDurationMins ? targetDurationMins * 60 : null;

  const isOvertime = targetSeconds !== null && elapsed > targetSeconds;
  const progress = targetSeconds ? Math.min(100, (elapsed / targetSeconds) * 100) : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const overtimeSeconds = isOvertime ? elapsed - targetSeconds! : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {targetDurationMins && (
          <span className="text-sm text-gray-500">Target: {targetDurationMins} min</span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Timer Display */}
        <div className="flex flex-col items-center">
          <div
            className={`text-4xl font-mono font-bold transition-colors ${
              isOvertime ? 'text-red-600' : 'text-gray-900'
            }`}
          >
            {formatTime(elapsed)}
          </div>
          {isOvertime && (
            <div className="text-sm text-red-500 mt-1">
              +{formatTime(overtimeSeconds)} overtime
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {targetSeconds && (
          <div className="flex-1">
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isOvertime
                    ? 'bg-red-500'
                    : progress > 75
                    ? 'bg-amber-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-400">
              <span>0:00</span>
              <span>{targetDurationMins}:00</span>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2">
          {!running ? (
            <button
              onClick={() => startTimer(blockId)}
              className="p-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              title="Start"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => pauseTimer(blockId)}
              className="p-3 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
              title="Pause"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            </button>
          )}
          <button
            onClick={() => resetTimer(blockId)}
            className="p-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            title="Reset"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Status indicator */}
      <div className="mt-4 flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            running
              ? 'bg-green-500 animate-pulse'
              : elapsed > 0
              ? 'bg-amber-500'
              : 'bg-gray-300'
          }`}
        />
        <span className="text-sm text-gray-500">
          {running ? 'Running' : elapsed > 0 ? 'Paused' : 'Not started'}
        </span>
      </div>
    </div>
  );
}
