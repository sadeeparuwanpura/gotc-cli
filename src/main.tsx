import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ApiError } from './api/client';
import { SessionProvider } from './auth/SessionProvider';
import { App } from './App';
import './styles/global.css';
import './styles/print.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A 401 means the session is gone — the route guard handles it, retrying cannot.
      retry: (failureCount, error) =>
        error instanceof ApiError && error.isUnauthenticated ? false : failureCount < 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000
    }
  }
});

const container = document.getElementById('root');
if (!container) {
  throw new Error('Missing #root element');
}

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SessionProvider>
          <App />
        </SessionProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
