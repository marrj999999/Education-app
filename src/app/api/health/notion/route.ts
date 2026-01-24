import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

// Secret token for health check (reuse REVALIDATE_SECRET for simplicity)
const HEALTH_SECRET = process.env.REVALIDATE_SECRET;

// Notion client for health check only
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
  timeoutMs: 10000, // 10 second timeout for health checks
});

// Database ID to check (use configured or default)
const DATABASE_ID = process.env.NOTION_DATABASE_ID || '1c84c6153ed980209372d89b6724ce6e';

interface HealthResponse {
  ok: boolean;
  timestamp: string;
  notion?: {
    connected: boolean;
    databaseAccessible: boolean;
  };
  error?: string;
}

/**
 * GET /api/health/notion
 *
 * Health check endpoint for Notion API connectivity.
 * Returns minimal safe metadata - no secrets exposed.
 *
 * Query params:
 * - secret: Required authentication token (uses REVALIDATE_SECRET)
 *
 * Response:
 * - 200: { ok: true, notion: { connected: true, databaseAccessible: true } }
 * - 401: Unauthorized (missing or invalid secret)
 * - 503: Notion API unavailable
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const secret = searchParams.get('secret');

  // SECURITY: Require secret to prevent abuse
  if (!HEALTH_SECRET || secret !== HEALTH_SECRET) {
    return NextResponse.json(
      { ok: false, timestamp: new Date().toISOString(), error: 'Unauthorized' } satisfies HealthResponse,
      { status: 401 }
    );
  }

  const response: HealthResponse = {
    ok: false,
    timestamp: new Date().toISOString(),
  };

  try {
    // Check 1: Can we reach Notion API?
    // Retrieve database metadata (lightweight call)
    const database = await notion.databases.retrieve({
      database_id: DATABASE_ID,
    });

    // Check 2: Did we get a valid response?
    const isConnected = !!database.id;
    const isDatabaseAccessible = database.id === DATABASE_ID.replace(/-/g, '');

    response.ok = isConnected && isDatabaseAccessible;
    response.notion = {
      connected: isConnected,
      databaseAccessible: isDatabaseAccessible,
    };

    return NextResponse.json(response, { status: response.ok ? 200 : 503 });
  } catch (error) {
    // Log error server-side (no secrets in logs)
    console.error('[Health Check] Notion API error:', error instanceof Error ? error.message : 'Unknown error');

    response.ok = false;
    response.notion = {
      connected: false,
      databaseAccessible: false,
    };
    response.error = 'Notion API unreachable';

    return NextResponse.json(response, { status: 503 });
  }
}
