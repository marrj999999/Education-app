import { Client } from '@notionhq/client';
import type { Course } from './types';

/**
 * Notion Client Factory
 *
 * Provides per-course Notion API clients to support multiple workspaces.
 * Clients are cached to avoid creating multiple instances for the same API key.
 */

// Export the client instance type for use in other files
export type NotionClient = InstanceType<typeof Client>;

// Cache clients by API key to avoid creating duplicates
const clientCache = new Map<string, NotionClient>();

/**
 * Get or create a Notion client for a given API key
 */
export function getNotionClient(apiKey: string): Client {
  if (!clientCache.has(apiKey)) {
    clientCache.set(apiKey, new Client({
      auth: apiKey,
      timeoutMs: 30000, // 30 second timeout
    }));
  }
  return clientCache.get(apiKey)!;
}

/**
 * Get the Notion client for a specific course
 * Falls back to NOTION_API_KEY if course doesn't specify notionApiKey
 */
export function getNotionClientForCourse(course: Course): Client {
  const apiKey = course.notionApiKey || process.env.NOTION_API_KEY;
  if (!apiKey) {
    throw new Error(`No Notion API key configured for course: ${course.id}`);
  }
  return getNotionClient(apiKey);
}

/**
 * Get the default Notion client (uses NOTION_API_KEY)
 */
export function getDefaultNotionClient(): Client {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    throw new Error('NOTION_API_KEY environment variable is not set');
  }
  return getNotionClient(apiKey);
}
