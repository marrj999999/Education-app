'use client';

const ZONE_CONFIG: Record<string, { icon: string; bgColor: string; textColor: string; borderColor: string }> = {
  'Preparation': { icon: '\u{1F4CB}', bgColor: 'bg-teal/20', textColor: 'text-forest', borderColor: 'border-teal' },
  'Delivery': { icon: '\u{1F393}', bgColor: 'bg-forest/20', textColor: 'text-forest', borderColor: 'border-forest' },
  'Assessment': { icon: '\u2705', bgColor: 'bg-gold/20', textColor: 'text-gold-text', borderColor: 'border-gold' },
  'Resources': { icon: '\u{1F4DA}', bgColor: 'bg-info/20', textColor: 'text-info', borderColor: 'border-info' },
  'Next Session': { icon: '\u{1F504}', bgColor: 'bg-assess/20', textColor: 'text-assess', borderColor: 'border-assess' },
  'Instructor Notes': { icon: '\u{1F4A1}', bgColor: 'bg-steel/20', textColor: 'text-steel', borderColor: 'border-steel' },
};

interface SectionZoneHeaderProps {
  label: string;
  className?: string;
}

export function SectionZoneHeader({ label }: SectionZoneHeaderProps) {
  const config = ZONE_CONFIG[label] || { icon: '\u{1F4C4}', bgColor: 'bg-surface-hover', textColor: 'text-text-secondary', borderColor: 'border-border' };

  return (
    <div className={`my-8 -mx-8 md:-mx-10 px-8 md:px-10 py-4 ${config.bgColor} border-y ${config.borderColor}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{config.icon}</span>
        <span className={`text-base font-bold uppercase tracking-wider ${config.textColor}`}>
          {label}
        </span>
        <div className="flex-1 h-px bg-current opacity-20" />
      </div>
    </div>
  );
}
