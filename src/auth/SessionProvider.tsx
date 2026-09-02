import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/client';
import { fetchSession, login as loginRequest, logout as logoutRequest } from '../api/endpoints';
import { queryKeys } from '../api/queryKeys';
import type { PermissionMap, SessionResponse, UserSummary } from '../api/types';

interface SessionContextValue {
  user: UserSummary | null;
  permissions: PermissionMap | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<SessionResponse>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }): JSX.Element {
  const queryClient = useQueryClient();

  // Called once on boot; a 401 simply means "not signed in", not a failure to retry.
  const session = useQuery({
    queryKey: queryKeys.session,
    queryFn: ({ signal }) => fetchSession(signal),
    retry: false,
    staleTime: Infinity
  });

  const value = useMemo<SessionContextValue>(() => {
    const unauthenticated = session.error instanceof ApiError && session.error.isUnauthenticated;

    return {
      user: session.data?.user ?? null,
      permissions: session.data?.permissions ?? null,
      isLoading: session.isLoading && !unauthenticated,
      signIn: async (email, password) => {
        const result = await loginRequest(email, password);
        queryClient.setQueryData(queryKeys.session, result);
        return result;
      },
      signOut: async () => {
        await logoutRequest();
        queryClient.clear();
        queryClient.setQueryData(queryKeys.session, undefined);
      }
    };
  }, [session.data, session.error, session.isLoading, queryClient]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used inside a SessionProvider');
  }
  return context;
}
