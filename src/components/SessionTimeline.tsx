'use client';

import {
  ClockIcon,
  MegaphoneIcon,
  PlayIcon,
  CheckCircleIcon,
  ClipboardIcon,
  PauseIcon,
  ChatIcon,
} from '@/components/Icons';

interface IconProps {
  className?: string;
  size?: number | string;
}

interface Activity {
  duration: number; // in minutes
  title: string;
  type: 'intro' | 'demo' | 'practice' | 'assessment' | 'break' | 'discussion';
}

interface SessionTimelineProps {
  activities: Activity[];
}

const typeColors: Record<Activity['type'], string> = {
  intro: 'bg-info-light text-info-dark border-info-medium',
  demo: 'bg-assess-light text-assess-dark border-assess-medium',
  practice: 'bg-bamboo-100 text-teal border-bamboo-200',
  assessment: 'bg-warning-light text-warning-dark border-warning-medium',
  break: 'bg-surface-hover text-text-secondary border-border',
  discussion: 'bg-cyan-100 text-cyan-700 border-cyan-300',
};

const typeIcons: Record<Activity['type'], React.FC<IconProps>> = {
  intro: MegaphoneIcon,
  demo: PlayIcon,
  practice: CheckCircleIcon,
  assessment: ClipboardIcon,
  break: PauseIcon,
  discussion: ChatIcon,
};

export default function SessionTimeline({ activities }: SessionTimelineProps) {
  if (!activities?.length) return null;

  const totalMinutes = activities.reduce((sum, a) => sum + a.duration, 0);

  return (
    <div className="bg-surface border border-border rounded-xl p-5 mb-6 print:break-inside-avoid">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-text-primary flex items-center gap-2">
          <ClockIcon size={20} className="text-text-secondary" /> Session Timeline
        </h3>
        <span className="text-sm text-text-tertiary bg-surface-hover px-3 py-1 rounded-full">
          {totalMinutes} min total
        </span>
      </div>
      <div className="space-y-2">
        {activities.map((activity, i) => {
          const IconComponent = typeIcons[activity.type];
          return (
            <div
              key={i}
              className={`flex items-center gap-4 p-3 rounded-lg border ${typeColors[activity.type]}`}
            >
              <IconComponent size={20} />
              <span className="w-16 text-sm font-mono font-medium">
                {activity.duration} min
              </span>
              <div className="flex-1 font-medium">{activity.title}</div>
              <span className="text-xs uppercase tracking-wide opacity-75 hidden sm:inline">
                {activity.type}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
