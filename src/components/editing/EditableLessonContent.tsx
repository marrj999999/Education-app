'use client';

import { EditModeProvider } from '@/context/EditModeContext';
import { EditModeToolbar } from '@/components/editing/EditModeToolbar';
import { DraggableSectionList } from '@/components/editing/DraggableSectionList';
import type { ContentSection } from '@/lib/types/content';
import type { LayoutVersion } from '@/lib/lesson-layout';

interface EditableLessonContentProps {
  lessonId: string;
  sections: ContentSection[];
  layoutVersion: LayoutVersion;
}

/**
 * Client component wrapper that provides edit mode functionality
 * for lesson content sections. Wraps the section list with
 * EditModeProvider, enables inline text editing and drag-and-drop
 * reordering, and renders the floating EditModeToolbar.
 *
 * When edit mode is OFF: renders identically to the read-only version.
 * When edit mode is ON: text fields become editable, drag handles appear.
 */
export function EditableLessonContent({
  lessonId,
  sections,
  layoutVersion,
}: EditableLessonContentProps) {
  return (
    <EditModeProvider lessonId={lessonId} initialSections={sections}>
      <DraggableSectionList
        sections={sections}
        lessonId={lessonId}
        layoutVersion={layoutVersion}
      />

      {/* Floating edit toolbar — shows Save/Cancel when in edit mode */}
      <EditModeToolbar />
    </EditModeProvider>
  );
}
