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
  intro: 'bg-blue-100 text-blue-700 border-blue-300',
  demo: 'bg-purple-100 text-purple-700 border-purple-300',
  practice: 'bg-green-100 text-green-700 border-green-300',
  assessment: 'bg-amber-100 text-amber-700 border-amber-300',
  break: 'bg-gray-100 text-gray-600 border-gray-300',
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
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 print:break-inside-avoid">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <ClockIcon size={20} className="text-gray-600" /> Session Timeline
        </h3>
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
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
