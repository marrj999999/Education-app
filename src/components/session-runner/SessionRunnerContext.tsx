'use client';

import { createContext, useContext, useReducer, useCallback, useEffect, ReactNode } from 'react';

// Types
interface TimerState {
  blockId: string;
  running: boolean;
  elapsed: number;
  targetDuration: number | null;
}

interface ChecklistState {
  blockId: string;
  items: { index: number; completed: boolean; text: string }[];
}

interface AttendanceRecord {
  learnerId: string;
  learnerName: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED' | null;
  arrivedAt: Date | null;
}

interface SessionState {
  sessionId: string | null;
  cohortId: string | null;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  timers: Record<string, TimerState>;
  checklists: Record<string, ChecklistState>;
  attendance: AttendanceRecord[];
  isLoading: boolean;
  error: string | null;
}

type SessionAction =
  | { type: 'SET_SESSION'; payload: { sessionId: string; cohortId: string; status: SessionState['status'] } }
  | { type: 'SET_STATUS'; payload: SessionState['status'] }
  | { type: 'INIT_TIMER'; payload: { blockId: string; targetDuration: number | null; elapsed?: number; running?: boolean } }
  | { type: 'START_TIMER'; payload: string }
  | { type: 'PAUSE_TIMER'; payload: string }
  | { type: 'RESET_TIMER'; payload: string }
  | { type: 'TICK_TIMERS' }
  | { type: 'INIT_CHECKLIST'; payload: { blockId: string; items: { index: number; completed: boolean; text: string }[] } }
  | { type: 'TOGGLE_CHECKLIST_ITEM'; payload: { blockId: string; itemIndex: number } }
  | { type: 'SET_ATTENDANCE'; payload: AttendanceRecord[] }
  | { type: 'UPDATE_ATTENDANCE'; payload: { learnerId: string; status: AttendanceRecord['status']; arrivedAt?: Date } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

// Initial state
const initialState: SessionState = {
  sessionId: null,
  cohortId: null,
  status: 'SCHEDULED',
  timers: {},
  checklists: {},
  attendance: [],
  isLoading: false,
  error: null,
};

// Reducer
function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'SET_SESSION':
      return {
        ...state,
        sessionId: action.payload.sessionId,
        cohortId: action.payload.cohortId,
        status: action.payload.status,
      };

    case 'SET_STATUS':
      return { ...state, status: action.payload };

    case 'INIT_TIMER':
      return {
        ...state,
        timers: {
          ...state.timers,
          [action.payload.blockId]: {
            blockId: action.payload.blockId,
            running: action.payload.running ?? false,
            elapsed: action.payload.elapsed ?? 0,
            targetDuration: action.payload.targetDuration,
          },
        },
      };

    case 'START_TIMER':
      return {
        ...state,
        timers: {
          ...state.timers,
          [action.payload]: {
            ...state.timers[action.payload],
            running: true,
          },
        },
      };

    case 'PAUSE_TIMER':
      return {
        ...state,
        timers: {
          ...state.timers,
          [action.payload]: {
            ...state.timers[action.payload],
            running: false,
          },
        },
      };

    case 'RESET_TIMER':
      return {
        ...state,
        timers: {
          ...state.timers,
          [action.payload]: {
            ...state.timers[action.payload],
            elapsed: 0,
            running: false,
          },
        },
      };

    case 'TICK_TIMERS':
      const updatedTimers = { ...state.timers };
      for (const blockId in updatedTimers) {
        if (updatedTimers[blockId].running) {
          updatedTimers[blockId] = {
            ...updatedTimers[blockId],
            elapsed: updatedTimers[blockId].elapsed + 1,
          };
        }
      }
      return { ...state, timers: updatedTimers };

    case 'INIT_CHECKLIST':
      return {
        ...state,
        checklists: {
          ...state.checklists,
          [action.payload.blockId]: {
            blockId: action.payload.blockId,
            items: action.payload.items,
          },
        },
      };

    case 'TOGGLE_CHECKLIST_ITEM':
      const checklist = state.checklists[action.payload.blockId];
      if (!checklist) return state;
      return {
        ...state,
        checklists: {
          ...state.checklists,
          [action.payload.blockId]: {
            ...checklist,
            items: checklist.items.map((item) =>
              item.index === action.payload.itemIndex
                ? { ...item, completed: !item.completed }
                : item
            ),
          },
        },
      };

    case 'SET_ATTENDANCE':
      return { ...state, attendance: action.payload };

    case 'UPDATE_ATTENDANCE':
      return {
        ...state,
        attendance: state.attendance.map((record) =>
          record.learnerId === action.payload.learnerId
            ? {
                ...record,
                status: action.payload.status,
                arrivedAt: action.payload.arrivedAt ?? record.arrivedAt,
              }
            : record
        ),
      };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    default:
      return state;
  }
}

// Context
interface SessionContextValue {
  state: SessionState;
  // Session actions
  initSession: (sessionId: string, cohortId: string, status: SessionState['status']) => void;
  updateSessionStatus: (status: SessionState['status']) => Promise<void>;
  // Timer actions
  initTimer: (blockId: string, targetDuration: number | null, elapsed?: number, running?: boolean) => void;
  startTimer: (blockId: string) => Promise<void>;
  pauseTimer: (blockId: string) => Promise<void>;
  resetTimer: (blockId: string) => Promise<void>;
  // Checklist actions
  initChecklist: (blockId: string, items: { index: number; completed: boolean; text: string }[]) => void;
  toggleChecklistItem: (blockId: string, itemIndex: number) => Promise<void>;
  // Attendance actions
  setAttendance: (records: AttendanceRecord[]) => void;
  updateAttendance: (learnerId: string, status: AttendanceRecord['status']) => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

// Provider
interface SessionRunnerProviderProps {
  children: ReactNode;
}

export function SessionRunnerProvider({ children }: SessionRunnerProviderProps) {
  const [state, dispatch] = useReducer(sessionReducer, initialState);

  // Timer tick effect
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: 'TICK_TIMERS' });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Session actions
  const initSession = useCallback(
    (sessionId: string, cohortId: string, status: SessionState['status']) => {
      dispatch({ type: 'SET_SESSION', payload: { sessionId, cohortId, status } });
    },
    []
  );

  const updateSessionStatus = useCallback(
    async (status: SessionState['status']) => {
      if (!state.sessionId) return;

      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const response = await fetch(`/api/sessions/${state.sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });

        if (response.ok) {
          dispatch({ type: 'SET_STATUS', payload: status });
        } else {
          const data = await response.json();
          dispatch({ type: 'SET_ERROR', payload: data.error || 'Failed to update session' });
        }
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to update session' });
        console.error('Error updating session:', err);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [state.sessionId]
  );

  // Timer actions
  const initTimer = useCallback(
    (blockId: string, targetDuration: number | null, elapsed = 0, running = false) => {
      dispatch({ type: 'INIT_TIMER', payload: { blockId, targetDuration, elapsed, running } });
    },
    []
  );

  const startTimer = useCallback(
    async (blockId: string) => {
      dispatch({ type: 'START_TIMER', payload: blockId });

      if (state.sessionId) {
        try {
          await fetch(`/api/sessions/${state.sessionId}/timer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              blockId,
              action: state.timers[blockId]?.elapsed > 0 ? 'RESUME' : 'START',
              elapsedSeconds: state.timers[blockId]?.elapsed || 0,
            }),
          });
        } catch (err) {
          console.error('Failed to log timer start:', err);
        }
      }
    },
    [state.sessionId, state.timers]
  );

  const pauseTimer = useCallback(
    async (blockId: string) => {
      dispatch({ type: 'PAUSE_TIMER', payload: blockId });

      if (state.sessionId) {
        try {
          await fetch(`/api/sessions/${state.sessionId}/timer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              blockId,
              action: 'PAUSE',
              elapsedSeconds: state.timers[blockId]?.elapsed || 0,
            }),
          });
        } catch (err) {
          console.error('Failed to log timer pause:', err);
        }
      }
    },
    [state.sessionId, state.timers]
  );

  const resetTimer = useCallback(
    async (blockId: string) => {
      dispatch({ type: 'RESET_TIMER', payload: blockId });

      if (state.sessionId) {
        try {
          await fetch(`/api/sessions/${state.sessionId}/timer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              blockId,
              action: 'RESET',
              elapsedSeconds: 0,
            }),
          });
        } catch (err) {
          console.error('Failed to log timer reset:', err);
        }
      }
    },
    [state.sessionId]
  );

  // Checklist actions
  const initChecklist = useCallback(
    (blockId: string, items: { index: number; completed: boolean; text: string }[]) => {
      dispatch({ type: 'INIT_CHECKLIST', payload: { blockId, items } });
    },
    []
  );

  const toggleChecklistItem = useCallback(
    async (blockId: string, itemIndex: number) => {
      const currentState = state.checklists[blockId]?.items.find((i) => i.index === itemIndex);
      const newCompleted = !currentState?.completed;

      dispatch({ type: 'TOGGLE_CHECKLIST_ITEM', payload: { blockId, itemIndex } });

      if (state.sessionId) {
        try {
          await fetch(`/api/sessions/${state.sessionId}/checklist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blockId, itemIndex, completed: newCompleted }),
          });
        } catch (err) {
          console.error('Failed to update checklist:', err);
          // Revert on error
          dispatch({ type: 'TOGGLE_CHECKLIST_ITEM', payload: { blockId, itemIndex } });
        }
      }
    },
    [state.sessionId, state.checklists]
  );

  // Attendance actions
  const setAttendance = useCallback((records: AttendanceRecord[]) => {
    dispatch({ type: 'SET_ATTENDANCE', payload: records });
  }, []);

  const updateAttendance = useCallback(
    async (learnerId: string, status: AttendanceRecord['status']) => {
      if (!state.sessionId || !state.cohortId) return;

      const arrivedAt = status === 'LATE' ? new Date() : undefined;
      dispatch({ type: 'UPDATE_ATTENDANCE', payload: { learnerId, status, arrivedAt } });

      try {
        await fetch(`/api/cohorts/${state.cohortId}/attendance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: state.sessionId,
            learnerId,
            status,
            arrivedAt: arrivedAt?.toISOString(),
          }),
        });
      } catch (err) {
        console.error('Failed to update attendance:', err);
      }
    },
    [state.sessionId, state.cohortId]
  );

  const value: SessionContextValue = {
    state,
    initSession,
    updateSessionStatus,
    initTimer,
    startTimer,
    pauseTimer,
    resetTimer,
    initChecklist,
    toggleChecklistItem,
    setAttendance,
    updateAttendance,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

// Hook
export function useSessionRunner() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionRunner must be used within a SessionRunnerProvider');
  }
  return context;
}
