import type { CollectionConfig } from 'payload'

export const Modules: CollectionConfig = {
  slug: 'modules',
  access: { read: () => true },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'order'],
    group: 'Content',
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true },
    { name: 'order', type: 'number', required: true, defaultValue: 0 },
    {
      name: 'description',
      type: 'textarea',
      admin: { description: 'Optional module description shown on course overview' },
    },
    {
      name: 'icon',
      type: 'text',
      admin: { description: 'Emoji icon for the module (e.g. 📐)' },
    },
    {
      name: 'lessons',
      type: 'relationship',
      relationTo: 'lessons',
      hasMany: true,
      admin: { description: 'Ordered list of lessons in this module' },
    },
  ],
}
