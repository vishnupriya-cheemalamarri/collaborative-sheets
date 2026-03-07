import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { SheetCells, CellId, CellFormat } from '@/types/cell';
import type { PresenceMap } from '@/types/presence';
import { recomputeAllFormulas } from '@/lib/formula/evaluator';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface SheetState {
  cells: SheetCells;
  selectedCellId: CellId | null;
  editingCellId: CellId | null;
  editingValue: string;
  saveState: SaveState;
  presenceMap: PresenceMap;
  colWidths: Record<number, number>;
  rowHeights: Record<number, number>;

  setCell: (cellId: CellId, value: string, computed: string) => void;
  setCells: (cells: SheetCells) => void;
  setSelectedCell: (cellId: CellId | null) => void;
  setEditingCell: (cellId: CellId | null) => void;
  setEditingValue: (value: string) => void;
  setSaveState: (state: SaveState) => void;
  setPresenceMap: (map: PresenceMap) => void;
  setCellFormat: (cellId: CellId, format: CellFormat) => void;
  setColWidth: (colIndex: number, width: number) => void;
  setRowHeight: (rowIndex: number, height: number) => void;
}

export const useSheetStore = create<SheetState>()(
  immer((set) => ({
    cells: {},
    selectedCellId: null,
    editingCellId: null,
    editingValue: '',
    saveState: 'idle',
    presenceMap: {},
    colWidths: {},
    rowHeights: {},

    setCell: (cellId, value, computed) =>
      set((state) => {
        const existing = state.cells[cellId];
        if (existing?.value === value && existing?.computed === computed) {
          return;
        }
        state.cells[cellId] = {
          value,
          computed,
          updatedAt: Date.now(),
          updatedBy: '',
          format: existing?.format,
        };
      }),

    setCells: (cells) =>
      set((state) => {
        state.cells = cells;
      }),

    setSelectedCell: (cellId) =>
      set((state) => {
        state.selectedCellId = cellId;
      }),

    setEditingCell: (cellId) =>
      set((state) => {
        state.editingCellId = cellId;
        if (cellId) {
          state.editingValue = state.cells[cellId]?.value ?? '';
        } else {
          state.editingValue = '';
        }
      }),

    setEditingValue: (value) =>
      set((state) => {
        state.editingValue = value;
      }),

    setSaveState: (saveState) =>
      set((state) => {
        state.saveState = saveState;
      }),

    setPresenceMap: (presenceMap) =>
      set((state) => {
        state.presenceMap = presenceMap;
      }),

    setCellFormat: (cellId, format) =>
      set((state) => {
        const existing = state.cells[cellId];

        // ✅ Only update format if cell actually has a value.
        // Never create ghost cells for cells that don't exist yet.
        if (!existing) return;

        // ✅ Preserve value and computed exactly — never recompute here.
        state.cells[cellId] = {
          ...existing,
          format: { ...existing.format, ...format },
          updatedAt: Date.now(),
        };

        // ✅ Recompute all formulas after format change using
        //    a clean snapshot so formula results stay correct.
        const recomputed = recomputeAllFormulas({ ...state.cells });
        for (const [id, cell] of Object.entries(recomputed)) {
          state.cells[id] = cell;
        }
      }),

    setColWidth: (colIndex, width) =>
      set((state) => {
        state.colWidths[colIndex] = width;
      }),

    setRowHeight: (rowIndex, height) =>
      set((state) => {
        state.rowHeights[rowIndex] = height;
      }),
  }))
);