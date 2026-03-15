'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';

interface TimerState {
  blockId: string;
  running: boolean;
  elapsed: number;
  targetDuration: number | null;
}

interface TimerContextValue {
  timers: Record<string, TimerState>;
  initTimer: (blockId: string, targetDuration: number | null, elapsed?: number, running?: boolean) => void;
  startTimer: (blockId: string) => void;
  pauseTimer: (blockId: string) => void;
  resetTimer: (blockId: string) => void;
  getTimerState: (blockId: string) => TimerState | undefined;
}

const TimerContext = createContext<TimerContextValue | null>(null);

interface TimerProviderProps {
  children: ReactNode;
  onTimerAction?: (blockId: string, action: 'START' | 'PAUSE' | 'RESUME' | 'RESET', elapsed: number) => void;
}

export function TimerProvider({ children, onTimerAction }: TimerProviderProps) {
  const [timers, setTimers] = useState<Record<string, TimerState>>({});
  const timersRef = useRef(timers);

  // Keep ref in sync with state
  useEffect(() => {
    timersRef.current = timers;
  }, [timers]);

  // Timer tick effect - only updates running timers
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prev) => {
        const hasRunning = Object.values(prev).some(t => t.running);
        if (!hasRunning) return prev; // No change if no running timers

        const updated: Record<string, TimerState> = {};
        let changed = false;

        for (const [blockId, timer] of Object.entries(prev)) {
          if (timer.running) {
            updated[blockId] = { ...timer, elapsed: timer.elapsed + 1 };
            changed = true;
          } else {
            updated[blockId] = timer;
          }
        }

        return changed ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const initTimer = useCallback(
    (blockId: string, targetDuration: number | null, elapsed = 0, running = false) => {
      setTimers((prev) => ({
        ...prev,
        [blockId]: { blockId, running, elapsed, targetDuration },
      }));
    },
    []
  );

  const startTimer = useCallback(
    (blockId: string) => {
      const timer = timersRef.current[blockId];
      const isResume = timer && timer.elapsed > 0;

      setTimers((prev) => ({
        ...prev,
        [blockId]: { ...prev[blockId], running: true },
      }));

      if (onTimerAction) {
        onTimerAction(blockId, isResume ? 'RESUME' : 'START', timer?.elapsed || 0);
      }
    },
    [onTimerAction]
  );

  const pauseTimer = useCallback(
    (blockId: string) => {
      const timer = timersRef.current[blockId];

      setTimers((prev) => ({
        ...prev,
        [blockId]: { ...prev[blockId], running: false },
      }));

      if (onTimerAction) {
        onTimerAction(blockId, 'PAUSE', timer?.elapsed || 0);
      }
    },
    [onTimerAction]
  );

  const resetTimer = useCallback(
    (blockId: string) => {
      setTimers((prev) => ({
        ...prev,
        [blockId]: { ...prev[blockId], elapsed: 0, running: false },
      }));

      if (onTimerAction) {
        onTimerAction(blockId, 'RESET', 0);
      }
    },
    [onTimerAction]
  );

  const getTimerState = useCallback(
    (blockId: string) => timers[blockId],
    [timers]
  );

  const value: TimerContextValue = {
    timers,
    initTimer,
    startTimer,
    pauseTimer,
    resetTimer,
    getTimerState,
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}

// Hook for a specific timer - only re-renders when that specific timer changes
export function useTimerState(blockId: string) {
  const { timers, startTimer, pauseTimer, resetTimer } = useTimer();
  const timer = timers[blockId];

  return {
    elapsed: timer?.elapsed ?? 0,
    running: timer?.running ?? false,
    targetDuration: timer?.targetDuration ?? null,
    start: () => startTimer(blockId),
    pause: () => pauseTimer(blockId),
    reset: () => resetTimer(blockId),
  };
}
