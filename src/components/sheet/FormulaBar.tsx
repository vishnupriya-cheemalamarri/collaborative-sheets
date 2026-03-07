'use client';

import { useState, memo, useCallback, useRef, useEffect } from 'react';
import { useSheetStore } from '@/store/sheetStore';
import { computeCellValue } from '@/lib/formula/evaluator';
import { cn } from '@/lib/utils/cn';

function FormulaBarComponent() {
  const selectedCellId  = useSheetStore((s) => s.selectedCellId);
  const editingCellId   = useSheetStore((s) => s.editingCellId);
  const editingValue    = useSheetStore((s) => s.editingValue);
  const cell            = useSheetStore((s) => selectedCellId ? s.cells[selectedCellId] : null);
  const setCell         = useSheetStore((s) => s.setCell);
  const setEditingCell  = useSheetStore((s) => s.setEditingCell);
  const setEditingValue = useSheetStore((s) => s.setEditingValue);

  const [focused, setFocused] = useState(false);

  const isEditing = editingCellId === selectedCellId && selectedCellId !== null;

  // ── FIX: derive display value cleanly without a useEffect ──
  // The old code had a useEffect with a comment body that did nothing,
  // and used `currentValue` as both derived state and an effect dependency
  // which created a stale closure. We derive it directly instead:
  //   • While editing → show the live editingValue from the store
  //   • While not editing → show the raw formula/value from the cell
  const displayValue = isEditing ? editingValue : (cell?.value ?? '');

  // ── FIX: use a ref to always read the latest displayValue in callbacks ──
  // Callbacks like handleCommit are wrapped in useCallback so they don't
  // change on every render, but they need the current displayValue.
  // A ref gives them a stable reference without stale closure issues.
  const displayValueRef = useRef(displayValue);
  useEffect(() => {
    displayValueRef.current = displayValue;
  }, [displayValue]);

  const handleCommit = useCallback(() => {
    if (!selectedCellId) return;
    const value = displayValueRef.current;
    const cells = useSheetStore.getState().cells;
    const computed = computeCellValue(value, cells, selectedCellId);
    setCell(selectedCellId, value, computed);
    setEditingCell(null);
    setFocused(false);
  }, [selectedCellId, setCell, setEditingCell]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Only update the store when the user is actively editing.
    // If the bar isn't in edit mode yet, start editing first.
    if (!selectedCellId) return;
    if (!isEditing) setEditingCell(selectedCellId);
    setEditingValue(e.target.value);
  }, [selectedCellId, isEditing, setEditingCell, setEditingValue]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommit();
    }
    if (e.key === 'Escape') {
      setEditingCell(null);
      setFocused(false);
    }
  }, [handleCommit, setEditingCell]);

  const handleFocus = useCallback(() => {
    setFocused(true);
    if (selectedCellId) setEditingCell(selectedCellId);
  }, [selectedCellId, setEditingCell]);

  const isFormula = displayValue.startsWith('=');

  return (
    <div
      className={cn(
        'flex items-center gap-2 border-b px-3 py-1.5 transition-all duration-200',
        focused
          ? 'border-blue-200 bg-white shadow-sm'
          : 'border-slate-200 bg-slate-50/80'
      )}
    >
      {/* Cell address display */}
      <div
        className={cn(
          'flex h-7 min-w-[52px] items-center justify-center rounded-lg border px-2 text-xs font-bold transition-all duration-200',
          focused
            ? 'border-blue-200 bg-blue-50 text-blue-600'
            : 'border-slate-200 bg-white text-slate-500'
        )}
      >
        {selectedCellId ?? ''}
      </div>

      <div className="h-5 w-px bg-slate-200" />

      {/* fx label */}
      <div
        className={cn(
          'flex h-6 items-center rounded-md px-1.5 text-xs font-semibold italic transition-colors',
          isFormula ? 'bg-blue-100 text-blue-600' : 'text-slate-400'
        )}
      >
        fx
      </div>

      {/* Formula / value input */}
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleCommit}
        placeholder={selectedCellId ? 'Type a value or formula...' : ''}
        disabled={!selectedCellId}
        className={cn(
          'flex-1 bg-transparent text-xs outline-none placeholder-slate-300',
          'disabled:cursor-default font-medium transition-colors',
          isFormula ? 'text-blue-600' : 'text-slate-800'
        )}
      />

      {/* Confirm button */}
      {selectedCellId && (
        <button
          onClick={handleCommit}
          className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-colors"
          title="Apply (Enter)"
        >
          ✓
        </button>
      )}

      {/* Formula badge */}
      {isFormula && (
        <div className="hidden sm:flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs text-blue-500 font-medium">
          Formula
        </div>
      )}
    </div>
  );
}

export const FormulaBar = memo(FormulaBarComponent);