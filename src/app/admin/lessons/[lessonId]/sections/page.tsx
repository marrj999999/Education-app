'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronLeft, GripVertical, Save, RotateCcw, Loader2 } from 'lucide-react';
import type { ContentSection } from '@/lib/types/content';

// Section type icons for visual identification
const sectionTypeLabels: Record<string, { label: string; color: string }> = {
  'teaching-step': { label: 'Teaching Step', color: 'bg-green-100 text-green-800' },
  'safety': { label: 'Safety', color: 'bg-red-100 text-red-800' },
  'checklist': { label: 'Checklist', color: 'bg-blue-100 text-blue-800' },
  'timeline': { label: 'Timeline', color: 'bg-purple-100 text-purple-800' },
  'checkpoint': { label: 'Checkpoint', color: 'bg-amber-100 text-amber-800' },
  'outcomes': { label: 'Outcomes', color: 'bg-teal-100 text-teal-800' },
  'vocabulary': { label: 'Vocabulary', color: 'bg-indigo-100 text-indigo-800' },
  'resource': { label: 'Resource', color: 'bg-pink-100 text-pink-800' },
  'prose': { label: 'Content', color: 'bg-gray-100 text-gray-800' },
  'heading': { label: 'Heading', color: 'bg-slate-100 text-slate-800' },
};

function getSectionTitle(section: ContentSection): string {
  if ('title' in section && section.title) {
    return section.title;
  }
  if ('text' in section && typeof section.text === 'string') {
    return section.text.slice(0, 50) + (section.text.length > 50 ? '...' : '');
  }
  if ('content' in section && typeof section.content === 'string') {
    return section.content.slice(0, 50) + (section.content.length > 50 ? '...' : '');
  }
  if (section.type === 'teaching-step' && 'stepNumber' in section) {
    return `Step ${section.stepNumber}`;
  }
  return `Section (${section.type})`;
}

interface SortableSectionProps {
  section: ContentSection;
  index: number;
}

function SortableSection({ section, index }: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const typeInfo = sectionTypeLabels[section.type] || {
    label: section.type,
    color: 'bg-gray-100 text-gray-800',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg ${
        isDragging ? 'shadow-lg ring-2 ring-green-500 opacity-90' : 'hover:border-gray-300'
      }`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
      >
        <GripVertical size={20} />
      </button>

      {/* Order number */}
      <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-600 text-sm font-medium rounded-full">
        {index + 1}
      </span>

      {/* Section type badge */}
      <span className={`flex-shrink-0 px-2 py-1 text-xs font-medium rounded ${typeInfo.color}`}>
        {typeInfo.label}
      </span>

      {/* Section title */}
      <span className="flex-1 text-sm text-gray-900 truncate">
        {getSectionTitle(section)}
      </span>
    </div>
  );
}

interface LessonData {
  page: {
    title: string;
    icon?: string;
  };
  sections: ContentSection[];
}

export default function SectionOrderPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.lessonId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lessonData, setLessonData] = useState<LessonData | null>(null);
  const [sections, setSections] = useState<ContentSection[]>([]);
  const [hasCustomOrder, setHasCustomOrder] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // DnD sensors for keyboard and pointer support
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch lesson sections
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Fetch lesson sections (will already have custom order applied if exists)
        const sectionsRes = await fetch(`/api/lessons/${lessonId}/sections`);
        if (!sectionsRes.ok) {
          throw new Error('Failed to fetch lesson');
        }
        const sectionsData = await sectionsRes.json();

        // Check if there's a custom order
        const orderRes = await fetch(`/api/admin/lessons/${lessonId}/section-order`);
        const orderData = await orderRes.json();

        setLessonData(sectionsData);
        setSections(sectionsData.sections);
        setHasCustomOrder(orderData.hasCustomOrder || false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [lessonId]);

  // Handle drag end
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        setHasChanges(true);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  // Save custom order
  async function handleSave() {
    try {
      setSaving(true);
      setError(null);

      const sectionIds = sections.map((s) => s.id);

      const res = await fetch(`/api/admin/lessons/${lessonId}/section-order`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionIds }),
      });

      if (!res.ok) {
        throw new Error('Failed to save section order');
      }

      setHasChanges(false);
      setHasCustomOrder(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  // Reset to default order
  async function handleReset() {
    try {
      setSaving(true);
      setError(null);

      const res = await fetch(`/api/admin/lessons/${lessonId}/section-order`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to reset section order');
      }

      // Refetch to get default order
      const sectionsRes = await fetch(`/api/lessons/${lessonId}/sections`);
      const sectionsData = await sectionsRes.json();

      setSections(sectionsData.sections);
      setHasChanges(false);
      setHasCustomOrder(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (error && !lessonData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-700">Error: {error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 text-sm text-red-600 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <Link
          href="/admin/courses"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ChevronLeft size={16} />
          Back to Courses
        </Link>
        <div className="flex items-center gap-3">
          {lessonData?.page.icon && (
            <span className="text-2xl">{lessonData.page.icon}</span>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Section Order
            </h1>
            <p className="text-gray-500 mt-1">
              {lessonData?.page.title}
            </p>
          </div>
        </div>
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-3">
        {hasCustomOrder && (
          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
            Custom Order
          </span>
        )}
        {hasChanges && (
          <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded">
            Unsaved Changes
          </span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Save Order
        </button>
        {hasCustomOrder && (
          <button
            onClick={handleReset}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RotateCcw size={16} />
            Reset to Default
          </button>
        )}
      </div>

      {/* Sortable sections list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <p className="text-sm text-gray-500 mb-4">
          Drag sections to reorder. Changes apply to all viewing modes (teach, prep, presentation).
        </p>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sections.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {sections.map((section, index) => (
                <SortableSection
                  key={section.id}
                  section={section}
                  index={index}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {sections.length === 0 && (
          <p className="text-center text-gray-400 py-8">
            No sections found in this lesson.
          </p>
        )}
      </div>

      {/* Help text */}
      <div className="text-sm text-gray-500 space-y-2">
        <p>
          <strong>Note:</strong> Custom ordering is stored separately from Notion content.
          Syncing from Notion will not affect your custom order.
        </p>
        <p>
          New sections added in Notion will appear at the end of the list.
        </p>
      </div>
    </div>
  );
}
