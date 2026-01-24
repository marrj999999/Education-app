'use client';

import { useState, useEffect, useCallback, use, useRef } from 'react';
import Link from 'next/link';
import { LearnerTable, EnrichedLearner } from '@/components/cohorts/LearnerTable';
import { AddLearnerModal, LearnerFormData } from '@/components/cohorts/AddLearnerModal';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Users,
  UserPlus,
  Upload,
  Download,
  ArrowLeft,
  AlertCircle,
  UserCheck,
  UserX,
  TrendingUp,
} from 'lucide-react';

interface CohortInfo {
  id: string;
  name: string;
  code: string;
  maxLearners: number;
}

export default function LearnersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [cohort, setCohort] = useState<CohortInfo | null>(null);
  const [learners, setLearners] = useState<EnrichedLearner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<EnrichedLearner | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [cohortRes, learnersRes] = await Promise.all([
        fetch(`/api/cohorts/${id}`),
        fetch(`/api/cohorts/${id}/learners`),
      ]);

      if (!cohortRes.ok) {
        throw new Error('Failed to load cohort');
      }
      if (!learnersRes.ok) {
        throw new Error('Failed to load learners');
      }

      const cohortData = await cohortRes.json();
      const learnersData = await learnersRes.json();

      setCohort({
        id: cohortData.id,
        name: cohortData.name,
        code: cohortData.code,
        maxLearners: cohortData.maxLearners,
      });
      setLearners(learnersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddLearner = async (data: LearnerFormData) => {
    const response = await fetch(`/api/cohorts/${id}/learners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to add learner');
    }

    await fetchData();
  };

  const handleStatusChange = async (learner: EnrichedLearner, newStatus: EnrichedLearner['status']) => {
    try {
      const response = await fetch(`/api/cohorts/${id}/learners/${learner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      setLearners((prev) =>
        prev.map((l) => (l.id === learner.id ? { ...l, status: newStatus } : l))
      );
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDelete = async (learner: EnrichedLearner) => {
    try {
      const response = await fetch(`/api/cohorts/${id}/learners/${learner.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete learner');
      }

      setLearners((prev) => prev.filter((l) => l.id !== learner.id));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete learner:', err);
    }
  };

  const handleExportCSV = () => {
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'OCN Learner ID', 'Status', 'Attendance %', 'Progress %'];
    const rows = learners.map((l) => [
      l.firstName,
      l.lastName,
      l.email,
      l.phone || '',
      l.ocnLearnerId || '',
      l.status,
      l.attendanceRate?.toString() || '',
      l.assessmentProgress?.toString() || '',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cohort?.code || 'cohort'}-learners.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split('\n').slice(1); // Skip header
    const errors: string[] = [];
    let successCount = 0;

    for (const line of lines) {
      if (!line.trim()) continue;

      const parts = line.split(',').map((p) => p.replace(/^"|"$/g, '').trim());
      const [firstName, lastName, email, phone, ocnLearnerId] = parts;

      if (!firstName || !lastName || !email) {
        errors.push(`Invalid row: ${line}`);
        continue;
      }

      try {
        const response = await fetch(`/api/cohorts/${id}/learners`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstName, lastName, email, phone: phone || undefined, ocnLearnerId: ocnLearnerId || undefined }),
        });

        if (response.ok) {
          successCount++;
        } else {
          const err = await response.json();
          errors.push(`${email}: ${err.error}`);
        }
      } catch {
        errors.push(`${email}: Network error`);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    await fetchData();

    if (errors.length > 0) {
      alert(`Imported ${successCount} learners.\n\nErrors:\n${errors.join('\n')}`);
    } else {
      alert(`Successfully imported ${successCount} learners.`);
    }
  };

  // Stats
  const activeCount = learners.filter(l => l.status === 'ACTIVE').length;
  const completedCount = learners.filter(l => l.status === 'COMPLETED').length;
  const withdrawnCount = learners.filter(l => l.status === 'WITHDRAWN').length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-2 text-muted-foreground">Loading learners...</p>
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
                <h1 className="font-bold text-gray-900">Learners</h1>
                <p className="text-xs text-muted-foreground">{cohort.name} ({cohort.code})</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {learners.length} / {cohort.maxLearners} enrolled
              </span>
            </div>
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
                <BreadcrumbLink href="/cohorts" className="text-white/70 hover:text-white">Cohorts</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-white/50" />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/cohorts/${id}`} className="text-white/70 hover:text-white">{cohort.name}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-white/50" />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-white">Learners</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Learners</h1>
              <p className="text-green-100 mt-2">
                Manage your cohort learners
              </p>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-green-100 text-sm">Active</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{completedCount}</p>
                <p className="text-green-100 text-sm">Completed</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{withdrawnCount}</p>
                <p className="text-green-100 text-sm">Withdrawn</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsAddModalOpen(true)}
              disabled={learners.length >= cohort.maxLearners}
              className="gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Add Learner
            </Button>

            <label>
              <Button variant="outline" className="gap-2 cursor-pointer" asChild>
                <span>
                  <Upload className="w-4 h-4" />
                  Import CSV
                </span>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                className="hidden"
              />
            </label>
          </div>

          <Button variant="outline" onClick={handleExportCSV} className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        {/* Learner Table */}
        <Card>
          <CardContent className="pt-6">
            <LearnerTable
              learners={learners}
              onEdit={(learner) => console.log('Edit', learner)}
              onDelete={(learner) => setDeleteConfirm(learner)}
              onStatusChange={handleStatusChange}
            />
          </CardContent>
        </Card>
      </main>

      {/* Add Learner Modal */}
      <AddLearnerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddLearner}
        cohortId={id}
      />

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Learner</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <strong>
                {deleteConfirm?.firstName} {deleteConfirm?.lastName}
              </strong>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
