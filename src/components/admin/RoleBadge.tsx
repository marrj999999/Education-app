import type { Role } from '@prisma/client';

const roleStyles: Record<Role, { bg: string; text: string; label: string }> = {
  SUPER_ADMIN: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    label: 'Super Admin',
  },
  ADMIN: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    label: 'Admin',
  },
  INSTRUCTOR: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    label: 'Instructor',
  },
  STUDENT: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
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
