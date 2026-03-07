import { logger } from '@/lib/utils/logger';
import {
  ref, set, onValue, onDisconnect,
  off, type DataSnapshot,
} from 'firebase/database';
import { database } from './config';
import type { PresenceUser } from '@/types/presence';

export function joinPresence(
  docId: string,
  user: PresenceUser
): () => void {
  const presenceRef = ref(database, `presence/${docId}/${user.uid}`);
  let active = true;

  // Write initial presence
  set(presenceRef, { ...user, lastSeen: Date.now() }).catch((err) => 
  logger.error('Presence write failed', err)
);

  // Server-side cleanup if the client disconnects ungracefully
  // (tab close, network drop, browser crash)
  onDisconnect(presenceRef).remove();

  // Heartbeat keeps lastSeen fresh so stale detection works correctly
  const heartbeat = setInterval(() => {
    // ── FIX: don't write if leave() has already been called ──
    if (!active) return;
    set(presenceRef, { ...user, lastSeen: Date.now() }).catch((err) => 
    logger.error('Presence update failed', err)
  );
  }, 30_000);

  return () => {
    active = false;
    clearInterval(heartbeat);

    // Best-effort client-side removal — onDisconnect handles the
    // server side if this doesn't complete in time
    set(presenceRef, null).catch(() => {
      // Silence — onDisconnect will clean up server-side
    });
  };
}

export function subscribeToPresence(
  docId: string,
  onChange: (users: PresenceUser[]) => void
): () => void {
  const presenceRef = ref(database, `presence/${docId}`);

  const handleSnapshot = (snapshot: DataSnapshot) => {
    if (!snapshot.exists()) {
      onChange([]);
      return;
    }

    const now = Date.now();
    const STALE_MS = 60_000;
    const users: PresenceUser[] = [];

    snapshot.forEach((child: DataSnapshot) => {
      const u = child.val() as PresenceUser;
      if (u && now - u.lastSeen < STALE_MS) {
        users.push(u);
      }
    });

    onChange(users);
  };

  onValue(presenceRef, handleSnapshot);
  return () => off(presenceRef, 'value', handleSnapshot);
}

export function updateActiveCell(
  docId: string,
  userId: string,
  cellId: string | null
): void {
  const cellRef = ref(database, `presence/${docId}/${userId}/activeCellId`);
  set(cellRef, cellId).catch((err) => 
  logger.error('Failed to update active cell', err)
);
}