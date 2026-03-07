'use client';

import { logger } from '@/lib/utils/logger';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSpreadsheet, Plus, Search, Sun, Moon,
  LogOut, ChevronRight, Users, Clock, Activity,
  Zap, MoreHorizontal, X, Loader2, Grid3x3,
  TrendingUp, Edit3, UserPlus, Trash2,
  RefreshCw,
} from 'lucide-react';

import { useAuth }                        from '@/context/AuthContext';
import { signOutUser }                    from '@/lib/firebase/auth';
import { getDocuments, createDocument, deleteDocument }   from '@/lib/firebase/documents';
import type {
  SpreadsheetDocument,
  DocumentCreateInput,
}                                         from '@/types/document';

import {
  ref, onValue, off,
  onChildChanged, onChildAdded,
  type DataSnapshot,
}                                         from 'firebase/database';
import { database }                       from '@/lib/firebase/config';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PresenceUser {
  uid: string;
  displayName: string;
  color: string;
  lastSeen: number;
  activeCellId?: string | null;
}

interface ActivityEvent {
  id: string;
  type: 'edit' | 'join' | 'create' | 'delete';
  docId: string;
  docTitle: string;
  userName: string;
  userColor: string;
  cellId?: string;
  timestamp: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STALE_MS = 60_000;

function timeAgo(ts: number): string {
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 5)     return 'just now';
  if (d < 60)    return `${d}s ago`;
  if (d < 3600)  return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

function initials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || '?';
}

// ─── AnimatedCounter ──────────────────────────────────────────────────────────

function AnimatedCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const raf  = useRef<number | null>(null);
  const prev = useRef(0);

  useEffect(() => {
    const start = prev.current;
    const end   = value;
    const dur   = 600;
    const t0    = performance.now();

    function tick(now: number) {
      const t = Math.min((now - t0) / dur, 1);
      const e = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + (end - start) * e));
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else prev.current = end;
    }
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value]);

  return <>{display}</>;
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, sub, rgb, delay = 0,
}: {
  icon: React.ElementType; label: string; value: number;
  sub?: string; rgb: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -3, scale: 1.01 }}
      className="relative cursor-default overflow-hidden rounded-2xl p-5"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          `0 14px 40px rgba(0,0,0,0.4), 0 0 28px rgba(${rgb},0.15)`;
        (e.currentTarget as HTMLDivElement).style.borderColor = `rgba(${rgb},0.3)`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)';
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(circle at top left, rgba(${rgb},0.08) 0%, transparent 60%)` }}
      />
      <div className="relative">
        <div
          className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: `rgba(${rgb},0.15)`, border: `1px solid rgba(${rgb},0.2)` }}
        >
          <Icon className="h-5 w-5" style={{ color: `rgb(${rgb})` }} />
        </div>
        <div className="text-3xl font-black text-white">
          <AnimatedCounter value={value} />
        </div>
        <div className="mt-0.5 text-sm font-semibold text-slate-300">{label}</div>
        {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
      </div>
    </motion.div>
  );
}

// ─── DocCardSkeleton ──────────────────────────────────────────────────────────

function DocCardSkeleton() {
  return (
    <div
      className="relative rounded-2xl p-5"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl animate-pulse"
        style={{ background: 'rgba(255,255,255,0.08)' }}
      />
      <div className="flex items-start justify-between mb-4">
        <div
          className="h-11 w-11 rounded-xl animate-pulse"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        />
        <div
          className="h-8 w-8 rounded-lg animate-pulse"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        />
      </div>
      <div
        className="h-4 w-3/4 rounded-lg mb-2 animate-pulse"
        style={{ background: 'rgba(255,255,255,0.08)' }}
      />
      <div
        className="h-3 w-1/2 rounded-lg mb-4 animate-pulse"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      />
      <div className="flex items-center justify-between mt-4">
        <div
          className="h-3 w-16 rounded-lg animate-pulse"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        />
        <div
          className="h-5 w-12 rounded-full animate-pulse"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        />
      </div>
    </div>
  );
}

// ─── DocCard ──────────────────────────────────────────────────────────────────

function DocCard({
  doc, liveCount, onOpen, onDelete, onDuplicate, delay,
}: {
  doc: SpreadsheetDocument; liveCount: number;
  onOpen: () => void; onDelete: () => void; onDuplicate: () => void; delay: number;
}) {
  const [menu, setMenu] = useState(false);

  const ACCENTS = [
    ['99,102,241', '#818cf8'],
    ['6,182,212',  '#22d3ee'],
    ['139,92,246', '#a78bfa'],
    ['16,185,129', '#34d399'],
    ['245,158,11', '#fbbf24'],
    ['239,68,68',  '#f87171'],
  ];
  const [aRgb, aHex] = ACCENTS[doc.id.charCodeAt(0) % ACCENTS.length]!;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -4, scale: 1.01 }}
      onClick={onOpen}
      className="relative cursor-pointer rounded-2xl p-5 group"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          `0 16px 48px rgba(0,0,0,0.4), 0 0 36px rgba(${aRgb},0.1)`;
        (e.currentTarget as HTMLDivElement).style.borderColor = `rgba(${aRgb},0.35)`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.25)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)';
      }}
    >
      {/* Accent top bar */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, ${aHex}, transparent)` }}
      />

      <div className="flex items-start justify-between mb-4">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ background: `rgba(${aRgb},0.14)`, border: `1px solid rgba(${aRgb},0.22)` }}
        >
          <Grid3x3 className="h-5 w-5" style={{ color: aHex }} />
        </div>

        <div className="relative" onClick={e => e.stopPropagation()}>
          <motion.button
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => setMenu(!menu)}
            className="flex h-8 w-8 items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <MoreHorizontal className="h-4 w-4 text-slate-400" />
          </motion.button>

          <AnimatePresence>
            {menu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.14 }}
                className="absolute right-0 top-9 z-50 w-36 rounded-xl py-1"
                style={{
                  background: 'rgba(14,17,30,0.97)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(16px)',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.55)',
                }}
              >
                <button
                  onClick={onOpen}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Open
                </button>
                <button
                  onClick={() => { setMenu(false); onDelete(); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
                <button
                  onClick={() => { setMenu(false); onDuplicate(); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Duplicate
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <h3 className="font-bold text-white text-sm truncate mb-0.5">{doc.title}</h3>
      <p className="text-xs text-slate-500 mb-4 truncate">by {doc.ownerName}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Clock className="h-3 w-3" />
          <span>{timeAgo(doc.updatedAt)}</span>
        </div>
        {liveCount > 0 && (
          <div
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{
              background: 'rgba(16,185,129,0.12)',
              border: '1px solid rgba(16,185,129,0.25)',
              color: '#34d399',
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {liveCount} live
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── ActivityRow ──────────────────────────────────────────────────────────────

function ActivityRow({ event, idx }: { event: ActivityEvent; idx: number }) {
  const Icon = event.type === 'edit' ? Edit3
             : event.type === 'join' ? UserPlus
             :                        Plus;

  const label = event.type === 'edit'
    ? `edited${event.cellId ? ` ${event.cellId}` : ' a cell'} in`
    : event.type === 'join' ? 'joined'
    : 'created';

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.3, delay: idx * 0.03 }}
      className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0"
    >
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-bold"
        style={{ background: event.userColor }}
      >
        {initials(event.userName)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-300 leading-snug">
          <span className="font-semibold text-white">{event.userName}</span>
          {' '}{label}{' '}
          <span className="font-semibold text-indigo-400">{event.docTitle}</span>
        </p>
        <p className="text-xs text-slate-600 mt-0.5">{timeAgo(event.timestamp)}</p>
      </div>
      <div
        className="shrink-0 flex h-6 w-6 items-center justify-center rounded-lg"
        style={{ background: 'rgba(99,102,241,0.12)' }}
      >
        <Icon className="h-3.5 w-3.5 text-indigo-400" />
      </div>
    </motion.div>
  );
}

// ─── CreateModal ──────────────────────────────────────────────────────────────

function CreateModal({
  onClose, onCreated,
}: {
  onClose: () => void;
  onCreated: (doc: SpreadsheetDocument) => void;
}) {
  const { user } = useAuth();
  const [title,   setTitle]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleCreate() {
    if (!title.trim() || !user) return;
    setLoading(true);
    setError(null);
    try {
      const input: DocumentCreateInput = { title: title.trim() };
      const doc = await createDocument(input, user.uid, user.displayName ?? 'Anonymous');
      onCreated(doc);
    } catch {
      setError('Failed to create sheet. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.76)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        className="relative w-full max-w-sm rounded-3xl p-8"
        style={{
          background: 'rgba(11,14,26,0.98)',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.65), 0 0 60px rgba(99,102,241,0.1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <X className="h-4 w-4" />
        </button>

        <div
          className="mx-auto mb-5 flex items-center justify-center rounded-2xl"
          style={{
            width: 52, height: 52,
            background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
            boxShadow: '0 0 28px rgba(99,102,241,0.45)',
          }}
        >
          <Plus className="h-6 w-6 text-white" />
        </div>

        <h2 className="mb-1 text-center text-xl font-black text-white">New Sheet</h2>
        <p className="mb-6 text-center text-sm text-slate-400">Give your spreadsheet a name</p>

        <input
          autoFocus
          type="text"
          placeholder="e.g. Q4 Budget Tracker"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !loading && handleCreate()}
          className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none mb-3"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            transition: 'all 0.2s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.55)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.14)'; }}
          onBlur={e  => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';  e.currentTarget.style.boxShadow = 'none'; }}
        />

        {error && (
          <p className="mb-3 rounded-xl px-3 py-2 text-center text-xs text-red-400"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </p>
        )}

        <motion.button
          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          onClick={handleCreate}
          disabled={!title.trim() || loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white disabled:opacity-40 transition-all"
          style={{
            background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
            boxShadow: '0 0 24px rgba(99,102,241,0.4)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 40px rgba(99,102,241,0.65)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 24px rgba(99,102,241,0.4)'; }}
        >
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</>
            : <><Plus className="h-4 w-4" /> Create Sheet</>}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router   = useRouter();
  const { user } = useAuth();

  const [dark,       setDark]       = useState(true);
  const [search,     setSearch]     = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showMenu,   setShowMenu]   = useState(false);

  const [docs,           setDocs]           = useState<SpreadsheetDocument[]>([]);
  const [docsLoading,    setDocsLoading]    = useState(true);
  const [presenceCounts, setPresenceCounts] = useState<Record<string, number>>({});
  const [activity,       setActivity]       = useState<ActivityEvent[]>([]);
  const [editsToday,     setEditsToday]     = useState(0);

  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  // ── 1. Load documents ─────────────────────────────────────────────────────

  const loadDocs = useCallback(async () => {
    if (!user) return;
    setDocsLoading(true);
    try {
      const list = await getDocuments(user.uid);
      list.sort((a, b) => b.updatedAt - a.updatedAt);
      setDocs(list);
    } catch (err) {
      logger.error('Dashboard: failed to load docs', err);
    } finally {
      setDocsLoading(false);
    }
  }, [user]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  // ── 2. Presence counts ────────────────────────────────────────────────────

  useEffect(() => {
    if (docs.length === 0) return;
    const cleanups: (() => void)[] = [];

    docs.forEach(doc => {
      const r = ref(database, `presence/${doc.id}`);
      const handler = (snap: DataSnapshot) => {
        const now = Date.now();
        let count = 0;
        if (snap.exists()) {
          snap.forEach((child: DataSnapshot) => {
            const u = child.val() as PresenceUser;
            if (u && now - u.lastSeen < STALE_MS) count++;
          });
        }
        setPresenceCounts(prev => ({ ...prev, [doc.id]: count }));
      };
      onValue(r, handler);
      cleanups.push(() => off(r, 'value', handler));
    });

    return () => cleanups.forEach(fn => fn());
  }, [docs]);

  // ── 3. Cell edits → activity feed ────────────────────────────────────────

  useEffect(() => {
    if (docs.length === 0) return;
    const cleanups: (() => void)[] = [];
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    let editCount = 0;

    docs.forEach(doc => {
      const cellsRef = ref(database, `cells/${doc.id}`);

      const handle = (snap: DataSnapshot) => {
        if (!snap.exists()) return;
        const data = snap.val() as { value: string; updatedAt: number; updatedBy: string };
        if (!data?.updatedBy || !data?.updatedAt) return;

        if (data.updatedAt >= dayStart.getTime()) {
          editCount++;
          setEditsToday(editCount);
        }

        const presRef = ref(database, `presence/${doc.id}/${data.updatedBy}`);
        onValue(presRef, (ps: DataSnapshot) => {
          const pd = ps.val() as PresenceUser | null;
          const displayName = pd?.displayName ?? (data.updatedBy === user?.uid ? (user.displayName ?? 'You') : 'Collaborator');
          const color       = pd?.color ?? '#6366f1';

          const event: ActivityEvent = {
            id:        `${doc.id}-${snap.key ?? ''}-${data.updatedAt}`,
            type:      'edit',
            docId:     doc.id,
            docTitle:  doc.title,
            userName:  displayName,
            userColor: color,
            cellId:    snap.key ?? undefined,
            timestamp: data.updatedAt,
          };

          setActivity(prev => {
            const filtered = prev.filter(
              e => !(e.docId === doc.id && e.cellId === snap.key)
            );
            return [event, ...filtered].slice(0, 40);
          });

          off(presRef);
        }, { onlyOnce: true });
      };

      onChildChanged(cellsRef, handle);
      onChildAdded(cellsRef, handle);
      cleanups.push(() => {
        off(cellsRef, 'child_changed', handle);
        off(cellsRef, 'child_added',   handle);
      });
    });

    return () => cleanups.forEach(fn => fn());
  }, [docs, user]);

  // ── 4. Presence joins → activity feed ────────────────────────────────────

  useEffect(() => {
    if (docs.length === 0) return;
    const cleanups: (() => void)[] = [];

    docs.forEach(doc => {
      const presRef = ref(database, `presence/${doc.id}`);

      const handleJoin = (snap: DataSnapshot) => {
        if (!snap.exists()) return;
        const u = snap.val() as PresenceUser;
        if (!u?.uid || !u?.displayName) return;
        if (u.uid === user?.uid) return;

        const event: ActivityEvent = {
          id:        `join-${doc.id}-${u.uid}-${u.lastSeen}`,
          type:      'join',
          docId:     doc.id,
          docTitle:  doc.title,
          userName:  u.displayName,
          userColor: u.color ?? '#6366f1',
          timestamp: u.lastSeen,
        };

        setActivity(prev => {
          const filtered = prev.filter(
            e => !(e.type === 'join' && e.docId === doc.id && e.userName === u.displayName)
          );
          return [event, ...filtered].slice(0, 40);
        });
      };

      onChildAdded(presRef, handleJoin);
      cleanups.push(() => off(presRef, 'child_added', handleJoin));
    });

    return () => cleanups.forEach(fn => fn());
  }, [docs, user]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleDocCreated(doc: SpreadsheetDocument) {
    setDocs(prev => [doc, ...prev]);
    setActivity(prev => {
      const newEvent: ActivityEvent = {
        id:        `create-${doc.id}`,
        type:      'create',
        docId:     doc.id,
        docTitle:  doc.title,
        userName:  user?.displayName ?? 'You',
        userColor: '#6366f1',
        timestamp: Date.now(),
      };
      return [newEvent, ...prev].slice(0, 40);
    });
    setShowCreate(false);
    router.push(`/sheet/${doc.id}`);
  }

  function handleDelete(docId: string) {
    const doc = docs.find(d => d.id === docId);
    deleteDocument(docId, user!.uid).then(() => {
      setDocs(prev => prev.filter(d => d.id !== docId));
      setActivity(prev => {
        const newEvent: ActivityEvent = {
          id:        `delete-${docId}`,
          type:      'delete',
          docId,
          docTitle:  doc?.title ?? 'Unknown',
          userName:  user?.displayName ?? 'You',
          userColor: '#ef4444',
          timestamp: Date.now(),
        };
        return [newEvent, ...prev].slice(0, 40);
      });
    }).catch(err => {
      logger.error('Failed to delete document', err);
    });
  }

  async function handleDuplicate(doc: SpreadsheetDocument) {
    try {
      const newTitle = `${doc.title} (Copy)`;
      const newDoc = await createDocument({ title: newTitle }, user!.uid, user!.displayName ?? 'Anonymous');
      setDocs(prev => [newDoc, ...prev]);
    } catch (err) {
      logger.error('Failed to duplicate document', err);
    }
  }

  async function handleSignOut() {
    await signOutUser();
    router.push('/login');
  }

  // ── Derived values ────────────────────────────────────────────────────────

  const totalLive   = Object.values(presenceCounts).reduce((s, n) => s + n, 0);
  const activeDocs  = Object.values(presenceCounts).filter(n => n > 0).length;
  const sheetsTotal = docs.length;

  const filtered = docs.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.ownerName.toLowerCase().includes(search.toLowerCase())
  );

  const sortedActivity = [...activity].sort((a, b) => b.timestamp - a.timestamp);

  // ── Style helpers ─────────────────────────────────────────────────────────

  const bg          = dark ? '#07090f' : '#f0f2f8';
  const textPrimary = dark ? '#f1f5f9' : '#0f172a';
  const textMuted   = dark ? '#64748b' : '#64748b';
  const glass       = dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.72)';
  const border      = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: bg, color: textPrimary, overflowX: 'hidden' }}>

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        {dark && (
          <>
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 12, repeat: Infinity }}
              style={{
                position: 'absolute', top: '-15%', left: '-10%',
                width: 700, height: 700, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
                filter: 'blur(60px)',
              }}
            />
            <motion.div
              animate={{ scale: [1, 0.9, 1], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 16, repeat: Infinity, delay: 3 }}
              style={{
                position: 'absolute', top: '40%', right: '-10%',
                width: 600, height: 600, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)',
                filter: 'blur(60px)',
              }}
            />
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 20, repeat: Infinity, delay: 6 }}
              style={{
                position: 'absolute', bottom: '-10%', left: '30%',
                width: 800, height: 800, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)',
                filter: 'blur(60px)',
              }}
            />
          </>
        )}
        <div
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: `
              linear-gradient(${dark ? 'rgba(99,102,241,0.04)' : 'rgba(99,102,241,0.05)'} 1px, transparent 1px),
              linear-gradient(90deg, ${dark ? 'rgba(99,102,241,0.04)' : 'rgba(99,102,241,0.05)'} 1px, transparent 1px)
            `,
            backgroundSize: '72px 72px',
          }}
        />
      </div>

      {/* Navbar */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-40 flex items-center gap-3 px-5 py-3 lg:px-8"
        style={{
          background: dark ? 'rgba(7,9,15,0.78)' : 'rgba(255,255,255,0.78)',
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${border}`,
        }}
      >
        <motion.div whileHover={{ scale: 1.02 }} className="flex items-center gap-2.5 cursor-default select-none mr-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', boxShadow: '0 0 16px rgba(99,102,241,0.45)' }}
          >
            <FileSpreadsheet style={{ height: 18, width: 18, color: '#fff' }} />
          </div>
          <span className="hidden sm:block text-base font-bold tracking-tight" style={{ color: textPrimary }}>
            Collaborative <span style={{ color: '#6366f1' }}>Sheets</span>
          </span>
        </motion.div>

        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search sheets…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl py-2 pl-9 pr-4 text-sm placeholder-slate-500 outline-none transition-all"
            style={{
              background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              border: `1px solid ${border}`,
              color: textPrimary,
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
            onBlur={e  => { e.currentTarget.style.borderColor = border; e.currentTarget.style.boxShadow = 'none'; }}
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.93 }}
            onClick={loadDocs}
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', border: `1px solid ${border}` }}
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.93 }}
            onClick={() => setDark(!dark)}
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', border: `1px solid ${border}` }}
          >
            {dark ? <Sun className="h-4 w-4 text-yellow-300" /> : <Moon className="h-4 w-4 text-indigo-500" />}
          </motion.button>

          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.93 }}
              onClick={() => setShowMenu(!showMenu)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white text-xs font-bold"
              style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', boxShadow: '0 0 12px rgba(99,102,241,0.4)' }}
            >
              {user?.displayName ? initials(user.displayName) : '?'}
            </motion.button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-10 z-50 w-52 rounded-2xl py-2"
                  style={{
                    background: dark ? 'rgba(11,14,26,0.98)' : 'rgba(255,255,255,0.98)',
                    border: `1px solid ${border}`,
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 24px 48px rgba(0,0,0,0.45)',
                  }}
                >
                  <div className="px-4 py-2.5 mb-1 border-b" style={{ borderColor: border }}>
                    <p className="text-sm font-semibold truncate" style={{ color: textPrimary }}>{user?.displayName ?? 'User'}</p>
                    <p className="text-xs truncate" style={{ color: textMuted }}>{user?.email ?? 'Guest'}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.header>

      {/* Page body */}
      <main className="relative z-10 mx-auto max-w-7xl px-5 py-8 lg:px-8">

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <p className="mb-0.5 text-sm font-semibold" style={{ color: '#818cf8' }}>Welcome back,</p>
            <h1 className="text-3xl font-black tracking-tight lg:text-4xl" style={{ color: textPrimary }}>
              {user?.displayName?.split(' ')[0] ?? 'there'} 👋
            </h1>
            <p className="mt-1 text-sm" style={{ color: textMuted }}>
              {sheetsTotal === 0
                ? 'No sheets yet — create your first one!'
                : `${sheetsTotal} sheet${sheetsTotal !== 1 ? 's' : ''} in your workspace`}
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold text-white self-start sm:self-auto"
            style={{
              background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
              boxShadow: '0 0 28px rgba(99,102,241,0.45)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 48px rgba(99,102,241,0.7)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 28px rgba(99,102,241,0.45)'; }}
          >
            <Plus className="h-4 w-4" /> New Sheet
          </motion.button>
        </motion.div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={Users}         label="Active Now"    value={totalLive}   sub="across all sheets"   rgb="99,102,241"  delay={0.05} />
          <StatCard icon={FileSpreadsheet} label="Total Sheets" value={sheetsTotal} sub="in your workspace"   rgb="6,182,212"   delay={0.1}  />
          <StatCard icon={Zap}           label="Edits Today"   value={editsToday}  sub="cell changes"        rgb="16,185,129"  delay={0.15} />
          <StatCard icon={TrendingUp}    label="Active Sheets" value={activeDocs}  sub="with live users"     rgb="245,158,11"  delay={0.2}  />
        </div>

        {/* Main grid */}
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Recent Sheets */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="rounded-2xl p-5"
              style={{ background: glass, border: `1px solid ${border}`, backdropFilter: 'blur(20px)' }}
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}
                  >
                    <Clock className="h-4 w-4 text-indigo-400" />
                  </div>
                  <h2 className="text-base font-bold" style={{ color: textPrimary }}>Recent Sheets</h2>
                </div>
                {filtered.length > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>
                    {filtered.length}
                  </span>
                )}
              </div>

              {/* ── Skeleton loaders replace the spinner ── */}
              {docsLoading ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {[...Array(4)].map((_, i) => (
                    <DocCardSkeleton key={i} />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div
                    className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
                    style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}
                  >
                    <FileSpreadsheet className="h-8 w-8 text-indigo-400" />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: textPrimary }}>
                    {search ? 'No sheets match your search' : 'No sheets yet'}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: textMuted }}>
                    {search ? 'Try a different keyword' : 'Create your first sheet to get started'}
                  </p>
                  {!search && (
                    <motion.button
                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                      onClick={() => setShowCreate(true)}
                      className="mt-5 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white"
                      style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}
                    >
                      <Plus className="h-4 w-4" /> Create Sheet
                    </motion.button>
                  )}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filtered.map((doc, i) => (
                    <DocCard
                      key={doc.id}
                      doc={doc}
                      liveCount={presenceCounts[doc.id] ?? 0}
                      onOpen={() => router.push(`/sheet/${doc.id}`)}
                      onDelete={() => handleDelete(doc.id)}
                      onDuplicate={() => handleDuplicate(doc)}
                      delay={i * 0.04}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Right sidebar */}
          <div className="flex flex-col gap-6">

            {/* Live Now */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="rounded-2xl p-5"
              style={{ background: glass, border: `1px solid ${border}`, backdropFilter: 'blur(20px)' }}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}
                  >
                    <Users className="h-4 w-4 text-emerald-400" />
                  </div>
                  <h2 className="text-base font-bold" style={{ color: textPrimary }}>Live Now</h2>
                </div>
                {totalLive > 0 && (
                  <div
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399' }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {totalLive} online
                  </div>
                )}
              </div>

              {totalLive === 0 ? (
                <p className="py-3 text-center text-xs" style={{ color: textMuted }}>
                  No active collaborators right now
                </p>
              ) : (
                <div className="space-y-1.5">
                  {docs
                    .filter(d => (presenceCounts[d.id] ?? 0) > 0)
                    .map((doc, i) => (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        onClick={() => router.push(`/sheet/${doc.id}`)}
                        className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 transition-all"
                        style={{ background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(16,185,129,0.08)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'; }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                          <span className="text-xs font-medium truncate" style={{ color: textPrimary }}>{doc.title}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs font-bold" style={{ color: '#34d399' }}>
                            {presenceCounts[doc.id]}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                        </div>
                      </motion.div>
                    ))}
                </div>
              )}
            </motion.div>

            {/* Activity Feed */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="flex-1 rounded-2xl p-5"
              style={{ background: glass, border: `1px solid ${border}`, backdropFilter: 'blur(20px)' }}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}
                  >
                    <Activity className="h-4 w-4 text-indigo-400" />
                  </div>
                  <h2 className="text-base font-bold" style={{ color: textPrimary }}>Activity</h2>
                </div>
                {sortedActivity.length > 0 && (
                  <span
                    className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                    style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}
                  >
                    Live
                  </span>
                )}
              </div>

              {sortedActivity.length === 0 ? (
                <p className="py-3 text-center text-xs" style={{ color: textMuted }}>
                  Activity appears here as collaborators edit sheets
                </p>
              ) : (
                <div className="max-h-72 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                  <AnimatePresence initial={false}>
                    {sortedActivity.map((ev, i) => (
                      <ActivityRow key={ev.id} event={ev} idx={i} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>

          </div>
        </div>
      </main>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateModal
            onClose={() => setShowCreate(false)}
            onCreated={handleDocCreated}
          />
        )}
      </AnimatePresence>
    </div>
  );
}