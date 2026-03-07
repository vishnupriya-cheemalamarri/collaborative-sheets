'use client';

import { type ReactNode } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { ErrorBoundary } from '@/components/errors/ErrorBoundary';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorBoundary boundaryName="RootErrorBoundary">
      <AuthProvider>
        {children}
      </AuthProvider>
    </ErrorBoundary>
  );
}