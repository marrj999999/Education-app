import type { CollectionConfig } from 'payload'

export const Lessons: CollectionConfig = {
  slug: 'lessons',
  access: { read: () => true },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'module', 'order'],
    group: 'Content',
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true },
    {
      name: 'module',
      type: 'relationship',
      relationTo: 'modules',
      required: true,
    },
    { name: 'order', type: 'number', required: true, defaultValue: 0 },
    {
      name: 'icon',
      type: 'text',
      admin: { description: 'Emoji icon for the lesson (e.g. 🔧)' },
    },
    {
      name: 'layoutVersion',
      type: 'select',
      defaultValue: 'standard-v1',
      options: [
        { label: 'Standard Instructor', value: 'standard-v1' },
        { label: 'Multi-Day Practical', value: 'multi-day-v1' },
        { label: 'Legacy (original order)', value: 'legacy' },
      ],
      admin: {
        description: 'Layout template — controls section ordering on frontend. Does not change content.',
        position: 'sidebar',
      },
    },
    {
      name: 'ocnUnitRef',
      type: 'text',
      admin: { description: 'OCN unit reference (e.g. QUF546)', position: 'sidebar' },
    },
    {
      name: 'ocnLevel',
      type: 'select',
      options: [
        { label: 'Level 1', value: '1' },
        { label: 'Level 2', value: '2' },
        { label: 'Level 3', value: '3' },
      ],
      admin: { description: 'OCN qualification level', position: 'sidebar' },
    },
    {
      name: 'guidedLearningHours',
      type: 'number',
      admin: { description: 'Guided Learning Hours for this lesson', position: 'sidebar' },
    },
    {
      name: 'duration',
      type: 'text',
      admin: { description: 'Estimated lesson duration (e.g. "45 min")' },
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Cover image displayed at top of lesson page' },
    },

    // =========================================================================
    // Structured Content Sections
    // =========================================================================
    // Each section type maps to a ContentSection type in src/lib/types/content.ts.
    // Lessons are composed of an ordered array of these sections.
    // The `sections` field is the primary content field — it replaces both the
    // Lexical richText `content` field and the legacy block parser.
    // =========================================================================

    {
      name: 'sections',
      type: 'blocks',
      admin: {
        description: 'Lesson content sections — add and reorder blocks to build the lesson.',
      },
      blocks: [
        // --- Heading Block ---
        {
          slug: 'heading',
          labels: { singular: 'Heading', plural: 'Headings' },
          fields: [
            {
              name: 'level',
              type: 'select',
              required: true,
              defaultValue: '2',
              options: [
                { label: 'H1 — Page Title', value: '1' },
                { label: 'H2 — Section Heading', value: '2' },
                { label: 'H3 — Subsection', value: '3' },
              ],
            },
            { name: 'text', type: 'text', required: true },
          ],
        },

        // --- Prose Block (rich text) ---
        {
          slug: 'prose',
          labels: { singular: 'Prose / Rich Text', plural: 'Prose Blocks' },
          fields: [
            {
              name: 'content',
              type: 'richText',
              required: true,
              admin: {
                description: 'Rich text content — paragraphs, lists, links, images, etc.',
              },
            },
          ],
        },

        // --- Timeline / Schedule ---
        {
          slug: 'timeline',
          labels: { singular: 'Timeline / Schedule', plural: 'Timelines' },
          fields: [
            { name: 'title', type: 'text', admin: { description: 'Optional heading for this timeline' } },
            {
              name: 'rows',
              type: 'array',
              required: true,
              minRows: 1,
              admin: { description: 'Schedule rows — time, activity, duration, notes' },
              fields: [
                { name: 'time', type: 'text', required: true, admin: { width: '20%' } },
                { name: 'activity', type: 'text', required: true, admin: { width: '40%' } },
                { name: 'duration', type: 'text', required: true, admin: { width: '20%' } },
                { name: 'notes', type: 'text', admin: { width: '20%' } },
              ],
            },
          ],
        },

        // --- Checklist ---
        {
          slug: 'checklist',
          labels: { singular: 'Checklist', plural: 'Checklists' },
          fields: [
            { name: 'title', type: 'text', required: true },
            {
              name: 'category',
              type: 'select',
              required: true,
              defaultValue: 'materials',
              options: [
                { label: 'Materials', value: 'materials' },
                { label: 'Tools', value: 'tools' },
                { label: 'Equipment', value: 'equipment' },
                { label: 'Preparation', value: 'preparation' },
              ],
            },
            {
              name: 'items',
              type: 'array',
              required: true,
              minRows: 1,
              fields: [
                { name: 'text', type: 'text', required: true },
                { name: 'quantity', type: 'text', admin: { description: 'e.g. "2x", "500ml"' } },
              ],
            },
          ],
        },

        // --- Safety Note ---
        {
          slug: 'safety',
          labels: { singular: 'Safety Note', plural: 'Safety Notes' },
          fields: [
            {
              name: 'level',
              type: 'select',
              required: true,
              defaultValue: 'warning',
              options: [
                { label: '🔴 Critical — Must not proceed without', value: 'critical' },
                { label: '🟡 Warning — Important safety info', value: 'warning' },
                { label: '🟢 Caution — Good practice reminder', value: 'caution' },
              ],
            },
            { name: 'title', type: 'text', admin: { description: 'Optional title for this safety note' } },
            { name: 'content', type: 'textarea', required: true },
            {
              name: 'items',
              type: 'array',
              admin: { description: 'Bullet points (optional)' },
              fields: [
                { name: 'text', type: 'text', required: true },
              ],
            },
          ],
        },

        // --- Teaching Step ---
        {
          slug: 'teachingStep',
          labels: { singular: 'Teaching Step', plural: 'Teaching Steps' },
          fields: [
            { name: 'stepNumber', type: 'number', required: true, min: 1 },
            { name: 'title', type: 'text' },
            { name: 'instruction', type: 'textarea', required: true },
            { name: 'duration', type: 'text', admin: { description: 'e.g. "15 min"' } },
            { name: 'teachingApproach', type: 'textarea', admin: { description: 'Notes on how to deliver this step' } },
            { name: 'differentiation', type: 'textarea', admin: { description: 'Guidance for different learner levels' } },
            {
              name: 'paragraphs',
              type: 'array',
              admin: { description: 'Additional content paragraphs' },
              fields: [
                { name: 'text', type: 'textarea', required: true },
              ],
            },
            {
              name: 'tips',
              type: 'array',
              admin: { description: 'Instructor tips' },
              fields: [
                { name: 'text', type: 'text', required: true },
              ],
            },
            {
              name: 'warnings',
              type: 'array',
              admin: { description: 'Warning notes for this step' },
              fields: [
                { name: 'text', type: 'text', required: true },
              ],
            },
            {
              name: 'activities',
              type: 'array',
              admin: { description: 'Structured activities within this step' },
              fields: [
                { name: 'text', type: 'text', required: true },
                { name: 'duration', type: 'text' },
              ],
            },
            {
              name: 'resources',
              type: 'array',
              admin: { description: 'Embedded media resources' },
              fields: [
                {
                  name: 'type',
                  type: 'select',
                  required: true,
                  options: [
                    { label: 'Image', value: 'image' },
                    { label: 'Video', value: 'video' },
                    { label: 'File', value: 'file' },
                    { label: 'Embed', value: 'embed' },
                  ],
                },
                { name: 'url', type: 'text', required: true },
                { name: 'title', type: 'text' },
                { name: 'caption', type: 'text' },
              ],
            },
            {
              name: 'tables',
              type: 'array',
              admin: { description: 'Data tables within this step' },
              fields: [
                {
                  name: 'headers',
                  type: 'json',
                  required: true,
                  admin: { description: 'Array of header strings, e.g. ["Material", "Quantity", "Notes"]' },
                },
                {
                  name: 'rows',
                  type: 'json',
                  required: true,
                  admin: { description: 'Array of row arrays, e.g. [["Bamboo", "2m", "Dried"]]' },
                },
              ],
            },
            {
              name: 'quotes',
              type: 'array',
              admin: { description: 'Key scripts or quote blocks' },
              fields: [
                { name: 'text', type: 'textarea', required: true },
              ],
            },
          ],
        },

        // --- Checkpoint / Assessment Criteria ---
        {
          slug: 'checkpoint',
          labels: { singular: 'Checkpoint', plural: 'Checkpoints' },
          fields: [
            { name: 'title', type: 'text', required: true },
            {
              name: 'items',
              type: 'array',
              required: true,
              minRows: 1,
              fields: [
                { name: 'criterion', type: 'text', required: true },
                { name: 'description', type: 'text' },
              ],
            },
          ],
        },

        // --- Learning Outcomes ---
        {
          slug: 'outcomes',
          labels: { singular: 'Learning Outcomes', plural: 'Learning Outcomes' },
          fields: [
            { name: 'title', type: 'text', required: true, defaultValue: 'Learning Outcomes' },
            {
              name: 'items',
              type: 'array',
              required: true,
              minRows: 1,
              fields: [
                { name: 'text', type: 'text', required: true },
              ],
            },
          ],
        },

        // --- Vocabulary ---
        {
          slug: 'vocabulary',
          labels: { singular: 'Vocabulary', plural: 'Vocabulary' },
          fields: [
            {
              name: 'terms',
              type: 'array',
              required: true,
              minRows: 1,
              fields: [
                { name: 'term', type: 'text', required: true },
                { name: 'definition', type: 'textarea', required: true },
              ],
            },
          ],
        },

        // --- Resource / Media Embed ---
        {
          slug: 'resource',
          labels: { singular: 'Resource / Media', plural: 'Resources' },
          fields: [
            {
              name: 'resourceType',
              type: 'select',
              required: true,
              options: [
                { label: 'PDF', value: 'pdf' },
                { label: 'Video', value: 'video' },
                { label: 'Image', value: 'image' },
                { label: 'File', value: 'file' },
              ],
            },
            { name: 'url', type: 'text', required: true },
            { name: 'title', type: 'text' },
            { name: 'caption', type: 'text' },
          ],
        },
      ],
    },

    // =========================================================================
    // Scenario (interactive triggered scenario for teaching)
    // =========================================================================
    {
      name: 'scenario',
      type: 'group',
      admin: {
        description: 'Optional triggered scenario for this lesson',
        condition: (data) => data?.scenario?.enabled,
      },
      fields: [
        { name: 'enabled', type: 'checkbox', defaultValue: false },
        { name: 'triggerField', type: 'text' },
        { name: 'delayMs', type: 'number', defaultValue: 10000 },
        { name: 'title', type: 'text' },
        { name: 'description', type: 'textarea' },
        { name: 'yesLabel', type: 'text' },
        { name: 'noLabel', type: 'text' },
        { name: 'yesCost', type: 'text' },
        { name: 'noCost', type: 'text' },
      ],
    },
  ],
}
