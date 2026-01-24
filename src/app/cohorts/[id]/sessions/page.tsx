'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { CreateSessionModal } from '@/components/cohorts/CreateSessionModal';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Calendar,
  Clock,
  Plus,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
  Play,
  CheckCircle,
  Users,
} from 'lucide-react';

interface Session {
  id: string;
  lessonId: string;
  scheduledDate: string;
  scheduledTime: string | null;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';
  actualStart: string | null;
  actualEnd: string | null;
  lesson: {
    id: string;
    title: string;
    durationMins: number | null;
    module: {
      title: string;
      weekNumber: number | null;
    };
  };
  _count: {
    attendance: number;
  };
}

interface CohortData {
  id: string;
  name: string;
  code: string;
  course: {
    modules: {
      id: string;
      title: string;
      weekNumber: number | null;
      lessons: {
        id: string;
        title: string;
        durationMins: number | null;
      }[];
    }[];
  };
  learners: { id: string }[];
}

const statusConfig: Record<Session['status'], { bg: string; text: string; label: string; icon: typeof CheckCircle }> = {
  SCHEDULED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Scheduled', icon: Calendar },
  IN_PROGRESS: { bg: 'bg-green-100', text: 'text-green-700', label: 'In Progress', icon: Play },
  COMPLETED: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Completed', icon: CheckCircle },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled', icon: AlertCircle },
  RESCHEDULED: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Rescheduled', icon: Calendar },
};

export default function SessionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [cohort, setCohort] = useState<CohortData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [cohortRes, sessionsRes] = await Promise.all([
        fetch(`/api/cohorts/${id}`),
        fetch(`/api/cohorts/${id}/sessions`),
      ]);

      if (!cohortRes.ok) throw new Error('Failed to load cohort');
      if (!sessionsRes.ok) throw new Error('Failed to load sessions');

      const cohortData = await cohortRes.json();
      const sessionsData = await sessionsRes.json();

      setCohort(cohortData);
      setSessions(sessionsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateSession = async (data: { lessonId: string; scheduledDate: string; scheduledTime?: string }) => {
    const response = await fetch(`/api/cohorts/${id}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create session');
    }

    await fetchData();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return null;
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-2 text-muted-foreground">Loading sessions...</p>
        </div>
      </div>
    );
  }

  if (error || !cohort) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
          <p className="text-muted-foreground">{error || 'Failed to load'}</p>
          <Link href={`/cohorts/${id}`}>
            <Button variant="outline" className="mt-4">
              Back to Cohort
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Prepare lessons for modal
  const lessons = cohort.course.modules.flatMap((module) =>
    module.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      durationMins: lesson.durationMins,
      moduleTitle: module.title,
      weekNumber: module.weekNumber,
    }))
  );

  const existingSessionLessonIds = sessions.map((s) => s.lessonId);

  // Group sessions by date for display
  const sessionsByDate: Record<string, Session[]> = {};
  sessions.forEach((session) => {
    const dateKey = new Date(session.scheduledDate).toISOString().split('T')[0];
    if (!sessionsByDate[dateKey]) {
      sessionsByDate[dateKey] = [];
    }
    sessionsByDate[dateKey].push(session);
  });

  const sortedDates = Object.keys(sessionsByDate).sort();

  // Stats
  const completedCount = sessions.filter((s) => s.status === 'COMPLETED').length;
  const upcomingCount = sessions.filter((s) => s.status === 'SCHEDULED').length;
  const totalLessons = lessons.length;
  const progressPercentage = totalLessons > 0 ? Math.round((sessions.length / totalLessons) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href={`/cohorts/${id}`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="font-bold text-gray-900">Sessions</h1>
                <p className="text-xs text-muted-foreground">{cohort.name} ({cohort.code})</p>
              </div>
            </div>

            <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Schedule Session
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard" className="text-white/70 hover:text-white">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-white/50" />
              <BreadcrumbItem>
                <BreadcrumbLink href="/cohorts" className="text-white/70 hover:text-white">Cohorts</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-white/50" />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/cohorts/${id}`} className="text-white/70 hover:text-white">{cohort.name}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-white/50" />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-white">Sessions</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Sessions</h1>
              <p className="text-blue-100 mt-2">
                Schedule and manage your course sessions
              </p>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-2xl font-bold">{sessions.length}</p>
                <p className="text-blue-100 text-sm">Total</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{completedCount}</p>
                <p className="text-blue-100 text-sm">Completed</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{upcomingCount}</p>
                <p className="text-blue-100 text-sm">Upcoming</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Bar */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Course Progress</span>
              <span className="text-sm text-muted-foreground">
                {sessions.length} / {totalLessons} lessons scheduled
              </span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">
              {progressPercentage}% of course content has been scheduled
            </p>
          </CardContent>
        </Card>

        {/* Sessions List */}
        {sessions.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-muted-foreground mb-4">No sessions scheduled yet.</p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                Schedule First Session
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {sortedDates.map((dateKey) => (
              <div key={dateKey}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex flex-col items-center justify-center">
                    <span className="text-xs text-blue-600 font-medium">
                      {new Date(dateKey + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short' })}
                    </span>
                    <span className="text-lg font-bold text-blue-700">
                      {new Date(dateKey + 'T00:00:00').getDate()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {new Date(dateKey + 'T00:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {sessionsByDate[dateKey].length} session{sessionsByDate[dateKey].length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 ml-[60px]">
                  {sessionsByDate[dateKey].map((session) => {
                    const config = statusConfig[session.status];
                    const StatusIcon = config.icon;

                    return (
                      <Link
                        key={session.id}
                        href={`/cohorts/${id}/sessions/${session.lessonId}`}
                        className="block group"
                      >
                        <Card className="hover:shadow-md transition-shadow">
                          <CardContent className="pt-4 pb-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-gray-900">{session.lesson.title}</h4>
                                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.text}`}>
                                    <StatusIcon className="w-3 h-3" />
                                    {config.label}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {session.lesson.module.title}
                                  {session.lesson.module.weekNumber && ` (Week ${session.lesson.module.weekNumber})`}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                  {session.scheduledTime && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5" />
                                      {formatTime(session.scheduledTime)}
                                    </span>
                                  )}
                                  {session.lesson.durationMins && (
                                    <span>{session.lesson.durationMins} min</span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5" />
                                    {session._count.attendance} / {cohort.learners.length} attendance
                                  </span>
                                </div>
                              </div>
                              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Session Modal */}
      <CreateSessionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateSession}
        lessons={lessons}
        existingSessionLessonIds={existingSessionLessonIds}
      />
    </div>
  );
}
