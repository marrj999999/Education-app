'use client';

import { useState, useEffect } from 'react';
import { WifiOff, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check initial state
    setIsOffline(!navigator.onLine);

    const handleOnline = () => {
      setIsOffline(false);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setDismissed(false); // Reset dismissal when going offline
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Don't render if online or dismissed
  if (!isOffline || dismissed) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-[100]',
        'bg-amber-500 text-amber-950',
        'px-4 py-3',
        'flex items-center justify-center gap-3',
        'shadow-lg',
        'animate-in slide-in-from-top duration-300'
      )}
      role="alert"
      aria-live="polite"
    >
      <WifiOff size={20} className="flex-shrink-0" />
      <span className="font-medium text-sm sm:text-base">
        You&apos;re offline - some features may be limited
      </span>
      <button
        onClick={() => setDismissed(true)}
        className={cn(
          'ml-2 p-1 rounded-full',
          'hover:bg-amber-600 transition-colors',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700'
        )}
        aria-label="Dismiss offline notification"
      >
        <X size={18} />
      </button>
    </div>
  );
}

export default OfflineIndicator;
