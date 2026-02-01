'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Clock, ChevronRight, CornerDownLeft, Command, BookOpen } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useNavigationOptional } from '@/lib/context/NavigationContext';
import { cn } from '@/lib/utils';
import type { NavigationLesson } from '@/lib/types/navigation';
import { flattenLessons } from '@/lib/types/navigation';

// =============================================================================
// Types
// =============================================================================

interface QuickJumpProps {
  /** Control open state externally */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
}

interface SearchResult {
  lesson: NavigationLesson;
  score: number;
  matches: string[];
}

// =============================================================================
// Constants
// =============================================================================

const RECENT_LESSONS_KEY = 'bamboo-recent-lessons';
const MAX_RECENT = 5;
const MAX_RESULTS = 10;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Simple fuzzy search scoring
 * Returns a score based on how well the query matches the text
 * Higher score = better match
 */
function fuzzyScore(text: string, query: string): number {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();

  // Exact match
  if (textLower === queryLower) return 100;

  // Starts with
  if (textLower.startsWith(queryLower)) return 90;

  // Contains exact phrase
  if (textLower.includes(queryLower)) return 70;

  // Word match
  const words = textLower.split(/\s+/);
  const queryWords = queryLower.split(/\s+/);
  let wordMatchScore = 0;
  for (const qw of queryWords) {
    if (words.some((w) => w.startsWith(qw))) {
      wordMatchScore += 20;
    } else if (words.some((w) => w.includes(qw))) {
      wordMatchScore += 10;
    }
  }
  if (wordMatchScore > 0) return 50 + wordMatchScore;

  // Fuzzy character match
  let qi = 0;
  let consecutiveBonus = 0;
  let lastMatchIndex = -10;

  for (let ti = 0; ti < textLower.length && qi < queryLower.length; ti++) {
    if (textLower[ti] === queryLower[qi]) {
      if (ti === lastMatchIndex + 1) {
        consecutiveBonus += 5;
      }
      lastMatchIndex = ti;
      qi++;
    }
  }

  if (qi === queryLower.length) {
    return 20 + consecutiveBonus;
  }

  return 0;
}

/**
 * Get recent lessons from localStorage
 */
function getRecentLessons(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(RECENT_LESSONS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore
  }
  return [];
}

/**
 * Add a lesson to recent history
 */
function addToRecent(lessonId: string) {
  if (typeof window === 'undefined') return;
  try {
    const recent = getRecentLessons().filter((id) => id !== lessonId);
    recent.unshift(lessonId);
    localStorage.setItem(RECENT_LESSONS_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    // Ignore
  }
}

// =============================================================================
// Component
// =============================================================================

export function QuickJump({ open: controlledOpen, onOpenChange }: QuickJumpProps) {
  const router = useRouter();
  const navigation = useNavigationOptional();
  const inputRef = useRef<HTMLInputElement>(null);

  // State
  const [internalOpen, setInternalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  // Controlled vs uncontrolled
  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = onOpenChange ?? setInternalOpen;

  // Get all lessons
  const allLessons = useMemo(() => {
    if (!navigation?.structure) return [];
    return flattenLessons(navigation.structure);
  }, [navigation?.structure]);

  // Load recent lessons on mount
  useEffect(() => {
    setRecentIds(getRecentLessons());
  }, []);

  // Search results
  const searchResults = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];

    const results: SearchResult[] = [];

    for (const lesson of allLessons) {
      const titleScore = fuzzyScore(lesson.title, query);
      const moduleScore = lesson.module ? fuzzyScore(lesson.module, query) * 0.5 : 0;
      const totalScore = Math.max(titleScore, moduleScore);

      if (totalScore > 0) {
        results.push({
          lesson,
          score: totalScore,
          matches: [],
        });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, MAX_RESULTS);
  }, [query, allLessons]);

  // Recent lessons (when no query)
  const recentLessons = useMemo(() => {
    if (query.trim()) return [];
    return recentIds
      .map((id) => allLessons.find((l) => l.id === id))
      .filter((l): l is NavigationLesson => l !== undefined)
      .slice(0, MAX_RECENT);
  }, [query, recentIds, allLessons]);

  // Combined results for display
  const displayResults = query.trim() ? searchResults.map((r) => r.lesson) : recentLessons;

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [displayResults.length]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
      setQuery('');
      setSelectedIndex(0);
      setRecentIds(getRecentLessons());
    }
  }, [isOpen]);

  // Navigate to selected lesson
  const navigateToLesson = useCallback(
    (lesson: NavigationLesson) => {
      addToRecent(lesson.id);
      router.push(lesson.url);
      setIsOpen(false);
    },
    [router, setIsOpen]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, displayResults.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (displayResults[selectedIndex]) {
            navigateToLesson(displayResults[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
      }
    },
    [displayResults, selectedIndex, navigateToLesson, setIsOpen]
  );

  // Global keyboard shortcut
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [setIsOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className="sm:max-w-xl p-0 gap-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Search className="text-gray-400 flex-shrink-0" size={20} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search lessons..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-0 outline-none text-base placeholder:text-gray-400"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 bg-gray-100 rounded">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {/* Empty state */}
          {displayResults.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              {query.trim() ? (
                <>
                  <Search className="mx-auto mb-2 text-gray-400" size={32} />
                  <p>No lessons found for &quot;{query}&quot;</p>
                </>
              ) : (
                <>
                  <Clock className="mx-auto mb-2 text-gray-400" size={32} />
                  <p>No recent lessons</p>
                  <p className="text-sm mt-1">Start typing to search</p>
                </>
              )}
            </div>
          )}

          {/* Section header */}
          {displayResults.length > 0 && (
            <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide bg-gray-50 border-b">
              {query.trim() ? 'Search Results' : 'Recent Lessons'}
            </div>
          )}

          {/* Result list */}
          {displayResults.map((lesson, index) => (
            <button
              key={lesson.id}
              onClick={() => navigateToLesson(lesson)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                'min-h-[52px]',
                index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  index === selectedIndex ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                )}
              >
                {lesson.icon ? (
                  <span className="text-base">{lesson.icon}</span>
                ) : (
                  <BookOpen size={16} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'font-medium truncate',
                    index === selectedIndex ? 'text-blue-900' : 'text-gray-900'
                  )}
                >
                  {lesson.title}
                </p>
                {lesson.module && (
                  <p className="text-sm text-gray-500 truncate">{lesson.module}</p>
                )}
              </div>

              {/* Action indicator */}
              <ChevronRight
                size={16}
                className={cn(
                  'flex-shrink-0 transition-transform',
                  index === selectedIndex ? 'text-blue-500 translate-x-1' : 'text-gray-300'
                )}
              />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-200">↑↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-200">
                <CornerDownLeft size={10} />
              </kbd>
              to select
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Command size={10} />K to open
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default QuickJump;
