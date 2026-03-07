import {
  ref, set, onChildAdded, onChildChanged, off,
  type DataSnapshot,
} from 'firebase/database';
import { database } from './config';
import type { CellData, CellId } from '@/types/cell';

/**
 * Recursively remove keys whose value is `undefined`.
 * Firebase Realtime Database rejects any payload that contains undefined —
 * only null, strings, numbers, booleans, and plain objects are allowed.
 */
function stripUndefined<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v !== undefined) {
      result[k] = stripUndefined(v);
    }
  }
  return result as T;
}

export async function writeCell(
  docId: string,
  cellId: CellId,
  data: CellData,
): Promise<void> {
  const cellRef = ref(database, `cells/${docId}/${cellId}`);
  // stripUndefined prevents the "value argument contains undefined" Firebase error,
  // which occurs when CellFormat fields (bold, italic, textColor, bgColor) are
  // explicitly set to undefined rather than being omitted entirely.
  await set(cellRef, stripUndefined(data));
}

export function subscribeToCells(
  docId: string,
  onAdded:   (cellId: CellId, data: CellData) => void,
  onChanged: (cellId: CellId, data: CellData) => void,
): () => void {
  const cellsRef = ref(database, `cells/${docId}`);

  const handleAdded = (snap: DataSnapshot) => {
    if (snap.key && snap.exists()) onAdded(snap.key, snap.val() as CellData);
  };
  const handleChanged = (snap: DataSnapshot) => {
    if (snap.key && snap.exists()) onChanged(snap.key, snap.val() as CellData);
  };

  onChildAdded(cellsRef, handleAdded);
  onChildChanged(cellsRef, handleChanged);

  return () => off(cellsRef);
}