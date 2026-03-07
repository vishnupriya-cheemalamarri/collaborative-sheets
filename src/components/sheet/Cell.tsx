'use client';

import { useRef, useEffect, memo } from 'react';
import { useSheetStore } from '@/store/sheetStore';
import { computeCellValue } from '@/lib/formula/evaluator';
import { cn } from '@/lib/utils/cn';
import type { CellId } from '@/types/cell';

interface CellProps {
  cellId: CellId;
  width?: number;
  height?: number;
  onCommit: (cellId: CellId, value: string) => void;
}

function CellComponent({ cellId, width = 120, height = 26, onCommit }: CellProps) {
  const cell = useSheetStore((s) => s.cells[cellId]);
  const selectedCellId = useSheetStore((s) => s.selectedCellId);
  const editingCellId = useSheetStore((s) => s.editingCellId);
  const editingValue = useSheetStore((s) => s.editingValue);
  const setSelectedCell = useSheetStore((s) => s.setSelectedCell);
  const setEditingCell = useSheetStore((s) => s.setEditingCell);
  const setEditingValue = useSheetStore((s) => s.setEditingValue);
  const presenceMap = useSheetStore((s) => s.presenceMap);
  const cells = useSheetStore((s) => s.cells);

  const isSelected = selectedCellId === cellId;
  const isEditing = editingCellId === cellId;

  const collaboratorsOnCell = Object.values(presenceMap).filter(
    (u) => u.activeCellId === cellId
  );
  const collaboratorColor = collaboratorsOnCell[0]?.color ?? null;
  const collaboratorName = collaboratorsOnCell[0]?.displayName ?? null;

  const format = cell?.format ?? {};
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      const input = inputRef.current;
      if (input) {
        setTimeout(() => {
          input.focus();
          const len = editingValue.length;
          input.setSelectionRange(len, len);
        }, 0);
      }
    }
  }, [isEditing, editingValue]);

  function handleCommit(value: string) {
    const computed = computeCellValue(value, cells, cellId);
    onCommit(cellId, value);
    useSheetStore.getState().setCell(cellId, value, computed);
    setEditingCell(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommit(editingValue);
    }
    if (e.key === 'Escape') {
      setEditingCell(null);
    }
  }

  const displayValue = cell?.computed ?? '';
  const isError = displayValue.startsWith('#');
  const isFormula = cell?.value?.startsWith('=') ?? false;

  return (
    <div
      style={{
        width,
        height,
        minWidth: width,
        backgroundColor: format.bgColor && format.bgColor !== 'transparent'
          ? format.bgColor
          : undefined,
        boxShadow: collaboratorColor
          ? `inset 0 0 0 2px ${collaboratorColor}`
          : isSelected && !isEditing
          ? 'inset 0 0 0 2px #3b82f6'
          : undefined,
      }}
      className={cn(
        'relative border-b border-r border-slate-100 text-xs cursor-default transition-colors',
        isSelected && !isEditing && 'bg-blue-50/50 z-10',
        !isSelected && !format.bgColor && 'hover:bg-slate-50',
        isEditing && 'z-20',
      )}
      onClick={() => {
        setSelectedCell(cellId);
        setEditingCell(null);
      }}
      onDoubleClick={() => {
        setSelectedCell(cellId);
        setEditingCell(cellId);
      }}
    >
      {/* Collaborator name tag */}
      {collaboratorColor && collaboratorName && (
        <div
          className="absolute -top-5 left-0 z-50 px-1.5 py-0.5 text-white rounded-sm text-xs font-semibold whitespace-nowrap pointer-events-none shadow-md"
          style={{ backgroundColor: collaboratorColor }}
        >
          {collaboratorName}
        </div>
      )}

      {isEditing ? (
        <input
          ref={inputRef}
          autoFocus
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => handleCommit(editingValue)}
          className="absolute inset-0 w-full h-full px-1.5 text-xs outline-none border-none bg-white z-20"
          style={{ height, lineHeight: `${height}px`, color: '#000' }}
        />
      ) : (
        <span
          style={{
            color: isError
              ? '#ef4444'
              : format.textColor ?? (isFormula ? '#3b82f6' : '#0f172a'),
            fontWeight: format.bold ? 'bold' : 'normal',
            fontStyle: format.italic ? 'italic' : 'normal',
          }}
          className="absolute inset-0 flex items-center px-1.5 overflow-hidden whitespace-nowrap"
        >
          {displayValue}
        </span>
      )}
    </div>
  );
}

export const Cell = memo(CellComponent);