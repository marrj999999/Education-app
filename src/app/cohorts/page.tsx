'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Users,
  Calendar,
  MapPin,
  Plus,
  ChevronRight,
  ArrowLeft,
  Layers,
} from 'lucide-react';

interface Cohort {
  id: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string | null;
  status: 'DRAFT' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  maxLearners: number;
  location: string | null;
  course: {
    id: string;
    title: string;
    slug: string;
  };
  _count: {
    learners: number;
    sessions: number;
  };
  instructors: {
    role: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  }[];
}

const statusColors: Record<string, { bg: string; text: string; solid: string }> = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700', solid: 'bg-gray-600' },
  SCHEDULED: { bg: 'bg-blue-100', text: 'text-blue-700', solid: 'bg-blue-600' },
  IN_PROGRESS: { bg: 'bg-green-100', text: 'text-green-700', solid: 'bg-green-600' },
  COMPLETED: { bg: 'bg-purple-100', text: 'text-purple-700', solid: 'bg-purple-600' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-700', solid: 'bg-red-600' },
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export default function CohortsPage() {
  const searchParams = useSearchParams();

  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchCohorts = useCallback(async () => {
    setIsLoading(true);

    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);

    try {
      const response = await fetch(`/api/cohorts?${params}`);
      const data = await response.json();

      if (response.ok) {
        setCohorts(data);
      }
    } catch (error) {
      console.error('Error fetching cohorts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchCohorts();
  }, [fetchCohorts]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Stats
  const activeCount = cohorts.filter(c => c.status === 'IN_PROGRESS').length;
  const scheduledCount = cohorts.filter(c => c.status === 'SCHEDULED').length;
  const completedCount = cohorts.filter(c => c.status === 'COMPLETED').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-700 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-white" />
                </div>
                <div className="hidden sm:block">
                  <p className="font-bold text-gray-900">Cohorts</p>
                  <p className="text-xs text-gray-500">Manage course deliveries</p>
                </div>
              </Link>
            </div>

            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-green-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard" className="text-white/70 hover:text-white">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-white/50" />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-white">Cohorts</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Cohorts</h1>
              <p className="text-green-100 mt-2">
                View and manage your course cohorts
              </p>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-green-100 text-sm">Active</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{scheduledCount}</p>
                <p className="text-green-100 text-sm">Scheduled</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{completedCount}</p>
                <p className="text-green-100 text-sm">Completed</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Actions & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Cohort
          </Button>
        </div>

        {/* Cohorts Grid */}
        {isLoading ? (
          <Card className="p-8 text-center">
            <CardContent className="pt-6">
              <div className="inline-block w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
              <p className="mt-2 text-muted-foreground">Loading cohorts...</p>
            </CardContent>
          </Card>
        ) : cohorts.length === 0 ? (
          <Card className="p-8 text-center">
            <CardContent className="pt-6">
              <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-muted-foreground mb-4">No cohorts found</p>
              <Button onClick={() => setShowCreateModal(true)}>
                Create your first cohort
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cohorts.map((cohort) => (
              <Link
                key={cohort.id}
                href={`/cohorts/${cohort.id}`}
                className="group"
              >
                <Card className="h-full overflow-hidden hover:shadow-lg hover:border-green-300 transition-all">
                  {/* Cohort Header */}
                  <div className={`h-20 ${statusColors[cohort.status].solid} p-4 flex items-end`}>
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <h3 className="font-bold text-white">{cohort.name}</h3>
                        <p className="text-white/80 text-sm">{cohort.code}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full bg-white/20 backdrop-blur text-white`}>
                        {statusLabels[cohort.status]}
                      </span>
                    </div>
                  </div>

                  {/* Cohort Body */}
                  <CardContent className="pt-4">
                    <p className="text-muted-foreground text-sm mb-3">{cohort.course.title}</p>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {formatDate(cohort.startDate)}
                          {cohort.endDate && ` - ${formatDate(cohort.endDate)}`}
                        </span>
                      </div>

                      {cohort.location && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>{cohort.location}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>
                          {cohort._count.learners} / {cohort.maxLearners} learners
                        </span>
                      </div>
                    </div>

                    {/* Instructors */}
                    {cohort.instructors.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <p className="text-xs text-muted-foreground mb-2">Instructors</p>
                        <div className="flex -space-x-2">
                          {cohort.instructors.slice(0, 3).map((instructor) => (
                            <div
                              key={instructor.user.id}
                              className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-medium border-2 border-white"
                              title={instructor.user.name || instructor.user.email}
                            >
                              {(instructor.user.name || instructor.user.email)[0].toUpperCase()}
                            </div>
                          ))}
                          {cohort.instructors.length > 3 && (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium border-2 border-white">
                              +{cohort.instructors.length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span>Sessions</span>
                        <span>{cohort._count.sessions} scheduled</span>
                      </div>
                      <Progress value={0} className="h-1.5" />
                    </div>

                    {/* View Link */}
                    <div className="mt-4 flex items-center justify-end text-sm text-green-600 font-medium group-hover:text-green-700">
                      <span>View Details</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Cohort</DialogTitle>
            <DialogDescription>
              This feature is coming soon. Cohorts can be created via the API.
            </DialogDescription>
          </DialogHeader>
          <Button variant="outline" onClick={() => setShowCreateModal(false)} className="w-full">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
