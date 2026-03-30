'use client';

const ZONE_CONFIG: Record<string, { icon: string; bgColor: string; textColor: string; borderColor: string }> = {
  'Preparation': { icon: '\u{1F4CB}', bgColor: 'bg-teal/10', textColor: 'text-teal', borderColor: 'border-teal/30' },
  'Delivery': { icon: '\u{1F393}', bgColor: 'bg-forest/10', textColor: 'text-forest', borderColor: 'border-forest/30' },
  'Assessment': { icon: '\u2705', bgColor: 'bg-gold/10', textColor: 'text-gold-text', borderColor: 'border-gold/30' },
  'Resources': { icon: '\u{1F4DA}', bgColor: 'bg-info/10', textColor: 'text-info', borderColor: 'border-info/30' },
  'Next Session': { icon: '\u{1F504}', bgColor: 'bg-assess/10', textColor: 'text-assess', borderColor: 'border-assess/30' },
  'Instructor Notes': { icon: '\u{1F4A1}', bgColor: 'bg-steel/10', textColor: 'text-steel', borderColor: 'border-steel/30' },
};

interface SectionZoneHeaderProps {
  label: string;
  className?: string;
}

export function SectionZoneHeader({ label }: SectionZoneHeaderProps) {
  const config = ZONE_CONFIG[label] || { icon: '\u{1F4C4}', bgColor: 'bg-surface-hover', textColor: 'text-text-secondary', borderColor: 'border-border' };

  return (
    <div className="flex items-center gap-3 my-8">
      <div className="flex-1 h-px bg-border" />
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${config.bgColor} ${config.borderColor}`}>
        <span className="text-lg">{config.icon}</span>
        <span className={`text-sm font-semibold uppercase tracking-wider ${config.textColor}`}>
          {label}
        </span>
      </div>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}
