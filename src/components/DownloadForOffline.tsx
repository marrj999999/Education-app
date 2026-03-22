'use client';

import { useState } from 'react';
import { Download, Check, Loader2, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DownloadForOfflineProps {
  lessonId: string;
  lessonTitle: string;
}

type DownloadState = 'idle' | 'downloading' | 'success' | 'error';

export function DownloadForOffline({ lessonId, lessonTitle }: DownloadForOfflineProps) {
  const [state, setState] = useState<DownloadState>('idle');
  const [progress, setProgress] = useState(0);

  const handleDownload = async () => {
    setState('downloading');
    setProgress(0);

    try {
      // Step 1: Cache the lesson page (33%)
      setProgress(33);
      const lessonUrl = `/courses/bamboo-bikes/lessons/${lessonId}`;
      const cache = await caches.open('lesson-cache');

      // Fetch and cache the lesson page
      const lessonResponse = await fetch(lessonUrl);
      if (lessonResponse.ok) {
        await cache.put(lessonUrl, lessonResponse.clone());
      }

      // Step 2: Cache the lesson API data (66%)
      setProgress(66);
      const apiUrl = `/api/lessons/${lessonId}`;
      const apiResponse = await fetch(apiUrl);
      if (apiResponse.ok) {
        await cache.put(apiUrl, apiResponse.clone());
      }

      // Step 3: Cache the sections API (100%)
      setProgress(100);
      const sectionsUrl = `/api/lessons/${lessonId}/sections`;
      const sectionsResponse = await fetch(sectionsUrl);
      if (sectionsResponse.ok) {
        await cache.put(sectionsUrl, sectionsResponse.clone());
      }

      // Mark as cached in localStorage
      const cachedLessons = JSON.parse(localStorage.getItem('cached-lessons') || '[]');
      if (!cachedLessons.includes(lessonId)) {
        cachedLessons.push(lessonId);
        localStorage.setItem('cached-lessons', JSON.stringify(cachedLessons));
      }

      setState('success');

      // Reset to idle after showing success
      setTimeout(() => {
        setState('idle');
        setProgress(0);
      }, 3000);
    } catch (error) {
      console.error('Failed to cache lesson:', error);
      setState('error');

      // Reset to idle after showing error
      setTimeout(() => {
        setState('idle');
        setProgress(0);
      }, 3000);
    }
  };

  // Check if already cached
  const isCached = () => {
    if (typeof window === 'undefined') return false;
    const cachedLessons = JSON.parse(localStorage.getItem('cached-lessons') || '[]');
    return cachedLessons.includes(lessonId);
  };

  const cached = isCached();

  return (
    <button
      onClick={handleDownload}
      disabled={state === 'downloading'}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
        'transition-all duration-200',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal',
        state === 'success'
          ? 'bg-bamboo-100 text-forest'
          : state === 'error'
            ? 'bg-danger-light text-danger-darker'
            : state === 'downloading'
              ? 'bg-surface-hover text-text-tertiary cursor-wait'
              : cached
                ? 'bg-bamboo-50 text-teal hover:bg-bamboo-100'
                : 'bg-surface-hover text-text-secondary hover:bg-surface-active'
      )}
      title={cached ? 'Already saved for offline' : `Save "${lessonTitle}" for offline use`}
    >
      {state === 'downloading' ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          <span className="hidden sm:inline">Saving... {progress}%</span>
        </>
      ) : state === 'success' ? (
        <>
          <Check size={18} />
          <span className="hidden sm:inline">Saved!</span>
        </>
      ) : state === 'error' ? (
        <>
          <WifiOff size={18} />
          <span className="hidden sm:inline">Failed</span>
        </>
      ) : cached ? (
        <>
          <Check size={18} />
          <span className="hidden sm:inline">Offline Ready</span>
        </>
      ) : (
        <>
          <Download size={18} />
          <span className="hidden sm:inline">Save Offline</span>
        </>
      )}
    </button>
  );
}

export default DownloadForOffline;
