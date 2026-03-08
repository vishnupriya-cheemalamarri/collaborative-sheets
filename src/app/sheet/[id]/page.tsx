'use client';
import { logger } from '@/lib/utils/logger';
import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Grid } from '@/components/sheet/Grid';
import { FormulaBar } from '@/components/sheet/FormulaBar';
import { FormattingToolbar } from '@/components/sheet/FormattingToolbar';
import { SaveIndicator } from '@/components/sheet/SaveIndicator';
import { PresenceBar } from '@/components/sheet/PresenceBar';
import { EditableTitle } from '@/components/sheet/EditableTitle';
import { SheetErrorBoundary } from '@/components/errors/SheetErrorBoundary';
import { useSheet } from '@/hooks/useSheet';
import { usePresence } from '@/hooks/usePresence';
import { useSheetStore } from '@/store/sheetStore';
import { restoreDocument } from '@/lib/firebase/documents';
import { exportToCsv } from '@/lib/utils/exportCsv';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase/config';
import {
  FileSpreadsheet, ArrowLeft, Loader2,
  Download, Keyboard, BarChart2, X,
  AlertTriangle,
} from 'lucide-react';
import type { SpreadsheetDocument } from '@/types/document';
import type { CellId } from '@/types/cell';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function SheetPage() {
  const params  = useParams();
  const router  = useRouter();
  const { user } = useAuth();
  const docId   = params.id as string;

  const setCells        = useSheetStore((s) => s.setCells);
  const setSelectedCell = useSheetStore((s) => s.setSelectedCell);
  const cells           = useSheetStore((s) => s.cells);

  const { updateCell }  = useSheet(docId);
  const { activeUsers } = usePresence(docId);

  const [document,      setDocument]      = useState<SpreadsheetDocument | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showStats,     setShowStats]     = useState(false);
  const [showDeleted,   setShowDeleted]   = useState(false);

  // ── Subscribe to document metadata ───────────────────────────────────────
 useEffect(() => {
  const docRef = ref(database, `documents/${docId}`);

  const unsub = onValue(docRef, (snapshot) => {
    if (!snapshot.exists()) {
      // Doc was deleted while this tab was open — show restore modal
      setShowDeleted(true);
      setLoading(false);
      return;
    }

    const doc = snapshot.val() as SpreadsheetDocument;
    setDocument(doc);
    setLoading(false);
    setShowDeleted(false);
  });

  return () => unsub();
}, [docId, router]);useEffect(() => {
  const docRef = ref(database, `documents/${docId}`);

  const unsub = onValue(docRef, (snapshot) => {
    if (!snapshot.exists()) {
      // Doc was deleted while this tab was open — show restore modal
      setShowDeleted(true);
      setLoading(false);
      return;
    }

    const doc = snapshot.val() as SpreadsheetDocument;
    setDocument(doc);
    setLoading(false);
    setShowDeleted(false);
  });

  return () => unsub();
}, [docId, router]);
  // ── Clean up store on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      setCells({});
      setSelectedCell(null);
      useSheetStore.getState().resetColWidths();
      useSheetStore.getState().resetRowHeights();
    };
  }, [setCells, setSelectedCell]);

  // ── Memoised sheet statistics ─────────────────────────────────────────────
  const stats = useMemo(() => {
    const allValues = Object.values(cells)
      .map((c) => parseFloat(c.computed))
      .filter((n) => !isNaN(n));

    const formulaCount = Object.values(cells).filter(
      (c) => typeof c.value === 'string' && c.value.startsWith('=')
    ).length;

    return {
      count:        allValues.length,
      sum:          allValues.reduce((a, b) => a + b, 0),
      average:      allValues.length > 0
                      ? allValues.reduce((a, b) => a + b, 0) / allValues.length
                      : 0,
      min:          allValues.length > 0 ? Math.min(...allValues) : 0,
      max:          allValues.length > 0 ? Math.max(...allValues) : 0,
      formulaCount,
    };
  }, [cells]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleCellCommit(cellId: CellId, value: string) {
    updateCell(cellId, value);
  }

  async function handleRestore() {
    try {
      await restoreDocument(docId);
      setShowDeleted(false);
    } catch (err) {
      logger.error('Failed to restore document', err);
    }
  }

  function handleClose() {
    router.push('/dashboard');
  }

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-blue shadow-xl">
            <FileSpreadsheet className="h-7 w-7 text-white" />
          </div>
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
          <p className="mt-3 text-sm text-slate-500">Loading spreadsheet...</p>
        </motion.div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <AuthGuard>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex h-screen flex-col bg-white overflow-hidden"
      >
        {/* ── Toolbar ── */}
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white/80 backdrop-blur-sm px-4 py-2 shrink-0 shadow-sm">

          {/* Back to dashboard */}
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:block text-xs font-medium">Dashboard</span>
          </Link>

          <div className="h-5 w-px bg-slate-200" />

          {/* Icon + editable title */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-blue shadow-sm">
              <FileSpreadsheet className="h-4 w-4 text-white" />
            </div>
            {document && (
              <EditableTitle docId={docId} initialTitle={document.title} />
            )}
          </div>

          {/* Right side actions */}
          <div className="ml-auto flex items-center gap-2">

            <SaveIndicator />

            <div className="h-5 w-px bg-slate-200 mx-1" />

            {/* Stats toggle */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowStats(!showStats)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                showStats
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Sheet statistics"
            >
              <BarChart2 className="h-3.5 w-3.5" />
              <span className="hidden sm:block">Stats</span>
            </motion.button>

            {/* Export to CSV */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => exportToCsv(cells, document?.title ?? 'spreadsheet')}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
              title="Export to CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:block">Export</span>
            </motion.button>

            {/* Keyboard shortcuts */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowShortcuts(true)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
              title="Keyboard shortcuts"
            >
              <Keyboard className="h-3.5 w-3.5" />
            </motion.button>

            <div className="h-5 w-px bg-slate-200 mx-1" />

            {/* Live presence avatars */}
            {user && (
              <PresenceBar users={activeUsers} currentUserId={user.uid} />
            )}
          </div>
        </header>

        {/* ── Stats bar ── */}
        <AnimatePresence>
          {showStats && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-b border-slate-200 bg-slate-50"
            >
              <div className="flex items-center gap-6 px-4 py-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Sheet Stats
                </span>
                {[
                  { label: 'Count',    value: stats.count },
                  { label: 'Sum',      value: stats.sum.toFixed(2) },
                  { label: 'Average',  value: stats.average.toFixed(2) },
                  { label: 'Min',      value: stats.min },
                  { label: 'Max',      value: stats.max },
                  { label: 'Formulas', value: stats.formulaCount },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">{label}:</span>
                    <span className="text-xs font-semibold text-slate-700">{value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Formula bar ── */}
        <FormulaBar />

        {/* ── Formatting toolbar ── */}
        <FormattingToolbar docId={docId} />

        {/* ── Grid — wrapped in error boundary ── */}
        <SheetErrorBoundary docTitle={document?.title}>
          <Grid onCellCommit={handleCellCommit} />
        </SheetErrorBoundary>

        {/* ── Keyboard shortcuts modal ── */}
        <AnimatePresence>
          {showShortcuts && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
              onClick={() => setShowShortcuts(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-blue">
                      <Keyboard className="h-4 w-4 text-white" />
                    </div>
                    <h2 className="text-base font-bold text-slate-900">
                      Keyboard Shortcuts
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowShortcuts(false)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  {[
                    { keys: ['↑', '↓', '←', '→'], label: 'Navigate cells' },
                    { keys: ['Enter'],              label: 'Move down / confirm' },
                    { keys: ['Tab'],                label: 'Move right' },
                    { keys: ['Dbl Click'],          label: 'Edit cell' },
                    { keys: ['Any key'],            label: 'Start typing' },
                    { keys: ['Esc'],                label: 'Cancel editing' },
                    { keys: ['Del'],                label: 'Clear cell' },
                  ].map(({ keys, label }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50 transition"
                    >
                      <span className="text-sm text-slate-600">{label}</span>
                      <div className="flex gap-1">
                        {keys.map((key) => (
                          <kbd
                            key={key}
                            className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 shadow-sm"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowShortcuts(false)}
                  className="mt-5 w-full rounded-xl gradient-blue py-2.5 text-sm font-semibold text-white transition hover:opacity-90 shadow-md"
                >
                  Got it
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Deleted document modal ── */}
        <AnimatePresence>
          {showDeleted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
                    <AlertTriangle className="h-6 w-6 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Spreadsheet Deleted
                  </h3>
                  <p className="text-sm text-slate-500 mb-6">
                    This spreadsheet has been deleted. Would you like to restore it?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleRestore}
                      className="flex-1 rounded-xl bg-blue-500 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600"
                    >
                      Restore
                    </button>
                    <button
                      onClick={handleClose}
                      className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Go back
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </AuthGuard>
  );
}