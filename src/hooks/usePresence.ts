import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { joinPresence, subscribeToPresence, updateActiveCell } from '@/lib/firebase/presence';
import { useSheetStore } from '@/store/sheetStore';
import type { PresenceUser, PresenceMap } from '@/types/presence';

const PRESENCE_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#6366f1', '#a855f7', '#ec4899',
];

function colorFromUid(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length]!;
}

export function usePresence(docId: string) {
  const { user }        = useAuth();
  const setPresenceMap  = useSheetStore((s) => s.setPresenceMap);
  const presenceMap     = useSheetStore((s) => s.presenceMap);
  const selectedCellId  = useSheetStore((s) => s.selectedCellId);
  const mountedRef      = useRef(true);
  const leaveRef        = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!user) return;
    mountedRef.current = true;

    const presenceUser: PresenceUser = {
      uid:         user.uid,
      displayName: user.displayName ?? user.email?.split('@')[0] ?? 'Anonymous',
      color:       colorFromUid(user.uid),
      lastSeen:    Date.now(),
      activeCellId: null,
    };

    leaveRef.current = joinPresence(docId, presenceUser);

    const unsubscribe = subscribeToPresence(docId, (users) => {
      if (!mountedRef.current) return;

      const map: PresenceMap = {};
      users.forEach((u) => { map[u.uid] = u; });
      setPresenceMap(map);
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
      if (leaveRef.current) {
        leaveRef.current();
        leaveRef.current = null;
      }
    };
  }, [docId, user, setPresenceMap]);

  // Update active cell whenever selection changes
  useEffect(() => {
    if (!user || !mountedRef.current) return;
    updateActiveCell(docId, user.uid, selectedCellId);
  }, [docId, user, selectedCellId]);

  // ── Derive activeUsers from the presence map in the store ──
  // This way the sheet page can consume a simple array without
  // needing to know about the map structure.
  const activeUsers = Object.values(presenceMap) as PresenceUser[];

  return { activeUsers };
}