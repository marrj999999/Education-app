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
  green: 'bg-green-100 text-green-600',
  blue: 'bg-blue-100 text-blue-600',
  purple: 'bg-purple-100 text-purple-600',
  amber: 'bg-amber-100 text-amber-600',
  gray: 'bg-gray-100 text-gray-600',
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
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
          {trend && (
            <p
              className={`text-sm mt-2 ${
                trend.positive ? 'text-green-600' : 'text-red-600'
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
