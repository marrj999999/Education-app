import { cn } from '@/lib/utils';

const ZONE_CONFIG: Record<string, { icon: string; color: string }> = {
  Preparation: { icon: '📋', color: 'border-[var(--teal)]' },
  Delivery: { icon: '▶', color: 'border-[var(--forest)]' },
  Assessment: { icon: '✓', color: 'border-[var(--gold)]' },
  Resources: { icon: '📁', color: 'border-[var(--steel)]' },
  'Next Session': { icon: '→', color: 'border-[var(--teal)]' },
};

interface SectionZoneHeaderProps {
  label: string;
  className?: string;
}

export function SectionZoneHeader({ label, className }: SectionZoneHeaderProps) {
  const config = ZONE_CONFIG[label] || { icon: '•', color: 'border-[var(--border)]' };

  return (
    <div className={cn('flex items-center gap-3 pt-8 pb-3', className)}>
      <div className={cn('border-b-2 flex-1', config.color)} />
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center gap-1.5">
        <span>{config.icon}</span>
        {label}
      </span>
      <div className={cn('border-b-2 flex-1', config.color)} />
    </div>
  );
}
