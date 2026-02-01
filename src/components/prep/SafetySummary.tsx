'use client';

import { useMemo } from 'react';
import { AlertTriangle, AlertOctagon, AlertCircle, ShieldAlert } from 'lucide-react';
import type { SafetySection } from '@/lib/types/content';

interface SafetySummaryProps {
  sections: SafetySection[];
}

export function SafetySummary({ sections }: SafetySummaryProps) {
  // Group by severity level
  const grouped = useMemo(() => {
    const groups: Record<string, SafetySection[]> = {
      critical: [],
      warning: [],
      caution: [],
    };

    sections.forEach((section) => {
      groups[section.level].push(section);
    });

    return groups;
  }, [sections]);

  const levelConfig = {
    critical: {
      icon: AlertOctagon,
      title: 'Critical Safety Points',
      description: 'Must be addressed before starting',
      bg: 'bg-red-50',
      border: 'border-red-200',
      iconColor: 'text-red-600',
      titleColor: 'text-red-900',
      textColor: 'text-red-800',
      badge: 'bg-red-100 text-red-800',
    },
    warning: {
      icon: AlertTriangle,
      title: 'Warnings',
      description: 'Important precautions to observe',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      iconColor: 'text-amber-600',
      titleColor: 'text-amber-900',
      textColor: 'text-amber-800',
      badge: 'bg-amber-100 text-amber-800',
    },
    caution: {
      icon: AlertCircle,
      title: 'Cautions',
      description: 'General safety reminders',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      iconColor: 'text-yellow-600',
      titleColor: 'text-yellow-900',
      textColor: 'text-yellow-800',
      badge: 'bg-yellow-100 text-yellow-800',
    },
  };

  const totalCount = sections.length;

  if (totalCount === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <ShieldAlert className="mx-auto text-green-500 mb-3" size={32} />
        <p className="text-green-800 font-medium">No safety points for this session</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <ShieldAlert className="text-gray-600" size={24} />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Safety Briefing</h2>
              <p className="text-sm text-gray-500">
                Read aloud at the start of the session
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {grouped.critical.length > 0 && (
              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                {grouped.critical.length} Critical
              </span>
            )}
            {grouped.warning.length > 0 && (
              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                {grouped.warning.length} Warning{grouped.warning.length > 1 ? 's' : ''}
              </span>
            )}
            {grouped.caution.length > 0 && (
              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                {grouped.caution.length} Caution{grouped.caution.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Safety Points by Level */}
      {(['critical', 'warning', 'caution'] as const).map((level) => {
        const items = grouped[level];
        if (items.length === 0) return null;

        const config = levelConfig[level];
        const Icon = config.icon;

        return (
          <div
            key={level}
            className={`${config.bg} ${config.border} border-2 rounded-lg overflow-hidden`}
          >
            {/* Level Header */}
            <div className={`border-b ${config.border} px-4 py-3`}>
              <div className="flex items-center gap-3">
                <Icon className={config.iconColor} size={24} />
                <div>
                  <h3 className={`font-semibold ${config.titleColor}`}>{config.title}</h3>
                  <p className={`text-sm ${config.textColor} opacity-75`}>
                    {config.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="p-4 space-y-4">
              {items.map((section, index) => (
                <div key={index} className="flex gap-3">
                  <span
                    className={`
                      flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center
                      text-sm font-bold ${config.badge}
                    `}
                  >
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    {section.title && (
                      <p className={`font-semibold ${config.titleColor} mb-1`}>
                        {section.title}
                      </p>
                    )}
                    <p className={`${config.textColor} text-lg leading-relaxed`}>
                      {section.content}
                    </p>
                    {section.items && section.items.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {section.items.map((item, itemIndex) => (
                          <li
                            key={itemIndex}
                            className={`flex items-start gap-2 ${config.textColor}`}
                          >
                            <AlertTriangle size={14} className="flex-shrink-0 mt-1" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Print Instructions */}
      <div className="text-center text-sm text-gray-500 print:hidden">
        <p>Review all safety points before beginning the workshop</p>
      </div>
    </div>
  );
}
