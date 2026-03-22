import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import UserMenu from '@/components/auth/UserMenu';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login?callbackUrl=/admin');
  }

  // Only SUPER_ADMIN and ADMIN can access
  if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen bg-[var(--surface-hover)]">
      <AdminSidebar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-30">
          <div className="px-6 py-4 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">
              Admin Panel
            </h1>
            <UserMenu user={session.user} />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
