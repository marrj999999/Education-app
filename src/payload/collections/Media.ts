import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: { read: () => true },
  admin: {
    group: 'Content',
  },
  upload: {
    mimeTypes: ['image/*', 'application/pdf', 'video/*'],
  },
  fields: [
    { name: 'alt', type: 'text', admin: { description: 'Alt text for accessibility' } },
    {
      name: 'caption',
      type: 'text',
      admin: { description: 'Optional caption displayed below the media' },
    },
  ],
}
