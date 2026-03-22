interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  color?: 'green' | 'blue' | 'purple' | 'amber' | 'gray';
}

const colorStyles = {
  green: 'bg-bamboo-100 text-teal',
  blue: 'bg-info-light text-info',
  purple: 'bg-assess-light text-assess',
  amber: 'bg-warning-light text-warning',
  gray: 'bg-surface-hover text-text-secondary',
};

export default function StatsCard({
  title,
  value,
  description,
  icon,
  trend,
  color = 'green',
}: StatsCardProps) {
  return (
    <div className="bg-surface rounded-xl p-6 shadow-sm border border-border">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-text-tertiary">{title}</p>
          <p className="text-3xl font-bold text-text-primary mt-1">{value}</p>
          {description && (
            <p className="text-sm text-text-tertiary mt-1">{description}</p>
          )}
          {trend && (
            <p
              className={`text-sm mt-2 ${
                trend.positive ? 'text-teal' : 'text-danger'
              }`}
            >
              <span className="font-medium">
                {trend.positive ? '+' : ''}
                {trend.value}
              </span>{' '}
              {trend.label}
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorStyles[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
