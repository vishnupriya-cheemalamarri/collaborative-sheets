'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSheetStore } from '@/store/sheetStore';
import { Cell } from './Cell';
import { addressToCellId, cellIdToAddress } from '@/lib/utils/cellAddress';
import type { CellId } from '@/types/cell';

const ROWS = 50;
const COLS = 26;
const DEFAULT_COL_WIDTH = 120;
const DEFAULT_ROW_HEIGHT = 26;
const HEADER_WIDTH = 50;
const MIN_COL_WIDTH = 40;
const MIN_ROW_HEIGHT = 20;

const COL_LETTERS = Array.from({ length: COLS }, (_, i) =>
  String.fromCharCode(65 + i)
);

interface GridProps {
  onCellCommit: (cellId: CellId, value: string) => void;
}

export function Grid({ onCellCommit }: GridProps) {
  const selectedCellId = useSheetStore((s) => s.selectedCellId);
  const setSelectedCell = useSheetStore((s) => s.setSelectedCell);
  const setEditingCell = useSheetStore((s) => s.setEditingCell);
  const editingCellId = useSheetStore((s) => s.editingCellId);
  const colWidths = useSheetStore((s) => s.colWidths);
  const rowHeights = useSheetStore((s) => s.rowHeights);
  const setColWidth = useSheetStore((s) => s.setColWidth);
  const setRowHeight = useSheetStore((s) => s.setRowHeight);

  const selectedAddress = selectedCellId
    ? cellIdToAddress(selectedCellId)
    : null;

  // Col resize state
  const colResizeRef = useRef<{
    colIndex: number;
    startX: number;
    startWidth: number;
  } | null>(null);

  // Row resize state
  const rowResizeRef = useRef<{
    rowIndex: number;
    startY: number;
    startHeight: number;
  } | null>(null);

  function getColWidth(colIndex: number): number {
    return colWidths[colIndex] ?? DEFAULT_COL_WIDTH;
  }

  function getRowHeight(rowIndex: number): number {
    return rowHeights[rowIndex] ?? DEFAULT_ROW_HEIGHT;
  }

  function handleColResizeStart(e: React.MouseEvent, colIndex: number) {
    e.preventDefault();
    colResizeRef.current = {
      colIndex,
      startX: e.clientX,
      startWidth: getColWidth(colIndex),
    };
  }

  function handleRowResizeStart(e: React.MouseEvent, rowIndex: number) {
    e.preventDefault();
    rowResizeRef.current = {
      rowIndex,
      startY: e.clientY,
      startHeight: getRowHeight(rowIndex),
    };
  }

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (colResizeRef.current) {
        const { colIndex, startX, startWidth } = colResizeRef.current;
        const delta = e.clientX - startX;
        const newWidth = Math.max(MIN_COL_WIDTH, startWidth + delta);
        setColWidth(colIndex, newWidth);
      }
      if (rowResizeRef.current) {
        const { rowIndex, startY, startHeight } = rowResizeRef.current;
        const delta = e.clientY - startY;
        const newHeight = Math.max(MIN_ROW_HEIGHT, startHeight + delta);
        setRowHeight(rowIndex, newHeight);
      }
    }

    function handleMouseUp() {
      colResizeRef.current = null;
      rowResizeRef.current = null;
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [setColWidth, setRowHeight]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!selectedCellId) return;
      if (editingCellId) return;

      const { row, col } = cellIdToAddress(selectedCellId);

      const moves: Record<string, { r: number; c: number }> = {
        ArrowUp: { r: -1, c: 0 },
        ArrowDown: { r: 1, c: 0 },
        ArrowLeft: { r: 0, c: -1 },
        ArrowRight: { r: 0, c: 1 },
        Tab: { r: 0, c: 1 },
        Enter: { r: 1, c: 0 },
      };

      const move = moves[e.key];
      if (move) {
        e.preventDefault();
        const newRow = Math.max(0, Math.min(ROWS - 1, row + move.r));
        const newCol = Math.max(0, Math.min(COLS - 1, col + move.c));
        setSelectedCell(addressToCellId({ row: newRow, col: newCol }));
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        setEditingCell(selectedCellId);
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        useSheetStore.getState().setCell(selectedCellId, '', '');
        onCellCommit(selectedCellId, '');
      }
    },
    [selectedCellId, editingCellId, setSelectedCell, setEditingCell, onCellCommit]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      className="flex-1 overflow-auto bg-white"
      style={{ scrollbarWidth: 'thin' }}
    >
      <table className="border-collapse" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr>
            {/* Corner cell */}
            <th
              style={{
                width: HEADER_WIDTH,
                minWidth: HEADER_WIDTH,
                height: DEFAULT_ROW_HEIGHT,
              }}
              className="sticky left-0 top-0 z-30 border-b border-r border-slate-200 bg-slate-50"
            />

            {/* Column headers */}
            {COL_LETTERS.map((letter, colIndex) => {
              const isActive = selectedAddress?.col === colIndex;
              const colWidth = getColWidth(colIndex);
              return (
                <th
                  key={letter}
                  style={{
                    width: colWidth,
                    minWidth: colWidth,
                    height: DEFAULT_ROW_HEIGHT,
                  }}
                  className={`sticky top-0 z-20 border-b border-r border-slate-200 text-center text-xs font-semibold select-none transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <div className="relative flex items-center justify-center h-full">
                    {letter}
                    <div
                      onMouseDown={(e) => handleColResizeStart(e, colIndex)}
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400 transition-colors group"
                      title="Drag to resize column"
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-0.5 bg-slate-300 group-hover:bg-blue-400 rounded-full" />
                    </div>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {Array.from({ length: ROWS }, (_, rowIndex) => {
            const isActiveRow = selectedAddress?.row === rowIndex;
            const rowHeight = getRowHeight(rowIndex);
            return (
              <tr key={rowIndex} className="group">
                {/* Row header */}
                <td
                  style={{
                    width: HEADER_WIDTH,
                    minWidth: HEADER_WIDTH,
                    height: rowHeight,
                  }}
                  className={`sticky left-0 z-10 border-b border-r border-slate-200 text-center text-xs font-semibold select-none transition-colors ${
                    isActiveRow
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'
                  }`}
                >
                  <div className="relative flex items-center justify-center h-full">
                    {rowIndex + 1}
                    <div
                      onMouseDown={(e) => handleRowResizeStart(e, rowIndex)}
                      className="absolute bottom-0 left-0 w-full h-1.5 cursor-row-resize hover:bg-blue-400 transition-colors group/row"
                      title="Drag to resize row"
                    >
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-slate-300 group-hover/row:bg-blue-400 rounded-full" />
                    </div>
                  </div>
                </td>

                {/* Cells */}
                {COL_LETTERS.map((_, colIndex) => {
                  const cellId = addressToCellId({ row: rowIndex, col: colIndex });
                  const colWidth = getColWidth(colIndex);
                  return (
                    <td
                      key={cellId}
                      style={{
                        width: colWidth,
                        height: rowHeight,
                        padding: 0,
                      }}
                      className="border-b border-r border-slate-100"
                    >
                      <Cell
                        cellId={cellId}
                        width={colWidth}
                        height={rowHeight}
                        onCommit={onCellCommit}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}