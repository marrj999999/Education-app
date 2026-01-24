# Bamboo Instructor Dashboard

A Next.js-powered instructor portal for Bamboo Bicycle Club courses, with Notion CMS integration.

## Prerequisites

- Node.js 20+ (see `.nvmrc`)
- PostgreSQL database
- Notion integration token

## Environment Setup

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

Required variables:
- `NOTION_API_KEY` - Notion integration token
- `NOTION_COURSE_NAV_ID` - Course navigation page ID
- `NOTION_DATABASE_ID` - Main database ID
- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_SECRET` - NextAuth secret (generate with `openssl rand -base64 32`)
- `REVALIDATE_SECRET` - Webhook/health check secret

## Getting Started

First, install dependencies and set up the database:

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed  # Optional: seed with test data
```

Then run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## API Endpoints

### Health Check

Check Notion API connectivity:

```bash
curl "http://localhost:3000/api/health/notion?secret=YOUR_REVALIDATE_SECRET"
```

Response:
```json
{
  "ok": true,
  "timestamp": "2026-01-20T00:00:00.000Z",
  "notion": {
    "connected": true,
    "databaseAccessible": true
  }
}
```

### Cache Revalidation

Trigger cache refresh (useful for Notion webhooks):

```bash
# Revalidate all caches
curl "http://localhost:3000/api/revalidate?secret=YOUR_REVALIDATE_SECRET"

# Revalidate specific tag
curl "http://localhost:3000/api/revalidate?secret=YOUR_REVALIDATE_SECRET&tag=lesson"

# Revalidate specific path
curl "http://localhost:3000/api/revalidate?secret=YOUR_REVALIDATE_SECRET&path=/lessons/abc123"
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
