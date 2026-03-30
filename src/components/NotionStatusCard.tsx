'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface NotionStatus {
  ok: boolean;
  timestamp: string;
  notion?: {
    connected: boolean;
    databaseAccessible: boolean;
  };
  error?: string;
}

interface SyncResult {
  success: boolean;
  message: string;
  timestamp: string;
}

export function NotionStatusCard() {
  const [status, setStatus] = useState<NotionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Check Notion health on mount
  useEffect(() => {
    checkNotionHealth();
  }, []);

  const checkNotionHealth = async () => {
    setLoading(true);
    try {
      // Note: In production, fetch secret from secure source or use server action
      const response = await fetch(`/api/health/notion?secret=${process.env.NEXT_PUBLIC_REVALIDATE_SECRET || ''}`);
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      setStatus({
        ok: false,
        timestamp: new Date().toISOString(),
        error: 'Failed to check Notion status',
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const response = await fetch('/api/admin/sync/curriculum', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setLastSync(new Date().toISOString());
        setSyncMessage('Content synced successfully!');
        toast.success('Content synced successfully!', {
          description: `Synced ${data.results?.lessons?.created || 0} lessons from Notion`,
        });
        // Refresh status after sync
        setTimeout(checkNotionHealth, 1000);
      } else {
        setSyncMessage(data.error || 'Sync failed');
        toast.error('Sync failed', {
          description: data.error || 'Unable to sync content from Notion',
        });
      }
    } catch (error) {
      setSyncMessage('Failed to sync content');
      toast.error('Sync failed', {
        description: 'Network error - please try again',
      });
    } finally {
      setSyncing(false);
      // Clear message after 5 seconds
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-text-tertiary animate-spin" />
            <span className="text-sm text-muted-foreground">Checking Notion status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isConnected = status?.ok ?? false;

  return (
    <Card className={`border ${isConnected ? 'border-bamboo-200 bg-bamboo-50/50' : 'border-danger-medium bg-danger-light/50'}`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isConnected ? (
              <div className="w-8 h-8 rounded-full bg-bamboo-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-teal" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-danger-light flex items-center justify-center">
                <XCircle className="w-5 h-5 text-danger" />
              </div>
            )}
            <div>
              <p className={`text-sm font-medium ${isConnected ? 'text-teal' : 'text-danger-dark'}`}>
                Notion {isConnected ? 'Connected' : 'Disconnected'}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>
                  {lastSync ? `Synced ${formatTimestamp(lastSync)}` : 'Never synced'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {syncMessage && (
              <span className={`text-xs px-2 py-1 rounded ${
                syncMessage.includes('success') ? 'bg-bamboo-100 text-teal' : 'bg-danger-light text-danger-dark'
              }`}>
                {syncMessage}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={triggerSync}
              disabled={syncing || !isConnected}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          </div>
        </div>

        {status?.error && !isConnected && (
          <p className="text-xs text-danger mt-2 pl-11">
            {status.error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
