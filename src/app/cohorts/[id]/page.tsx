'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  ChevronRight,
  Play,
  ClipboardCheck,
  BookOpen,
  TrendingUp,
  AlertCircle,
  UserPlus,
  CalendarPlus,
} from 'lucide-react';

interface CohortDetails {
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
    modules: {
      id: string;
      title: string;
      sortOrder: number;
      weekNumber: number | null;
      lessons: {
        id: string;
        title: string;
        sortOrder: number;
        durationMins: number | null;
        ocnCriteria: string[];
      }[];
    }[];
  };
  instructors: {
    role: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  }[];
  learners: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
  }[];
  sessions: {
    id: string;
    lessonId: string;
    scheduledDate: string;
    status: string;
    lesson: {
      title: string;
    };
  }[];
}

const statusColors: Record<string, { bg: string; text: string; solid: string }> = {
  DRAFT: { bg: 'bg-surface-hover', text: 'text-text-secondary', solid: 'bg-text-secondary' },
  SCHEDULED: { bg: 'bg-info-light', text: 'text-info-dark', solid: 'bg-info' },
  IN_PROGRESS: { bg: 'bg-success-light', text: 'text-success-dark', solid: 'bg-success' },
  COMPLETED: { bg: 'bg-assess-light', text: 'text-assess-dark', solid: 'bg-assess' },
  CANCELLED: { bg: 'bg-danger-light', text: 'text-danger-dark', solid: 'bg-danger' },
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export default function CohortDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [cohort, setCohort] = useState<CohortDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCohort = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/cohorts/${id}`);
      const data = await response.json();

      if (response.ok) {
        setCohort(data);
      } else {
        setError(data.error || 'Failed to load cohort');
      }
    } catch (err) {
      setError('Failed to load cohort');
      console.error('Error fetching cohort:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCohort();
  }, [fetchCohort]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-hover flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-teal border-t-transparent rounded-full animate-spin" />
          <p className="mt-2 text-text-tertiary">Loading cohort...</p>
        </div>
      </div>
    );
  }

  if (error || !cohort) {
    return (
      <div className="min-h-screen bg-surface-hover flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-danger mb-4" />
          <p className="text-text-tertiary">{error || 'Cohort not found'}</p>
          <Link href="/cohorts">
            <Button variant="outline" className="mt-4">Back to Cohorts</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalLessons = cohort.course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const completedSessions = cohort.sessions.filter(s => s.status === 'COMPLETED').length;
  const progressPercentage = totalLessons > 0 ? Math.round((completedSessions / totalLessons) * 100) : 0;

  // Get upcoming sessions
  const upcomingSessions = cohort.sessions
    .filter(s => s.status === 'SCHEDULED' && new Date(s.scheduledDate) >= new Date())
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    .slice(0, 3);

  // Get next session to run
  const nextSession = upcomingSessions[0];

  // Determine what actions are needed
  const needsLearners = cohort.learners.length === 0;
  const needsSessions = cohort.sessions.length === 0;
  const hasUpcomingSession = upcomingSessions.length > 0;

  return (
    <div className="min-h-screen bg-surface-hover">
      {/* Hero Section */}
      <div className={`${statusColors[cohort.status].solid} text-white`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <Breadcrumb className="mb-6">
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
                <BreadcrumbPage className="text-white">{cohort.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-xs px-3 py-1 rounded-full bg-white/20 backdrop-blur`}>
                  {statusLabels[cohort.status]}
                </span>
                <span className="text-white/70 text-sm">{cohort.code}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{cohort.name}</h1>
              <p className="text-white/80 text-lg">{cohort.course.title}</p>

              <div className="flex flex-wrap items-center gap-4 mt-4 text-white/70 text-sm">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formatDate(cohort.startDate)}
                  {cohort.endDate && ` - ${formatDate(cohort.endDate)}`}
                </span>
                {cohort.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {cohort.location}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{cohort.learners.length}</p>
                <p className="text-white/70 text-sm">Learners</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{completedSessions}/{totalLessons}</p>
                <p className="text-white/70 text-sm">Sessions</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{progressPercentage}%</p>
                <p className="text-white/70 text-sm">Complete</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions - Show what to do next */}
        {(needsLearners || needsSessions || hasUpcomingSession) && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-text-primary mb-4">What to do next</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {needsLearners && (
                <Card className="border-warning-medium bg-warning-light/50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-warning-light flex items-center justify-center flex-shrink-0">
                        <UserPlus className="w-5 h-5 text-warning" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-text-primary mb-1">Add your learners</h3>
                        <p className="text-sm text-text-secondary mb-3">
                          Start by enrolling learners in this cohort so you can track their progress.
                        </p>
                        <Link href={`/cohorts/${id}/learners`}>
                          <Button size="sm">
                            <UserPlus className="w-4 h-4 mr-1.5" />
                            Add Learners
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {needsSessions && !needsLearners && (
                <Card className="border-info-medium bg-info-light/50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-info-light flex items-center justify-center flex-shrink-0">
                        <CalendarPlus className="w-5 h-5 text-info" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-text-primary mb-1">Schedule your sessions</h3>
                        <p className="text-sm text-text-secondary mb-3">
                          Plan your course delivery by scheduling sessions for each lesson.
                        </p>
                        <Link href={`/cohorts/${id}/sessions`}>
                          <Button size="sm">
                            <CalendarPlus className="w-4 h-4 mr-1.5" />
                            Schedule Sessions
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {nextSession && (
                <Card className="border-success-medium bg-success-light/50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-success-light flex items-center justify-center flex-shrink-0">
                        <Play className="w-5 h-5 text-success" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-text-primary mb-1">Next session</h3>
                        <p className="text-sm text-text-secondary mb-1">{nextSession.lesson.title}</p>
                        <p className="text-xs text-text-tertiary mb-3">{formatDateShort(nextSession.scheduledDate)}</p>
                        <Link href={`/cohorts/${id}/sessions/${nextSession.lessonId}`}>
                          <Button size="sm">
                            <Play className="w-4 h-4 mr-1.5" />
                            Start Session
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Course Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-success" />
                  Course Progress
                </CardTitle>
                <CardDescription>
                  Track your cohort&apos;s journey through the curriculum
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-text-secondary">Overall completion</span>
                    <span className="font-medium">{progressPercentage}%</span>
                  </div>
                  <Progress value={progressPercentage} className="h-3" />
                </div>

                <div className="space-y-4">
                  {cohort.course.modules.map((module) => {
                    const moduleLessons = module.lessons.length;
                    const moduleCompleted = module.lessons.filter(lesson =>
                      cohort.sessions.some(s => s.lessonId === lesson.id && s.status === 'COMPLETED')
                    ).length;
                    const moduleProgress = moduleLessons > 0 ? Math.round((moduleCompleted / moduleLessons) * 100) : 0;

                    return (
                      <div key={module.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-text-tertiary" />
                            <span className="font-medium text-text-primary">{module.title}</span>
                            {module.weekNumber && (
                              <span className="text-xs text-text-tertiary">Week {module.weekNumber}</span>
                            )}
                          </div>
                          <span className="text-sm text-text-tertiary">{moduleCompleted}/{moduleLessons}</span>
                        </div>
                        <Progress value={moduleProgress} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Coming Up */}
            {upcomingSessions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-info" />
                    Coming Up
                  </CardTitle>
                  <CardDescription>
                    Your scheduled sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingSessions.map((session) => (
                      <Link
                        key={session.id}
                        href={`/cohorts/${id}/sessions/${session.lessonId}`}
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-surface-hover transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-info-light flex flex-col items-center justify-center">
                            <span className="text-xs text-info font-medium">
                              {new Date(session.scheduledDate).toLocaleDateString('en-GB', { weekday: 'short' })}
                            </span>
                            <span className="text-lg font-bold text-info-dark">
                              {new Date(session.scheduledDate).getDate()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-text-primary">{session.lesson.title}</p>
                            <p className="text-sm text-text-tertiary">{formatDateShort(session.scheduledDate)}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-text-tertiary group-hover:text-text-secondary" />
                      </Link>
                    ))}
                  </div>
                  <Link href={`/cohorts/${id}/sessions`}>
                    <Button variant="outline" className="w-full mt-4">
                      View all sessions
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle>Manage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href={`/cohorts/${id}/learners`} className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-hover transition-colors group">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-text-tertiary" />
                    <div>
                      <p className="font-medium text-text-primary">Learners</p>
                      <p className="text-sm text-text-tertiary">{cohort.learners.length} enrolled</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-text-tertiary group-hover:text-text-secondary" />
                </Link>

                <Link href={`/cohorts/${id}/sessions`} className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-hover transition-colors group">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-text-tertiary" />
                    <div>
                      <p className="font-medium text-text-primary">Sessions</p>
                      <p className="text-sm text-text-tertiary">{cohort.sessions.length} scheduled</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-text-tertiary group-hover:text-text-secondary" />
                </Link>

                <Link href={`/cohorts/${id}/assessments`} className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-hover transition-colors group">
                  <div className="flex items-center gap-3">
                    <ClipboardCheck className="w-5 h-5 text-text-tertiary" />
                    <div>
                      <p className="font-medium text-text-primary">Assessments</p>
                      <p className="text-sm text-text-tertiary">Track criteria</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-text-tertiary group-hover:text-text-secondary" />
                </Link>

                <Link href={`/cohorts/${id}/iqa`} className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-hover transition-colors group">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-text-tertiary" />
                    <div>
                      <p className="font-medium text-text-primary">IQA</p>
                      <p className="text-sm text-text-tertiary">Quality assurance</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-text-tertiary group-hover:text-text-secondary" />
                </Link>
              </CardContent>
            </Card>

            {/* Instructors */}
            <Card>
              <CardHeader>
                <CardTitle>Instructors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cohort.instructors.map((instructor) => (
                    <div key={instructor.user.id} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-teal flex items-center justify-center text-white font-medium">
                        {(instructor.user.name || instructor.user.email)[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary truncate">
                          {instructor.user.name || 'No name'}
                        </p>
                        <p className="text-sm text-text-tertiary truncate">{instructor.role}</p>
                      </div>
                    </div>
                  ))}
                  {cohort.instructors.length === 0 && (
                    <p className="text-sm text-text-tertiary">No instructors assigned</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Learner Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Learner Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center mb-4">
                  <div className="relative w-24 h-24">
                    <svg className="w-24 h-24 transform -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-surface-active"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${(cohort.learners.length / cohort.maxLearners) * 251.2} 251.2`}
                        className="text-teal"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <span className="text-2xl font-bold text-text-primary">{cohort.learners.length}</span>
                        <span className="text-text-tertiary">/{cohort.maxLearners}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-center text-sm text-text-secondary">
                  {cohort.maxLearners - cohort.learners.length} spots remaining
                </p>
                <Link href={`/cohorts/${id}/learners`}>
                  <Button variant="outline" className="w-full mt-4" size="sm">
                    Manage Learners
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
