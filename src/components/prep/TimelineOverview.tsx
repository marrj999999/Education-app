'use client';

import { useMemo, useEffect, useState } from 'react';
import { Clock, Timer, Circle, CheckCircle2 } from 'lucide-react';
import type { TimelineSection } from '@/lib/types/content';

interface TimelineOverviewProps {
  sections: TimelineSection[];
}

interface TimelineItem {
  time: string;
  activity: string;
  duration: string;
  notes?: string;
  timeMinutes: number; // For sorting and current time comparison
}

export function TimelineOverview({ sections }: TimelineOverviewProps) {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // Update current time every minute
  useEffect(() => {
    setCurrentTime(new Date());
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Combine all timeline rows and sort by time
  const timelineItems = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];

    sections.forEach((section) => {
      section.rows.forEach((row) => {
        // Parse time to minutes for sorting
        const timeMatch = row.time.match(/(\d{1,2}):(\d{2})/);
        const timeMinutes = timeMatch
          ? parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2])
          : 0;

        items.push({
          time: row.time,
          activity: row.activity,
          duration: row.duration,
          notes: row.notes,
          timeMinutes,
        });
      });
    });

    // Sort by time
    return items.sort((a, b) => a.timeMinutes - b.timeMinutes);
  }, [sections]);

  // Get current time in minutes
  const currentMinutes = currentTime
    ? currentTime.getHours() * 60 + currentTime.getMinutes()
    : 0;

  // Calculate total duration
  const totalDuration = useMemo(() => {
    let total = 0;
    timelineItems.forEach((item) => {
      const match = item.duration.match(/(\d+)/);
      if (match) {
        total += parseInt(match[1]);
      }
    });
    return total;
  }, [timelineItems]);

  if (timelineItems.length === 0) {
    return (
      <div className="bg-surface-hover border border-border rounded-lg p-8 text-center">
        <Clock className="mx-auto text-text-tertiary mb-3" size={32} />
        <p className="text-text-tertiary">No timeline available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-surface border border-border rounded-lg p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Clock className="text-text-secondary" size={20} />
            <h2 className="text-lg font-semibold text-text-primary">Day Schedule</h2>
          </div>
          <div className="flex items-center gap-4 text-sm text-text-tertiary">
            <span>{timelineItems.length} activities</span>
            <span className="flex items-center gap-1">
              <Timer size={16} />
              {totalDuration} mins total
            </span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-surface-active" />

        {/* Timeline Items */}
        <div className="space-y-4">
          {timelineItems.map((item, index) => {
            // Determine if this item is past, current, or future
            const isPast = currentMinutes > item.timeMinutes + 30;
            const isCurrent =
              currentMinutes >= item.timeMinutes &&
              currentMinutes <= item.timeMinutes + 60;

            return (
              <div
                key={index}
                className={`
                  relative flex gap-4 pl-12
                  ${isCurrent ? 'scale-[1.02]' : ''}
                  transition-transform duration-300
                `}
              >
                {/* Timeline dot */}
                <div
                  className={`
                    absolute left-4 w-5 h-5 rounded-full border-2
                    flex items-center justify-center
                    ${isPast
                      ? 'bg-green-500 border-green-500 text-white'
                      : isCurrent
                        ? 'bg-blue-500 border-blue-500 text-white animate-pulse'
                        : 'bg-surface border-border'
                    }
                  `}
                >
                  {isPast && <CheckCircle2 size={12} />}
                  {isCurrent && <Circle size={8} className="fill-current" />}
                </div>

                {/* Card */}
                <div
                  className={`
                    flex-1 bg-white border rounded-lg overflow-hidden
                    ${isCurrent
                      ? 'border-blue-300 ring-2 ring-blue-100'
                      : 'border-border'
                    }
                  `}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      {/* Time and Activity */}
                      <div className="flex items-center gap-3">
                        <span
                          className={`
                            font-mono font-semibold px-2 py-1 rounded
                            ${isCurrent
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-surface-hover text-text-secondary'
                            }
                          `}
                        >
                          {item.time}
                        </span>
                        <span
                          className={`
                            font-medium
                            ${isPast ? 'text-text-tertiary' : 'text-text-primary'}
                          `}
                        >
                          {item.activity}
                        </span>
                      </div>

                      {/* Duration */}
                      <span
                        className={`
                          flex-shrink-0 text-sm px-2 py-0.5 rounded-full
                          ${isCurrent
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-surface-hover text-text-secondary'
                          }
                        `}
                      >
                        {item.duration}
                      </span>
                    </div>

                    {/* Notes */}
                    {item.notes && (
                      <p
                        className={`
                          mt-2 text-sm
                          ${isPast ? 'text-text-tertiary' : 'text-text-secondary'}
                        `}
                      >
                        {item.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Time Indicator */}
      {currentTime && (
        <div className="text-center text-sm text-text-tertiary pt-4">
          Current time: {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  );
}
