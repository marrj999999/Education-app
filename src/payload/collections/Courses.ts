import type { CollectionConfig } from 'payload'

export const Courses: CollectionConfig = {
  slug: 'courses',
  access: { read: () => true },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'enabled', 'order'],
    group: 'Content',
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    {
      name: 'shortTitle',
      type: 'text',
      admin: { description: 'Abbreviated name for cards and navigation' },
    },
    { name: 'description', type: 'textarea' },
    {
      name: 'color',
      type: 'select',
      defaultValue: 'green',
      options: [
        { label: 'Green', value: 'green' },
        { label: 'Emerald', value: 'emerald' },
        { label: 'Blue', value: 'blue' },
        { label: 'Purple', value: 'purple' },
        { label: 'Amber', value: 'amber' },
        { label: 'Teal', value: 'teal' },
      ],
      admin: { description: 'Color theme for course cards and navigation' },
    },
    {
      name: 'icon',
      type: 'text',
      admin: { description: 'Icon name from Icons.tsx (e.g. "wrench", "bicycle", "book")' },
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Course cover image for cards and header' },
    },
    { name: 'order', type: 'number', required: true, defaultValue: 0 },
    {
      name: 'duration',
      type: 'text',
      admin: { description: 'Course duration (e.g. "6 weeks", "Reference")' },
    },
    {
      name: 'level',
      type: 'text',
      admin: { description: 'Course level (e.g. "Level 1-3", "All Levels")' },
    },
    {
      name: 'accreditation',
      type: 'text',
      admin: { description: 'Accreditation body (e.g. "OCN")' },
    },
    {
      name: 'enabled',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Whether this course is visible to instructors' },
    },
    {
      name: 'isHandbook',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Render as a handbook with sidebar TOC instead of module/lesson layout' },
    },
    {
      name: 'modules',
      type: 'relationship',
      relationTo: 'modules',
      hasMany: true,
      admin: { description: 'Ordered list of modules in this course' },
    },
  ],
}
