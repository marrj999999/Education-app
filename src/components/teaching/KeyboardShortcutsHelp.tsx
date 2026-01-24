'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  X,
  Space,
  HelpCircle,
  Command,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutItem {
  keys: React.ReactNode[];
  description: string;
  category: 'navigation' | 'actions' | 'general';
}

// =============================================================================
// Shortcuts Data
// =============================================================================

const shortcuts: ShortcutItem[] = [
  // Navigation
  {
    keys: [<ArrowLeft key="left" size={14} />],
    description: 'Previous section',
    category: 'navigation',
  },
  {
    keys: [<ArrowRight key="right" size={14} />],
    description: 'Next section',
    category: 'navigation',
  },
  {
    keys: [<ArrowUp key="up" size={14} />],
    description: 'Previous lesson',
    category: 'navigation',
  },
  {
    keys: [<ArrowDown key="down" size={14} />],
    description: 'Next lesson',
    category: 'navigation',
  },

  // Actions
  {
    keys: ['Space'],
    description: 'Toggle current checkpoint',
    category: 'actions',
  },

  // General
  {
    keys: ['Esc'],
    description: 'Exit teaching mode',
    category: 'general',
  },
  {
    keys: ['?'],
    description: 'Show keyboard shortcuts',
    category: 'general',
  },
  {
    keys: [<Command key="cmd" size={14} />, 'K'],
    description: 'Quick jump to lesson',
    category: 'general',
  },
];

// =============================================================================
// Component
// =============================================================================

export function KeyboardShortcutsHelp({ open, onOpenChange }: KeyboardShortcutsHelpProps) {
  const categories = [
    { key: 'navigation', label: 'Navigation' },
    { key: 'actions', label: 'Actions' },
    { key: 'general', label: 'General' },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle size={20} className="text-blue-500" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate through the lesson content.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {categories.map(({ key, label }) => (
            <div key={key}>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {label}
              </h3>
              <div className="space-y-2">
                {shortcuts
                  .filter((s) => s.category === key)
                  .map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50"
                    >
                      <span className="text-sm text-gray-700">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <React.Fragment key={keyIndex}>
                            {keyIndex > 0 && (
                              <span className="text-xs text-gray-400">+</span>
                            )}
                            <kbd
                              className={cn(
                                'inline-flex items-center justify-center min-w-[28px] h-7',
                                'px-2 text-xs font-medium',
                                'bg-white border border-gray-200 rounded shadow-sm',
                                'text-gray-600'
                              )}
                            >
                              {key}
                            </kbd>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t mt-4">
          <p className="text-xs text-gray-500 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">?</kbd> anytime to
            show this help
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default KeyboardShortcutsHelp;
