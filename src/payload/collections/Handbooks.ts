import type { CollectionConfig } from 'payload'

export const Handbooks: CollectionConfig = {
  slug: 'handbooks',
  access: { read: () => true },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'chapter', 'order'],
    group: 'Content',
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    {
      name: 'chapter',
      type: 'text',
      admin: { description: 'Chapter grouping name (e.g. "Introduction", "Frame Building")' },
    },
    {
      name: 'section',
      type: 'text',
      admin: { description: 'Section number (e.g. "1.0", "1.1", "2.0")' },
    },
    {
      name: 'icon',
      type: 'text',
      admin: { description: 'Emoji icon for this handbook section' },
    },
    {
      name: 'pageRange',
      type: 'text',
      admin: { description: 'Page range reference (e.g. "pp. 1-5")' },
    },
    {
      name: 'estTime',
      type: 'text',
      admin: { description: 'Estimated reading time (e.g. "3 min")' },
    },
    {
      name: 'hasVideo',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Whether this section has video content' },
    },
    { name: 'order', type: 'number', defaultValue: 0 },
    {
      name: 'content',
      type: 'richText',
      admin: { description: 'Main handbook content — rich text with images' },
    },
    {
      name: 'images',
      type: 'array',
      admin: { description: 'Gallery images for this handbook section' },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        { name: 'caption', type: 'text' },
      ],
    },
  ],
}
