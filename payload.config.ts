import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { PayloadUsers } from './src/payload/collections/PayloadUsers'
import { Courses } from './src/payload/collections/Courses'
import { Modules } from './src/payload/collections/Modules'
import { Lessons } from './src/payload/collections/Lessons'
import { Handbooks } from './src/payload/collections/Handbooks'
import { Media } from './src/payload/collections/Media'
import path from 'path'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_PAYLOAD_URL ?? 'http://localhost:3000',
  admin: {
    user: 'payload-users',
    importMap: {
      baseDir: path.resolve(dirname),
    },
    livePreview: {
      url: ({ data, collectionConfig }) => {
        const baseUrl = process.env.NEXT_PUBLIC_PAYLOAD_URL || 'http://localhost:3000';
        if (collectionConfig?.slug === 'lessons') {
          return `${baseUrl}/lessons/${data.id}`;
        }
        if (collectionConfig?.slug === 'courses') {
          return `${baseUrl}/courses/${data.slug || ''}`;
        }
        return baseUrl;
      },
      collections: ['lessons', 'courses'],
      breakpoints: [
        { name: 'mobile', label: 'Mobile', width: 375, height: 667 },
        { name: 'tablet', label: 'Tablet', width: 768, height: 1024 },
        { name: 'desktop', label: 'Desktop', width: 1440, height: 900 },
      ],
    },
  },
  routes: {
    admin: '/cms',
    api: '/api/payload',
  },
  collections: [PayloadUsers, Courses, Modules, Lessons, Handbooks, Media],
  editor: lexicalEditor({}),
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL!,
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
    },
    schemaName: 'payload',
  }),
  secret: (process.env.PAYLOAD_SECRET || (process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('PAYLOAD_SECRET environment variable is required in production'); })()
    : 'default-dev-secret-change-in-production')).replace(/\\n/g, '').trim(),
  typescript: {
    outputFile: process.env.NODE_ENV === 'production'
      ? undefined
      : path.resolve(dirname, 'src/payload/types.ts'),
  },
})
