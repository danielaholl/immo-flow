'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';

// Re-export trpc for convenience - allows importing from either location
export { trpc };

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: (failureCount, error: any) => {
          // Don't retry on 401 Unauthorized errors
          if (error?.data?.httpStatus === 401 || error?.message?.includes('logged in')) {
            return false;
          }
          return failureCount < 1;
        },
      },
    },
  }));

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          // Use Next.js API proxy route (which forwards to Express server)
          url: '/api/trpc',

          headers() {
            const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
            return {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              'Content-Type': 'application/json; charset=utf-8',
              'Accept': 'application/json; charset=utf-8',
            };
          },

          // Include credentials for cookie support
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: 'include',
            });
          },
        }),
      ],
      // Use default transformer for better UTF-8 handling
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
