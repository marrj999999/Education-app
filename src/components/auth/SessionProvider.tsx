'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
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
  const [status, setStatus] = useState<
    'loading' | 'authenticated' | 'unauthenticated'
  >('loading');

  useEffect(() => {
    async function getSession() {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          setSession({ user: data.user });
          setStatus('authenticated');
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
  }, []);

  return (
    <SessionContext.Provider value={{ data: session, status }}>
      {children}
    </SessionContext.Provider>
  );
}
