'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { Role } from '@prisma/client';

interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: Role;
}

interface SessionData {
  user: SessionUser;
}

interface SessionContextValue {
  data: SessionData | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
}

const SessionContext = createContext<SessionContextValue>({
  data: null,
  status: 'loading',
});

export function useSession() {
  return useContext(SessionContext);
}

interface Props {
  children: React.ReactNode;
}

export default function SessionProvider({ children }: Props) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    async function getSession() {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user?.email) {
          // Fetch the Prisma user data for role info
          const res = await fetch('/api/auth/session');
          if (res.ok) {
            const data = await res.json();
            setSession({ user: data.user });
            setStatus('authenticated');
          } else {
            setSession(null);
            setStatus('unauthenticated');
          }
        } else {
          setSession(null);
          setStatus('unauthenticated');
        }
      } catch {
        setSession(null);
        setStatus('unauthenticated');
      }
    }

    getSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'SIGNED_IN') {
          getSession();
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setStatus('unauthenticated');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <SessionContext.Provider value={{ data: session, status }}>
      {children}
    </SessionContext.Provider>
  );
}
