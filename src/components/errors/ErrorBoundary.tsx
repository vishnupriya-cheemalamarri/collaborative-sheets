'use client';
import { logger } from '@/lib/utils/logger';
import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  // Optional fallback — if not provided the default UI is shown
  fallback?: (error: Error, reset: () => void) => ReactNode;
  // Label used in the error report to identify which boundary caught it
  boundaryName?: string;
}

interface State {
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log to console in dev — swap for your error reporting
    // service (Sentry, Datadog, etc.) in production
    logger.error(
  `ErrorBoundary caught [${this.props.boundaryName ?? 'unknown'}]`,
  { error, stack: errorInfo.componentStack }
);
  }

  reset = () => {
    this.setState({ error: null, errorInfo: null });
  };

  render() {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (error) {
      if (fallback) return fallback(error, this.reset);
      return <DefaultErrorUI error={error} reset={this.reset} />;
    }

    return children;
  }
}

// ─── Default fallback UI ──────────────────────────────────────────────────────

function DefaultErrorUI({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center p-6"
      style={{ background: '#07090f' }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 text-center"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(239,68,68,0.25)',
          boxShadow: '0 0 40px rgba(239,68,68,0.08)',
        }}
      >
        <div
          className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <AlertTriangle className="h-7 w-7 text-red-400" />
        </div>

        <h2 className="mb-2 text-xl font-black text-white">Something went wrong</h2>
        <p className="mb-6 text-sm text-slate-400 leading-relaxed">
          An unexpected error occurred. You can try recovering below,
          or return to the dashboard.
        </p>

        {/* Error detail — only shown in development */}
        {process.env.NODE_ENV === 'development' && (
          <pre
            className="mb-6 rounded-xl p-4 text-left text-xs text-red-400 overflow-auto max-h-40"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
          >
            {error.message}
          </pre>
        )}

        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all"
            style={{
              background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
              boxShadow: '0 0 20px rgba(99,102,241,0.35)',
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>

          <button
            onClick={() => window.location.href = '/dashboard'}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8',
            }}
          >
            <Home className="h-4 w-4" />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}