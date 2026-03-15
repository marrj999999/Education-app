import type { CollectionConfig } from 'payload'

export const PayloadUsers: CollectionConfig = {
  slug: 'payload-users',
  admin: { useAsTitle: 'email' },
  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'role',
      type: 'select',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Instructor', value: 'instructor' },
      ],
      defaultValue: 'instructor',
    },
  ],
}
