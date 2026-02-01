'use client';

interface PrintHeaderProps {
  title: string;
  icon?: string;
}

export function PrintHeader({ title, icon }: PrintHeaderProps) {
  const currentDate = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="hidden print:block print-header">
      <h1 className="text-2xl font-bold text-gray-900">
        {icon && <span className="mr-2">{icon}</span>}
        {title}
      </h1>
      <p className="date text-gray-600 text-sm mt-1">
        Preparation Checklist - {currentDate}
      </p>
    </div>
  );
}

export default PrintHeader;
