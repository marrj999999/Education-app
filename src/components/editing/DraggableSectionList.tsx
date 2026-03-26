'use client';

import { useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useEditMode } from '@/context/EditModeContext';
import { SectionRenderer } from '@/components/sections/SectionRenderer';
import { SectionZoneHeader } from '@/components/sections/SectionZoneHeader';
import { getZoneLabel } from '@/lib/lesson-layout';
import type { ContentSection } from '@/lib/types/content';
import type { LayoutVersion } from '@/lib/lesson-layout';
import { cn } from '@/lib/utils';

// ============================================================================
// Sortable Section Wrapper
// ============================================================================

interface SortableSectionProps {
  section: ContentSection;
  lessonId: string;
  zoneLabel: string | null;
  isEditing: boolean;
}

function SortableSection({ section, lessonId, zoneLabel, isEditing }: SortableSectionProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group',
        isDragging && 'z-50 opacity-80 shadow-2xl rounded-xl',
      )}
    >
      {zoneLabel && <SectionZoneHeader label={zoneLabel} />}

      <div className="flex items-start gap-0">
        {/* Drag handle — only visible in edit mode */}
        {isEditing && (
          <button
            className={cn(
              'flex-shrink-0 mt-2 p-1.5 rounded-md cursor-grab',
              'text-text-tertiary hover:text-text-secondary hover:bg-surface-hover',
              'opacity-0 group-hover:opacity-100 transition-opacity',
              isDragging && 'cursor-grabbing opacity-100',
            )}
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={18} />
          </button>
        )}

        {/* Section content */}
        <div className="flex-1 min-w-0">
          <SectionRenderer
            section={section}
            lessonId={lessonId}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Draggable Section List
// ============================================================================

interface DraggableSectionListProps {
  sections: ContentSection[];
  lessonId: string;
  layoutVersion: LayoutVersion;
}

export function DraggableSectionList({
  sections,
  lessonId,
  layoutVersion,
}: DraggableSectionListProps) {
  const { isEditing, sectionOrder, reorderSections } = useEditMode();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Order sections based on sectionOrder from context (if editing)
  const orderedSections = useMemo(() => {
    if (!isEditing || sectionOrder.length === 0) return sections;

    const sectionMap = new Map(sections.map((s) => [s.id, s]));
    const ordered: ContentSection[] = [];
    for (const id of sectionOrder) {
      const section = sectionMap.get(id);
      if (section) ordered.push(section);
    }
    return ordered.length === sections.length ? ordered : sections;
  }, [isEditing, sectionOrder, sections]);

  const sectionIds = useMemo(
    () => orderedSections.map((s) => s.id),
    [orderedSections],
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sectionIds.indexOf(active.id as string);
    const newIndex = sectionIds.indexOf(over.id as string);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(sectionIds, oldIndex, newIndex);
    reorderSections(newOrder);
  }

  if (!isEditing) {
    // Not editing — render without drag context for zero overhead
    return (
      <div className="space-y-6">
        {orderedSections.map((section, index) => {
          const zoneLabel = getZoneLabel(orderedSections, index, layoutVersion);
          return (
            <div key={section.id}>
              {zoneLabel && <SectionZoneHeader label={zoneLabel} />}
              <SectionRenderer
                section={section}
                lessonId={lessonId}
              />
            </div>
          );
        })}
      </div>
    );
  }

  // Edit mode — wrap with DndContext for drag-and-drop
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sectionIds}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-6">
          {orderedSections.map((section, index) => {
            const zoneLabel = getZoneLabel(orderedSections, index, layoutVersion);
            return (
              <SortableSection
                key={section.id}
                section={section}
                lessonId={lessonId}
                zoneLabel={zoneLabel}
                isEditing={isEditing}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
