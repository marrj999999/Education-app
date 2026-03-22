import type { Role } from '@prisma/client';

const roleStyles: Record<Role, { bg: string; text: string; label: string }> = {
  SUPER_ADMIN: {
    bg: 'bg-assess-light',
    text: 'text-assess-darker',
    label: 'Super Admin',
  },
  ADMIN: {
    bg: 'bg-info-light',
    text: 'text-info-darker',
    label: 'Admin',
  },
  INSTRUCTOR: {
    bg: 'bg-bamboo-100',
    text: 'text-forest',
    label: 'Instructor',
  },
  STUDENT: {
    bg: 'bg-surface-hover',
    text: 'text-text-primary',
    label: 'Student',
  },
};

interface RoleBadgeProps {
  role: Role;
  size?: 'sm' | 'md';
}

export default function RoleBadge({ role, size = 'sm' }: RoleBadgeProps) {
  const styles = roleStyles[role];

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${styles.bg} ${styles.text} ${
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
    >
      {styles.label}
    </span>
  );
}
