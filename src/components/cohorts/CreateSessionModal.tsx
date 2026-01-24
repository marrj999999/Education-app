'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Clock, Calendar } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  durationMins: number | null;
  moduleTitle: string;
  weekNumber: number | null;
}

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { lessonId: string; scheduledDate: string; scheduledTime?: string }) => Promise<void>;
  lessons: Lesson[];
  existingSessionLessonIds: string[];
}

export function CreateSessionModal({
  isOpen,
  onClose,
  onCreate,
  lessons,
  existingSessionLessonIds,
}: CreateSessionModalProps) {
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLessonId || !scheduledDate) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Combine date and time into ISO string
      const dateTime = scheduledTime
        ? `${scheduledDate}T${scheduledTime}:00.000Z`
        : `${scheduledDate}T09:00:00.000Z`;

      await onCreate({
        lessonId: selectedLessonId,
        scheduledDate: dateTime,
        scheduledTime: scheduledTime || undefined,
      });

      // Reset form
      setSelectedLessonId('');
      setScheduledDate('');
      setScheduledTime('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  // Filter out lessons that already have sessions (optional)
  const availableLessons = lessons.filter((l) => !existingSessionLessonIds.includes(l.id));

  // Group lessons by module
  const lessonsByModule: Record<string, Lesson[]> = {};
  availableLessons.forEach((lesson) => {
    const key = lesson.moduleTitle;
    if (!lessonsByModule[key]) {
      lessonsByModule[key] = [];
    }
    lessonsByModule[key].push(lesson);
  });

  const selectedLesson = lessons.find((l) => l.id === selectedLessonId);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule New Session</DialogTitle>
          <DialogDescription>
            Schedule a session for this cohort. Select a lesson and set the date and time.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Lesson Selection - using native select for optgroup support */}
          <div className="space-y-2">
            <Label htmlFor="lesson">
              Lesson <span className="text-destructive">*</span>
            </Label>
            <select
              id="lesson"
              required
              value={selectedLessonId}
              onChange={(e) => setSelectedLessonId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            >
              <option value="">Select a lesson...</option>
              {Object.entries(lessonsByModule).map(([moduleName, moduleLessons]) => (
                <optgroup key={moduleName} label={moduleName}>
                  {moduleLessons.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.title}
                      {lesson.durationMins && ` (${lesson.durationMins} min)`}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {availableLessons.length === 0 && (
              <p className="text-xs text-amber-600">
                All lessons already have scheduled sessions.
              </p>
            )}
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label htmlFor="date">
              Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="date"
              type="date"
              required
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <Label htmlFor="time">Time (optional)</Label>
            <Input
              id="time"
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
            />
          </div>

          {/* Selected Lesson Info */}
          {selectedLesson && (
            <div className="bg-muted rounded-lg p-3">
              <p className="text-sm font-medium">{selectedLesson.title}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedLesson.moduleTitle}
                {selectedLesson.weekNumber && ` (Week ${selectedLesson.weekNumber})`}
              </p>
              {selectedLesson.durationMins && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  Duration: {selectedLesson.durationMins} minutes
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !selectedLessonId || !scheduledDate}
            >
              {isSubmitting ? 'Creating...' : 'Create Session'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
