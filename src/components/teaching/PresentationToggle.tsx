'use client';

import { Maximize2, Minimize2, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PresentationToggleProps {
  isPresentation: boolean;
  onToggle: () => void;
  isDarkMode: boolean;
  onDarkModeToggle: () => void;
}

export function PresentationToggle({
  isPresentation,
  onToggle,
  isDarkMode,
  onDarkModeToggle,
}: PresentationToggleProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Presentation Mode Toggle */}
      <button
        onClick={onToggle}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm',
          'transition-all duration-200',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500',
          isPresentation
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        )}
        aria-pressed={isPresentation}
        title={isPresentation ? 'Exit presentation mode (Esc)' : 'Enter presentation mode'}
      >
        {isPresentation ? (
          <>
            <Minimize2 size={18} />
            <span className="hidden sm:inline">Exit</span>
          </>
        ) : (
          <>
            <Maximize2 size={18} />
            <span className="hidden sm:inline">Present</span>
          </>
        )}
      </button>

      {/* Dark Mode Toggle - Only visible in presentation mode */}
      {isPresentation && (
        <button
          onClick={onDarkModeToggle}
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-lg',
            'transition-all duration-200',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500',
            isDarkMode
              ? 'bg-slate-700 text-yellow-400 hover:bg-slate-600'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
          aria-pressed={isDarkMode}
          title={isDarkMode ? 'Light mode' : 'Dark mode'}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      )}
    </div>
  );
}

export default PresentationToggle;
