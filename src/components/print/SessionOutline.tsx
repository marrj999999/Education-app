'use client';

import { useMemo } from 'react';

interface Section {
  title: string;
  durationMins: number | null;
  type: string;
  content?: string;
}

interface SessionOutlineProps {
  lessonTitle: string;
  moduleTitle: string;
  totalDurationMins: number | null;
  sections: Section[];
}

export function SessionOutline({
  lessonTitle,
  moduleTitle,
  totalDurationMins,
  sections,
}: SessionOutlineProps) {
  // Pre-calculate cumulative times for each section
  const sectionStartTimes = useMemo(() => {
    const times: number[] = [];
    let cumulative = 0;
    for (const section of sections) {
      times.push(cumulative);
      if (section.durationMins) {
        cumulative += section.durationMins;
      }
    }
    return times;
  }, [sections]);

  return (
    <div className="print-section">
      <h2 className="text-xl font-bold mb-2">{lessonTitle}</h2>
      <p className="text-sm text-gray-600 mb-1">{moduleTitle}</p>
      {totalDurationMins && (
        <p className="text-sm text-gray-600 mb-4">
          Total Duration: {totalDurationMins} minutes
        </p>
      )}

      <table className="w-full border-collapse border border-gray-300 text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-3 py-2 text-left w-20">Time</th>
            <th className="border border-gray-300 px-3 py-2 text-left w-20">Duration</th>
            <th className="border border-gray-300 px-3 py-2 text-left">Section</th>
            <th className="border border-gray-300 px-3 py-2 text-left w-24">Type</th>
            <th className="border border-gray-300 px-3 py-2 text-center w-16">Done</th>
          </tr>
        </thead>
        <tbody>
          {sections.map((section, index) => {
            const startTime = sectionStartTimes[index];

            const formatTime = (mins: number) => {
              const h = Math.floor(mins / 60);
              const m = mins % 60;
              return h > 0 ? `${h}h ${m}m` : `${m}m`;
            };

            return (
              <tr key={index}>
                <td className="border border-gray-300 px-3 py-2">
                  +{formatTime(startTime)}
                </td>
                <td className="border border-gray-300 px-3 py-2">
                  {section.durationMins ? `${section.durationMins} min` : '-'}
                </td>
                <td className="border border-gray-300 px-3 py-2">
                  <p className="font-medium">{section.title}</p>
                  {section.content && (
                    <p className="text-xs text-gray-500 mt-1">{section.content}</p>
                  )}
                </td>
                <td className="border border-gray-300 px-3 py-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      section.type === 'SECTION_TIMER'
                        ? 'bg-blue-100 text-blue-700'
                        : section.type === 'ACTIVITY'
                        ? 'bg-green-100 text-green-700'
                        : section.type === 'KEY_POINT'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {section.type.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="border border-gray-300 px-3 py-2 text-center">
                  <div className="w-5 h-5 border border-gray-400 mx-auto" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-4 text-sm">
        <p><strong>Instructor Notes:</strong></p>
        <div className="border border-gray-300 h-24 mt-1" />
      </div>
    </div>
  );
}
