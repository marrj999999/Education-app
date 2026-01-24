'use client';

import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, X, AlertOctagon } from 'lucide-react';
import type { SafetySection } from '@/lib/types/content';

interface SafetyBarProps {
  criticalSafety: SafetySection[];
}

export function SafetyBar({ criticalSafety }: SafetyBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (criticalSafety.length === 0) {
    return null;
  }

  return (
    <div
      className={`
        fixed top-0 left-0 right-0 z-50
        transition-all duration-300 ease-in-out
        ${isExpanded ? 'bg-red-600' : 'bg-red-500'}
      `}
    >
      {/* Collapsed State */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          w-full flex items-center justify-center gap-2 px-4
          text-white font-medium transition-all
          ${isExpanded ? 'py-3' : 'py-2'}
        `}
        aria-expanded={isExpanded}
        aria-label={isExpanded ? 'Collapse safety warnings' : 'Expand safety warnings'}
      >
        <AlertTriangle size={20} />
        <span>
          {criticalSafety.length} safety point{criticalSafety.length !== 1 ? 's' : ''}
        </span>
        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="bg-red-700 border-t border-red-600">
          <div className="max-w-4xl mx-auto px-4 py-4">
            {/* Close button */}
            <div className="flex justify-end mb-3">
              <button
                onClick={() => setIsExpanded(false)}
                className="text-white/80 hover:text-white p-1"
                aria-label="Close safety panel"
              >
                <X size={20} />
              </button>
            </div>

            {/* Safety Items */}
            <div className="space-y-4">
              {criticalSafety.map((section, index) => (
                <div
                  key={index}
                  className="flex gap-4 bg-red-800/50 rounded-lg p-4"
                >
                  {/* Number */}
                  <span className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </span>

                  {/* Content */}
                  <div className="flex-1">
                    {section.title && (
                      <h4 className="font-semibold text-white text-lg mb-1">
                        {section.title}
                      </h4>
                    )}
                    <p className="text-white/90 text-lg leading-relaxed">
                      {section.content}
                    </p>

                    {/* Sub-items */}
                    {section.items && section.items.length > 0 && (
                      <ul className="mt-3 space-y-2">
                        {section.items.map((item, itemIndex) => (
                          <li
                            key={itemIndex}
                            className="flex items-start gap-2 text-white/80"
                          >
                            <AlertOctagon size={16} className="flex-shrink-0 mt-1" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom instruction */}
            <p className="text-center text-white/70 text-sm mt-4">
              Tap anywhere outside to collapse
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
