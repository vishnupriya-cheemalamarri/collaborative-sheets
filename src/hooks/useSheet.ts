import { logger } from '@/lib/utils/logger';
import { useEffect, useRef, useCallback } from 'react';
import { useSheetStore } from '@/store/sheetStore';
import { writeCell } from '@/lib/firebase/cells';
import { computeCellValue, recomputeAllFormulas } from '@/lib/formula/evaluator';
import { useAuth } from '@/context/AuthContext';
import { ref, onChildAdded, onChildChanged, off, type DataSnapshot } from 'firebase/database';
import { database } from '@/lib/firebase/config';
import type { CellId, CellData } from '@/types/cell';

const DEBOUNCE_MS = 100;

export function useSheet(docId: string) {
  const { user } = useAuth();
  const setCell = useSheetStore((s) => s.setCell);
  const setCellFormat = useSheetStore((s) => s.setCellFormat);
  const setSaveState = useSheetStore((s) => s.setSaveState);
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const cellsRef = ref(database, `cells/${docId}`);

    // ── FIX: separate function references for each event type ──
    // Firebase matches listeners by both event type AND function reference.
    // If you pass the same function to both onChildAdded and onChildChanged,
    // calling off(ref, 'child_added', fn) won't detach the child_changed
    // listener — they must be separate references.
    const handleSnapshot = (snapshot: DataSnapshot) => {
      if (!snapshot.exists()) return;
      const cellId = snapshot.key as CellId;
      const data = snapshot.val() as CellData;

      setCell(cellId, data.value, data.computed);

      if (data.format) {
        setCellFormat(cellId, data.format);
      }

      const currentCells = useSheetStore.getState().cells;
      const recomputed = recomputeAllFormulas(currentCells);
      useSheetStore.getState().setCells(recomputed);
    };

    const handleAdded   = (snap: DataSnapshot) => handleSnapshot(snap);
    const handleChanged = (snap: DataSnapshot) => handleSnapshot(snap);

    onChildAdded(cellsRef, handleAdded);
    onChildChanged(cellsRef, handleChanged);

    return () => {
      // ── FIX: detach each listener by its own reference ──
      off(cellsRef, 'child_added', handleAdded);
      off(cellsRef, 'child_changed', handleChanged);

      // ── FIX: clear all pending debounce timers on unmount ──
      // Without this, a timer that fires after unmount will try to call
      // setSaveState on an unmounted component and write to Firebase
      // with a potentially stale user reference.
      Object.values(debounceRef.current).forEach(clearTimeout);
      debounceRef.current = {};
    };
  }, [docId, setCell, setCellFormat]);

  const updateCell = useCallback(
    (cellId: CellId, value: string) => {
      if (!user) return;

      const cells = useSheetStore.getState().cells;
      const computed = computeCellValue(value, cells, cellId);
      const existingFormat = cells[cellId]?.format;

      setCell(cellId, value, computed);
      setSaveState('saving');

      // Clear any existing debounce for this cell before setting a new one
      if (debounceRef.current[cellId]) {
        clearTimeout(debounceRef.current[cellId]);
      }

      debounceRef.current[cellId] = setTimeout(async () => {
        // ── FIX: delete the key after it fires so the ref stays clean ──
        delete debounceRef.current[cellId];

        try {
          await writeCell(docId, cellId, {
            value,
            computed,
            updatedAt: Date.now(),
            updatedBy: user.uid,
            format: existingFormat,
          });
          setSaveState('saved');
          setTimeout(() => setSaveState('idle'), 2000);
        } catch (err) {
          logger.error('Failed to save cell', err);
          setSaveState('error');
        }
      }, DEBOUNCE_MS);
    },
    [docId, user, setCell, setSaveState]
  );

  return { updateCell };
}