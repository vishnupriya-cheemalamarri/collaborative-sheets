'use client';

import { ErrorBoundary } from './ErrorBoundary';
import { type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface SheetErrorBoundaryProps {
  children: ReactNode;
  docTitle?: string;
}

export function SheetErrorBoundary({ children, docTitle }: SheetErrorBoundaryProps) {
  return (
    <ErrorBoundary
      boundaryName="SheetErrorBoundary"
      fallback={(error, reset) => (
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{
              background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            <div
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ background: 'rgba(239,68,68,0.1)' }}
            >
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>

            <h3 className="mb-1 text-base font-bold text-white">
              Sheet crashed
            </h3>
            <p className="mb-1 text-xs text-slate-400">
              {docTitle && <span className="font-semibold text-slate-300">{docTitle} </span>}
              encountered an unexpected error.
            </p>

            {process.env.NODE_ENV === 'development' && (
              <pre
                className="mb-4 mt-3 rounded-lg p-3 text-left text-xs text-red-400 overflow-auto max-h-28"
                style={{ background: 'rgba(239,68,68,0.08)' }}
              >
                {error.message}
              </pre>
            )}

            <button
              onClick={reset}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}
            >
              <RefreshCw className="h-4 w-4" />
              Reload sheet
            </button>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}