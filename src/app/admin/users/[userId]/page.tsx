'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { canAssignRole } from '@/lib/permissions';
import RoleBadge from '@/components/admin/RoleBadge';
import type { Role } from '@prisma/client';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  image: string | null;
  emailVerified: string | null;
  enrollments: Array<{
    id: string;
    status: string;
    enrolledAt: string;
    course: {
      id: string;
      title: string;
      slug: string;
    };
  }>;
  instructorCourses: Array<{
    id: string;
    isPrimary: boolean;
    assignedAt: string;
    course: {
      id: string;
      title: string;
      slug: string;
    };
  }>;
}

const roles: { value: Role; label: string; description: string }[] = [
  {
    value: 'STUDENT',
    label: 'Student',
    description: 'Read-only access to enrolled courses',
  },
  {
    value: 'INSTRUCTOR',
    label: 'Instructor',
    description: 'Full access to assigned courses',
  },
  {
    value: 'ADMIN',
    label: 'Admin',
    description: 'User management and course assignments',
  },
  {
    value: 'SUPER_ADMIN',
    label: 'Super Admin',
    description: 'Full system access including user deletion',
  },
];

export default function EditUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const router = useRouter();
  const { data: session } = useSession();

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'STUDENT' as Role,
    isActive: true,
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswordFields, setShowPasswordFields] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`/api/admin/users/${userId}`);
        const data = await response.json();

        if (response.ok) {
          setUser(data.user);
          setFormData({
            name: data.user.name || '',
            email: data.user.email,
            role: data.user.role,
            isActive: data.user.isActive,
            newPassword: '',
            confirmPassword: '',
          });
        } else {
          setError(data.error || 'Failed to fetch user');
        }
      } catch (error) {
        setError('An error occurred while fetching user');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);

    // Validate password if changing
    if (showPasswordFields && formData.newPassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        setError('Passwords do not match');
        setIsSaving(false);
        return;
      }
      if (formData.newPassword.length < 8) {
        setError('Password must be at least 8 characters');
        setIsSaving(false);
        return;
      }
    }

    // Check role permissions
    if (
      session?.user &&
      formData.role !== user?.role &&
      !canAssignRole(session.user.role, formData.role)
    ) {
      setError('You do not have permission to assign this role');
      setIsSaving(false);
      return;
    }

    try {
      const updateData: Record<string, unknown> = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        isActive: formData.isActive,
      };

      if (showPasswordFields && formData.newPassword) {
        updateData.password = formData.newPassword;
      }

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update user');
        setIsSaving(false);
        return;
      }

      setSuccess('User updated successfully');
      setShowPasswordFields(false);
      setFormData((prev) => ({ ...prev, newPassword: '', confirmPassword: '' }));

      // Update local user state
      setUser((prev) =>
        prev
          ? {
              ...prev,
              name: formData.name,
              email: formData.email,
              role: formData.role,
              isActive: formData.isActive,
            }
          : null
      );
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete ${user?.email}? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/admin/users');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete user');
      }
    } catch (error) {
      setError('An error occurred while deleting user');
    }
  };

  const availableRoles = roles.filter(
    (role) => !session?.user || canAssignRole(session.user.role, role.value)
  );

  const isSelf = session?.user?.id === userId;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">User not found</h2>
        <Link
          href="/admin/users"
          className="mt-4 inline-block text-green-600 hover:text-green-700"
        >
          Back to Users
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Users
        </Link>
        <div className="flex items-center gap-4">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name || ''}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center text-white text-2xl font-medium">
              {(user.name || user.email)[0].toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {user.name || 'No name'}
            </h1>
            <p className="text-gray-500">{user.email}</p>
          </div>
          <RoleBadge role={user.role} size="md" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Edit Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Edit User
            </h2>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name
                </label>
                <input
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Role
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  disabled={isSelf}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                >
                  {availableRoles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                {isSelf && (
                  <p className="mt-1 text-sm text-amber-600">
                    You cannot change your own role
                  </p>
                )}
              </div>

              {/* Status */}
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                    disabled={isSelf}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed" />
                </label>
                <span className="text-sm font-medium text-gray-700">
                  Account Active
                </span>
              </div>

              {/* Password Reset */}
              <div className="border-t border-gray-100 pt-5">
                {!showPasswordFields ? (
                  <button
                    type="button"
                    onClick={() => setShowPasswordFields(true)}
                    className="text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    Reset Password
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        New Password
                      </label>
                      <input
                        name="newPassword"
                        type="password"
                        value={formData.newPassword}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                        placeholder="Enter new password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Confirm Password
                      </label>
                      <input
                        name="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                        placeholder="Confirm new password"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordFields(false);
                        setFormData((prev) => ({
                          ...prev,
                          newPassword: '',
                          confirmPassword: '',
                        }));
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Cancel password reset
                    </button>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSelf}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete User
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* User Info Sidebar */}
        <div className="space-y-6">
          {/* Account Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-900 uppercase mb-4">
              Account Info
            </h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Created</dt>
                <dd className="text-gray-900 font-medium">
                  {new Date(user.createdAt).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Last Login</dt>
                <dd className="text-gray-900 font-medium">
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleDateString()
                    : 'Never'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Email Verified</dt>
                <dd className="text-gray-900 font-medium">
                  {user.emailVerified ? 'Yes' : 'No'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Status</dt>
                <dd>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user.isActive ? 'Active' : 'Suspended'}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Course Assignments */}
          {user.instructorCourses.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-900 uppercase mb-4">
                Assigned Courses
              </h3>
              <ul className="space-y-2">
                {user.instructorCourses.map((assignment) => (
                  <li
                    key={assignment.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-900">
                      {assignment.course.title}
                    </span>
                    {assignment.isPrimary && (
                      <span className="text-xs text-green-600 font-medium">
                        Primary
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Enrollments */}
          {user.enrollments.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-900 uppercase mb-4">
                Enrollments
              </h3>
              <ul className="space-y-2">
                {user.enrollments.map((enrollment) => (
                  <li
                    key={enrollment.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-900">
                      {enrollment.course.title}
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        enrollment.status === 'ACTIVE'
                          ? 'text-green-600'
                          : enrollment.status === 'COMPLETED'
                          ? 'text-blue-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {enrollment.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
