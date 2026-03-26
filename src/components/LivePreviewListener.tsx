'use client';

import { RefreshRouteOnSave } from '@payloadcms/live-preview-react';
import { useRouter } from 'next/navigation';

/**
 * Listens for Payload CMS save events and refreshes the page.
 * When an admin saves content in the CMS editor, this component
 * triggers a Next.js router refresh so the page re-renders with
 * the updated data from the server.
 *
 * Only active when the page is loaded inside Payload's live preview iframe.
 */
export function LivePreviewListener() {
  const router = useRouter();

  return (
    <RefreshRouteOnSave
      refresh={() => router.refresh()}
      serverURL={process.env.NEXT_PUBLIC_PAYLOAD_URL || ''}
    />
  );
}
