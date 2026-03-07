'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithGoogle } from '@/lib/firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';
import { FUNCTIONS } from '@/lib/formula/functions';
import {
  FileSpreadsheet, Users, Zap, Shield, ArrowRight,
  User, Sun, Moon, ChevronLeft, ChevronRight,
  Sparkles, Play,
  CheckCircle, X, Hash
} from 'lucide-react';

// ─────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────

const FUNCTION_COUNT = Object.keys(FUNCTIONS).length;

const SLIDES = [
  {
    id: 1,
    tag: 'COLLABORATION',
    title: 'Work together,\nin real time',
    description: 'Multiple cursors, live presence indicators, and instant sync. Every keystroke lands on every screen in under 100ms.',
    icon: Users,
    accent: '#6366f1',
    accentRgb: '99,102,241',
    stat: '< 100ms',
    statLabel: 'sync latency',
    gridData: [
      ['Region', 'Q1', 'Q2', 'Q3'],
      ['North', '48,200', '51,900', '60,400'],
      ['South', '32,100', '38,700', '41,200'],
      ['East', '29,400', '33,100', '39,800'],
    ],
  },
  {
    id: 2,
    tag: 'FORMULAS',
    title: 'A formula engine\nthat just works',
    description: 'SUM, AVERAGE, MIN, MAX, COUNT and arithmetic across any cell reference. Dependency chains update instantly across all open sessions.',
    icon: Hash,
    accent: '#06b6d4',
    accentRgb: '6,182,212',
    stat: FUNCTION_COUNT.toString(),
    statLabel: 'built-in functions',
    gridData: [
      ['Item', 'Price', 'Qty', 'Total'],
      ['Widget A', '$12.00', '240', '=C2*B2'],
      ['Widget B', '$8.50', '180', '=C3*B3'],
      ['', '', 'SUM', '=SUM(D2:D3)'],
    ],
  },
  {
    id: 3,
    tag: 'SECURITY',
    title: 'Enterprise-grade\nauthentication',
    description: 'Firebase Auth with Google OAuth, role-based access, and real-time security rules. Your data is yours — always.',
    icon: Shield,
    accent: '#8b5cf6',
    accentRgb: '139,92,246',
    stat: '99.9%',
    statLabel: 'uptime SLA',
    gridData: [
      ['User', 'Role', 'Access', 'Status'],
      ['alice@co', 'Owner', 'Full', '● Online'],
      ['bob@co', 'Editor', 'Write', '● Online'],
      ['carol@co', 'Viewer', 'Read', '○ Away'],
    ],
  },
  {
    id: 4,
    tag: 'PERFORMANCE',
    title: 'Global sync,\nzero lag',
    description: 'Firebase Realtime Database delivers changes globally. Optimistic local writes ensure a perfectly responsive editing experience.',
    icon: Zap,
    accent: '#10b981',
    accentRgb: '16,185,129',
    stat: '∞',
    statLabel: 'concurrent editors',
    gridData: [
      ['Metric', 'Value', 'Target', 'Status'],
      ['Latency', '87ms', '< 200ms', '✓ Pass'],
      ['Uptime', '99.97%', '99.9%', '✓ Pass'],
      ['Sync rate', '100%', '100%', '✓ Pass'],
    ],
  },
];

// ─────────────────────────────────────────────
// MINI COMPONENTS
// ─────────────────────────────────────────────

function GlowOrb({ x, y, size, color, delay = 0 }: { x: string; y: string; size: number; color: string; delay?: number }) {
  return (
    <motion.div
      className="absolute pointer-events-none rounded-full"
      style={{
        left: x, top: y,
        width: size, height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: 'blur(40px)',
      }}
      animate={{ scale: [1, 1.15, 0.92, 1], opacity: [0.6, 0.9, 0.5, 0.6] }}
      transition={{ duration: 8 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  );
}

function GridLines() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke="rgba(99,102,241,0.07)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
}

function SpreadsheetPreview({ data, accent, accentRgb }: { data: string[][]; accent: string; accentRgb: string }) {
  const [activeCell, setActiveCell] = useState<[number, number] | null>([1, 3]);

  useEffect(() => {
    const cells: [number, number][] = [[0, 0],[1, 3],[2, 1],[3, 2],[1, 2]];
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % cells.length;
      setActiveCell(cells[i]!);
    }, 1400);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="rounded-2xl overflow-hidden text-xs font-mono"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: `0 0 40px rgba(${accentRgb},0.15)`,
      }}
    >
      {/* Formula bar */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b"
        style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <span className="text-slate-500 text-[10px] font-semibold tracking-widest">fx</span>
        <span style={{ color: accent }} className="opacity-80">
          {activeCell && data[activeCell[0]]?.[activeCell[1]]?.startsWith('=')
            ? data[activeCell[0]]![activeCell[1]]
            : ''}
        </span>
      </div>

      {/* Col headers */}
      <div className="flex border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="w-8 shrink-0" />
        {['A','B','C','D'].map((col, ci) => (
          <div
            key={col}
            className="flex-1 text-center py-1.5 text-[10px] font-bold text-slate-500"
            style={{
              borderLeft: '1px solid rgba(255,255,255,0.04)',
              background: activeCell && activeCell[1] === ci ? `rgba(${accentRgb},0.08)` : 'transparent',
              color: activeCell && activeCell[1] === ci ? accent : undefined,
            }}
          >
            {col}
          </div>
        ))}
      </div>

      {/* Rows */}
      {data.map((row, ri) => (
        <div key={ri} className="flex border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.03)' }}>
          <div
            className="w-8 shrink-0 text-center py-2 text-[10px] font-bold text-slate-600"
            style={{
              borderRight: '1px solid rgba(255,255,255,0.04)',
              background: activeCell && activeCell[0] === ri ? `rgba(${accentRgb},0.08)` : 'transparent',
              color: activeCell && activeCell[0] === ri ? accent : undefined,
            }}
          >
            {ri + 1}
          </div>
          {row.map((cell, ci) => {
            const isActive = activeCell && activeCell[0] === ri && activeCell[1] === ci;
            const isFormula = cell.startsWith('=');
            const isStatus = cell.includes('●') || cell.includes('○') || cell.includes('✓');
            return (
              <div
                key={ci}
                className="flex-1 px-2 py-2 text-[11px] transition-all duration-300 relative overflow-hidden"
                style={{
                  borderLeft: '1px solid rgba(255,255,255,0.03)',
                  background: isActive ? `rgba(${accentRgb},0.12)` : 'transparent',
                  boxShadow: isActive ? `inset 0 0 0 1.5px ${accent}` : 'none',
                  color: isFormula ? accent
                    : isStatus ? (cell.includes('✓') ? '#10b981' : cell.includes('●') ? '#22d3ee' : '#94a3b8')
                    : ri === 0 ? '#94a3b8'
                    : '#cbd5e1',
                  fontWeight: ri === 0 ? 600 : 400,
                }}
              >
                {cell}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: `linear-gradient(135deg, transparent, rgba(${accentRgb},0.05))` }}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// AUTH MODAL
// ─────────────────────────────────────────────

function AuthModal({
  onClose,
  onGoogle,
  loading,
  error,
}: {
  onClose: () => void;
  onGoogle: () => void;
  loading: boolean;
  error: string | null;
}) {
  const [mode, setMode] = useState<'choose' | 'guest'>('choose');
  const [name, setName] = useState('');
  const router = useRouter();

  async function handleGuest() {
    if (!name.trim()) return;
    try {
      const { signInAsGuest } = await import('@/lib/firebase/auth');
      await signInAsGuest(name.trim());
      router.push('/dashboard');
    } catch {
      // handled by parent
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="relative w-full max-w-sm rounded-3xl p-8"
        style={{
          background: 'linear-gradient(145deg, rgba(15,18,30,0.98) 0%, rgba(20,24,40,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 48px 100px rgba(0,0,0,0.7), 0 0 80px rgba(99,102,241,0.12)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:text-white"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Logo */}
        <div className="mb-7 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              boxShadow: '0 0 30px rgba(99,102,241,0.45)',
            }}
          >
            <FileSpreadsheet className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">Sign in to Sheets</h2>
          <p className="mt-1 text-sm text-slate-400">Start collaborating in seconds</p>
        </div>

        <AnimatePresence mode="wait">
          {mode === 'choose' ? (
            <motion.div key="choose" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-3">
              {/* Google */}
              <motion.button
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                onClick={onGoogle} disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.13)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 24px rgba(255,255,255,0.08)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                }}
              >
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {loading ? 'Signing in…' : 'Continue with Google'}
              </motion.button>

              <div className="flex items-center gap-3 py-1">
                <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.07)' }} />
                <span className="text-xs text-slate-600">or</span>
                <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.07)' }} />
              </div>

              {/* Guest */}
              <motion.button
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                onClick={() => setMode('guest')}
                className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-300 transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.12)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.35)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 24px rgba(99,102,241,0.18)';
                  (e.currentTarget as HTMLButtonElement).style.color = '#a5b4fc';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.07)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                  (e.currentTarget as HTMLButtonElement).style.color = '#cbd5e1';
                }}
              >
                <User className="h-4 w-4" />
                Continue as Guest
              </motion.button>
            </motion.div>
          ) : (
            <motion.div key="guest" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-3">
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Your display name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleGuest()}
                  className="w-full rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    transition: 'all 0.2s',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.55)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.14)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                onClick={handleGuest}
                disabled={!name.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white disabled:opacity-40 transition-all"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                  boxShadow: '0 0 24px rgba(99,102,241,0.4)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 40px rgba(99,102,241,0.65)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 24px rgba(99,102,241,0.4)'; }}
              >
                Join as Guest <ArrowRight className="h-4 w-4" />
              </motion.button>
              <button onClick={() => setMode('choose')} className="w-full text-center text-xs text-slate-500 transition hover:text-slate-300 py-1">
                ← Back
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 rounded-xl px-3 py-2 text-center text-xs text-red-400" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const [dark, setDark] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 25 });

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', () => setActiveSlide(emblaApi.selectedScrollSnap()));
    const t = setInterval(() => emblaApi.scrollNext(), 5000);
    return () => clearInterval(t);
  }, [emblaApi]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  async function handleGoogle() {
    setLoading(true); setError(null);
    try { await signInWithGoogle(); router.push('/dashboard'); }
    catch { setError('Sign-in failed. Please try again.'); }
    finally { setLoading(false); }
  }

  const slide = SLIDES[activeSlide] ?? SLIDES[0]!;

  // Light mode tints — swap background/text
  const bg = dark ? '#07090f' : '#f4f5f9';
  const textPrimary = dark ? '#f1f5f9' : '#0f172a';
  const textMuted = dark ? '#64748b' : '#64748b';

  return (
    <div style={{ background: bg, color: textPrimary, minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── BACKGROUND ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {/* Placeholder hero image with overlay */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1800&q=80')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: dark ? 0.04 : 0.06,
          }}
        />
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: dark
              ? 'linear-gradient(135deg, rgba(7,9,15,0.97) 0%, rgba(12,14,26,0.95) 50%, rgba(7,9,15,0.97) 100%)'
              : 'linear-gradient(135deg, rgba(244,245,249,0.97) 0%, rgba(238,240,252,0.95) 50%, rgba(244,245,249,0.97) 100%)',
          }}
        />
        <GridLines />
        {dark && (
          <>
            <GlowOrb x="-8%" y="-5%" size={700} color="rgba(99,102,241,0.12)" delay={0} />
            <GlowOrb x="60%" y="-10%" size={500} color="rgba(6,182,212,0.08)" delay={3} />
            <GlowOrb x="20%" y="60%" size={600} color="rgba(139,92,246,0.09)" delay={6} />
            <GlowOrb x="75%" y="55%" size={450} color="rgba(16,185,129,0.07)" delay={2} />
          </>
        )}
      </div>

      {/* ── NAVBAR ── */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-50 flex items-center justify-between px-6 py-4 lg:px-16"
        style={{
          background: dark ? 'rgba(7,9,15,0.7)' : 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(20px)',
          borderBottom: dark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.06)',
        }}
      >
        {/* Logo */}
        <motion.div whileHover={{ scale: 1.02 }} className="flex items-center gap-2.5 cursor-default select-none">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              boxShadow: '0 0 16px rgba(99,102,241,0.45)',
            }}
          >
            <FileSpreadsheet className="h-4.5 w-4.5 text-white" style={{ height: 18, width: 18 }} />
          </div>
          <span className="text-base font-bold tracking-tight" style={{ color: textPrimary }}>
            Collaborative <span style={{ color: '#6366f1' }}>Sheets</span>
          </span>
        </motion.div>

        {/* Center nav */}
        <div className="flex-1 flex justify-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            whileHover={{ scale: 1.05, y: -2 }}
            className="text-sm font-semibold tracking-wide cursor-default select-none"
          >
            <span style={{ color: '#ffffff' }}>Where </span>
            <span style={{ color: '#6366f1' }}>Data </span>
            <span style={{ color: '#ffffff' }}>Meets </span>
            <span style={{ color: '#6366f1' }}>Collaboration</span>
          </motion.span>
        </div>


        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.93 }}
            onClick={() => setDark(!dark)}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-all"
            style={{
              background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              border: dark ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(0,0,0,0.09)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 12px rgba(99,102,241,0.35)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'; }}
            aria-label="Toggle theme"
          >
            {dark
              ? <Sun className="h-4 w-4 text-yellow-300" />
              : <Moon className="h-4 w-4 text-indigo-500" />
            }
          </motion.button>

          {/* Login */}
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowAuth(true)}
            className="hidden sm:flex rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200"
            style={{
              color: dark ? '#cbd5e1' : '#475569',
              background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              border: dark ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(0,0,0,0.08)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = dark ? 'rgba(99,102,241,0.14)' : 'rgba(99,102,241,0.08)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.4)';
              (e.currentTarget as HTMLButtonElement).style.color = '#818cf8';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 18px rgba(99,102,241,0.2)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = dark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)';
              (e.currentTarget as HTMLButtonElement).style.color = dark ? '#cbd5e1' : '#475569';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
            }}
          >
            Log in
          </motion.button>

          {/* Get Started */}
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.96 }}
            onClick={() => setShowAuth(true)}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              boxShadow: '0 0 20px rgba(99,102,241,0.35), 0 2px 8px rgba(0,0,0,0.25)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 36px rgba(99,102,241,0.6), 0 4px 16px rgba(0,0,0,0.3)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(99,102,241,0.35), 0 2px 8px rgba(0,0,0,0.25)'; }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Get Started
          </motion.button>
        </div>
      </motion.header>

      {/* ── HERO ── */}
      <section className="relative z-10 px-6 pt-24 pb-16 lg:px-16 lg:pt-36 lg:pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left copy */}
            <div>
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
                className="mb-6 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold"
                style={{
                  background: 'rgba(99,102,241,0.1)',
                  border: '1px solid rgba(99,102,241,0.25)',
                  color: '#818cf8',
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                Live collaboration · Zero setup
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.18 }}
                className="text-5xl font-black leading-[1.04] tracking-tight lg:text-6xl xl:text-7xl"
                style={{ color: textPrimary }}
              >
                The spreadsheet
                <br />
                <span
                  style={{
                    background: 'linear-gradient(135deg, #60a5fa 0%, #818cf8 40%, #c084fc 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  built for teams.
                </span>
              </motion.h1>

              {/* Sub */}
              <motion.p
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.28 }}
                className="mt-5 text-lg leading-relaxed max-w-lg"
                style={{ color: textMuted }}
              >
                Real-time sync, powerful formulas, live cursors. See every edit as it happens —
                across any device, anywhere in the world.
              </motion.p>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.38 }}
                className="mt-8 flex flex-wrap gap-3"
              >
                <motion.button
                  whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setShowAuth(true)}
                  className="group flex items-center gap-2.5 rounded-2xl px-7 py-3.5 text-sm font-bold text-white"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                    boxShadow: '0 0 32px rgba(99,102,241,0.45), 0 6px 24px rgba(0,0,0,0.3)',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 52px rgba(99,102,241,0.7), 0 10px 32px rgba(0,0,0,0.35)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 32px rgba(99,102,241,0.45), 0 6px 24px rgba(0,0,0,0.3)'; }}
                >
                  <Sparkles className="h-4 w-4 transition-transform group-hover:rotate-12" />
                  Start for free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setShowAuth(true)}
                  className="group flex items-center gap-2 rounded-2xl px-7 py-3.5 text-sm font-semibold transition-all"
                  style={{
                    color: dark ? '#94a3b8' : '#475569',
                    background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = dark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)';
                    (e.currentTarget as HTMLButtonElement).style.color = dark ? '#e2e8f0' : '#1e293b';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
                    (e.currentTarget as HTMLButtonElement).style.color = dark ? '#94a3b8' : '#475569';
                  }}
                >
                  <Play className="h-4 w-4 transition-transform group-hover:scale-110" />
                  Log in
                </motion.button>
              </motion.div>

              {/* Social proof */}
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
                className="mt-8 flex flex-wrap gap-5 text-xs"
                style={{ color: textMuted }}
              >
                {['Edit together instantly', 'Share sheets in seconds', 'No installation needed'].map(t => (
                  <span key={t} className="flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                    {t}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Right — live preview */}
            <motion.div
              initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
              className="relative"
            >
              {/* Floating main card */}
              <motion.div
                animate={{ y: [-5, 5, -5] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                className="relative"
              >
                {/* Browser frame */}
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: dark ? 'rgba(12,15,25,0.9)' : 'rgba(255,255,255,0.9)',
                    border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.1)',
                    boxShadow: '0 48px 80px rgba(0,0,0,0.5), 0 0 80px rgba(99,102,241,0.12)',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  {/* Traffic lights */}
                  <div className="flex items-center gap-1.5 px-4 py-3" style={{ borderBottom: dark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.06)' }}>
                    <div className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                    <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
                    <div className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
                    <div
                      className="ml-3 flex-1 rounded px-3 py-0.5 text-xs"
                      style={{
                        background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                        color: textMuted,
                      }}
                    >
                      collaborative-sheets.vercel.app/sheet/demo
                    </div>
                    {/* Presence avatars */}
                    <div className="flex -space-x-1.5">
                      {['#6366f1','#06b6d4','#10b981'].map(c => (
                        <div key={c} className="h-5 w-5 rounded-full ring-2 flex items-center justify-center text-white text-[8px] font-bold" style={{ background: c, '--ring-color': dark ? '#07090f' : '#fff' } as React.CSSProperties} />
                      ))}
                    </div>
                  </div>

                  {/* Toolbar */}
                  <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: dark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.05)' }}>
                    <div className="h-4 w-12 rounded shimmer opacity-60" style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', animation: 'shimmer 1.8s infinite' }} />
                    <div className="h-4 w-16 rounded shimmer opacity-40" style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />
                    <div className="h-4 w-10 rounded shimmer opacity-30" style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />
                    <div className="ml-auto flex gap-1.5">
                      {['B','I'].map(f => (
                        <div key={f} className="h-5 w-5 rounded flex items-center justify-center text-[10px] font-black" style={{ background: dark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)', color: '#818cf8' }}>{f}</div>
                      ))}
                    </div>
                  </div>

                  {/* Grid */}
                  <div className="p-0 text-xs font-mono">
                    {/* Col headers */}
                    <div className="flex" style={{ borderBottom: dark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.06)' }}>
                      <div className="w-9 shrink-0" />
                      {['A','B','C','D','E'].map(c => (
                        <div key={c} className="flex-1 text-center py-1.5 text-[10px] font-bold" style={{ color: textMuted, borderLeft: dark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.05)' }}>{c}</div>
                      ))}
                    </div>
                    {[
                      ['Product','Units','Price','Revenue','Growth'],
                      ['Alpha','1,240','$48','$59,520','↑ 12%'],
                      ['Beta','980','$62','$60,760','↑ 8%'],
                      ['Gamma','2,100','$31','$65,100','↑ 21%'],
                      ['Total','=SUM(B2:B4)','','=SUM(D2:D4)',''],
                    ].map((row, ri) => (
                      <div key={ri} className="flex" style={{ borderBottom: dark ? '1px solid rgba(255,255,255,0.03)' : '1px solid rgba(0,0,0,0.04)' }}>
                        <div className="w-9 shrink-0 text-center py-1.5 text-[10px]" style={{ color: textMuted, borderRight: dark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.05)', background: ri === 0 ? (dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)') : 'transparent' }}>{ri + 1}</div>
                        {row.map((cell, ci) => (
                          <div
                            key={ci}
                            className="flex-1 px-1.5 py-1.5 text-[11px] overflow-hidden"
                            style={{
                              borderLeft: dark ? '1px solid rgba(255,255,255,0.03)' : '1px solid rgba(0,0,0,0.04)',
                              color: cell.startsWith('=') ? '#818cf8'
                                : cell.startsWith('↑') ? '#34d399'
                                : ri === 0 ? (dark ? '#94a3b8' : '#64748b')
                                : (dark ? '#e2e8f0' : '#1e293b'),
                              background: ri === 0 ? (dark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)') : 'transparent',
                              fontWeight: ri === 0 || ci === 0 ? 600 : 400,
                            }}
                          >
                            {cell}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Floating badge: online */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.9 }}
                className="absolute -left-10 top-1/3 hidden lg:block"
              >
                <motion.div
                  animate={{ y: [-3, 3, -3] }} transition={{ duration: 4, repeat: Infinity }}
                  className="rounded-xl px-3.5 py-2.5"
                  style={{ background: 'rgba(6,9,18,0.9)', border: '1px solid rgba(16,185,129,0.3)', backdropFilter: 'blur(16px)', boxShadow: '0 0 20px rgba(16,185,129,0.2)' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-semibold text-emerald-400">3 editing live</span>
                  </div>
                </motion.div>
              </motion.div>

              {/* Floating badge: saved */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.1 }}
                className="absolute -right-8 bottom-1/4 hidden lg:block"
              >
                <motion.div
                  animate={{ y: [3, -3, 3] }} transition={{ duration: 5, repeat: Infinity }}
                  className="rounded-xl px-3.5 py-2.5"
                  style={{ background: 'rgba(6,9,18,0.9)', border: '1px solid rgba(99,102,241,0.3)', backdropFilter: 'blur(16px)', boxShadow: '0 0 20px rgba(99,102,241,0.2)' }}
                >
                  <div className="text-xs font-semibold text-indigo-400">✓ All changes saved</div>
                  <div className="text-xs text-slate-500 mt-0.5">0.1s ago</div>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="relative z-10 px-6 py-10 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mx-auto max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-2xl"
          style={{ background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }}
        >
          {[
            { val: '< 100ms', lbl: 'Sync latency' },
            { val: '99.9%', lbl: 'Uptime SLA' },
            { val: 'Live', lbl: 'Multi-user Editing' },
            { val: '∞', lbl: 'Concurrent editors' },
          ].map(({ val, lbl }) => (
            <div key={lbl} className="flex flex-col items-center py-7 px-4"
              style={{ background: dark ? 'rgba(7,9,15,0.85)' : 'rgba(244,245,249,0.85)' }}
            >
              <span className="text-3xl font-black" style={{
                background: 'linear-gradient(135deg, #60a5fa, #818cf8)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
              }}>{val}</span>
              <span className="mt-1 text-xs font-medium" style={{ color: textMuted }}>{lbl}</span>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── CAROUSEL ── */}
      <section className="relative z-10 px-6 py-16 lg:px-16">
        <div className="mx-auto max-w-6xl">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: '#6366f1' }}>What you get</p>
            <h2 className="text-3xl font-black tracking-tight lg:text-4xl" style={{ color: textPrimary }}>
              Everything your team needs
            </h2>
            <p className="mt-3 text-base max-w-xl mx-auto" style={{ color: textMuted }}>
              Four pillars that make Collaborative Sheets the go-to tool for modern teams.
            </p>
          </motion.div>

          {/* Carousel */}
          <div ref={emblaRef} className="overflow-hidden">
            <div className="flex">
              {SLIDES.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.id} className="flex-[0_0_100%] min-w-0 px-1 md:flex-[0_0_50%] lg:flex-[0_0_100%]">
                    <motion.div
                      className="grid lg:grid-cols-2 gap-6 rounded-3xl p-8 lg:p-10"
                      style={{
                        background: dark
                          ? `linear-gradient(135deg, rgba(${s.accentRgb},0.06) 0%, rgba(12,15,26,0.95) 100%)`
                          : `linear-gradient(135deg, rgba(${s.accentRgb},0.05) 0%, rgba(248,250,252,0.97) 100%)`,
                        border: `1px solid rgba(${s.accentRgb},0.18)`,
                        boxShadow: `0 0 60px rgba(${s.accentRgb},0.1), 0 24px 48px rgba(0,0,0,0.2)`,
                      }}
                    >
                      {/* Left: copy */}
                      <div className="flex flex-col justify-center">
                        <div
                          className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl"
                          style={{
                            background: `rgba(${s.accentRgb},0.15)`,
                            border: `1px solid rgba(${s.accentRgb},0.25)`,
                            boxShadow: `0 0 24px rgba(${s.accentRgb},0.25)`,
                          }}
                        >
                          <Icon className="h-6 w-6" style={{ color: s.accent }} />
                        </div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: s.accent }}>{s.tag}</p>
                        <h3 className="text-2xl font-black leading-tight lg:text-3xl" style={{ color: textPrimary }}>
                          {s.title.split('\n').map((line, i) => (
                            <span key={i}>{line}{i === 0 && <br />}</span>
                          ))}
                        </h3>
                        <p className="mt-3 text-sm leading-relaxed max-w-sm" style={{ color: textMuted }}>{s.description}</p>

                        {/* Stat chip */}
                        <div
                          className="mt-6 inline-flex items-baseline gap-2 self-start rounded-2xl px-5 py-3"
                          style={{
                            background: `rgba(${s.accentRgb},0.1)`,
                            border: `1px solid rgba(${s.accentRgb},0.2)`,
                          }}
                        >
                          <span className="text-3xl font-black" style={{ color: s.accent }}>{s.stat}</span>
                          <span className="text-xs font-medium" style={{ color: textMuted }}>{s.statLabel}</span>
                        </div>
                      </div>

                      {/* Right: live grid preview */}
                      <div className="flex items-center justify-center">
                        <div className="w-full max-w-xs">
                          <SpreadsheetPreview data={s.gridData} accent={s.accent} accentRgb={s.accentRgb} />
                        </div>
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Controls */}
          <div className="mt-7 flex items-center justify-center gap-5">
            <motion.button
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={scrollPrev}
              className="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200"
              style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.09)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `rgba(${slide.accentRgb},0.2)`; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 18px rgba(${slide.accentRgb},0.4)`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'; }}
            >
              <ChevronLeft className="h-5 w-5" style={{ color: textPrimary }} />
            </motion.button>

            <div className="flex gap-2">
              {SLIDES.map((s, i) => (
                <motion.button
                  key={i}
                  onClick={() => emblaApi?.scrollTo(i)}
                  animate={{ width: activeSlide === i ? 28 : 8, opacity: activeSlide === i ? 1 : 0.3 }}
                  className="h-2 rounded-full"
                  style={{ background: activeSlide === i ? SLIDES[i]!.accent : (dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)') }}
                />
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={scrollNext}
              className="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200"
              style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.09)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `rgba(${slide.accentRgb},0.2)`; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 18px rgba(${slide.accentRgb},0.4)`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'; }}
            >
              <ChevronRight className="h-5 w-5" style={{ color: textPrimary }} />
            </motion.button>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative z-10 px-6 py-20 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mx-auto max-w-2xl text-center"
        >
          <div
            className="rounded-3xl px-10 py-14"
            style={{
              background: dark
                ? 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(12,15,26,0.95) 100%)'
                : 'linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(248,250,252,0.97) 100%)',
              border: '1px solid rgba(99,102,241,0.18)',
              boxShadow: '0 0 60px rgba(99,102,241,0.1)',
            }}
          >
            <div
              className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', boxShadow: '0 0 28px rgba(99,102,241,0.5)' }}
            >
              <FileSpreadsheet className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-4xl font-black tracking-tight" style={{ color: textPrimary }}>Ready to collaborate?</h2>
            <p className="mt-3 text-base" style={{ color: textMuted }}>
              Join teams already building with Collaborative Sheets. Free forever, no card required.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <motion.button
                whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.96 }}
                onClick={() => setShowAuth(true)}
                className="flex items-center gap-2.5 rounded-2xl px-9 py-4 text-base font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', boxShadow: '0 0 36px rgba(99,102,241,0.5)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 56px rgba(99,102,241,0.75), 0 10px 32px rgba(0,0,0,0.4)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 36px rgba(99,102,241,0.5)'; }}
              >
                <Sparkles className="h-5 w-5" />
                Get started — it&apos;s free
                <ArrowRight className="h-5 w-5" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 px-6 py-8 lg:px-16" style={{ borderTop: dark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.07)' }}>
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: textMuted }}>
            <FileSpreadsheet className="h-4 w-4" style={{ color: '#6366f1' }} />
            Collaborative Sheets
          </div>
          <p className="text-xs" style={{ color: textMuted }}>
            Built with Next.js · Firebase · Tailwind · Framer Motion
          </p>
        </div>
      </footer>

      {/* ── AUTH MODAL ── */}
      <AnimatePresence>
        {showAuth && (
          <AuthModal
            onClose={() => { setShowAuth(false); setError(null); }}
            onGoogle={handleGoogle}
            loading={loading}
            error={error}
          />
        )}
      </AnimatePresence>
    </div>
  );
}