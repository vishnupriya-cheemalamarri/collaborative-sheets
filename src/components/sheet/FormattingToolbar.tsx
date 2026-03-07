'use client';

import { useSheetStore } from '@/store/sheetStore';
import { writeCell } from '@/lib/firebase/cells';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils/cn';
import { Bold, Italic, Palette, PaintBucket } from 'lucide-react';
import { useState, memo, useCallback, useMemo } from 'react';

const TEXT_COLORS = [
  '#000000', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899',
  '#ffffff', '#6b7280',
];

const BG_COLORS = [
  // Row 1: None + Neutrals
  'transparent', '#f1f5f9', '#e2e8f0', '#94a3b8',
  // Row 2: Reds & Oranges
  '#fee2e2', '#fca5a5', '#f97316', '#dc2626',
  // Row 3: Yellows & Greens
  '#fef08a', '#bbf7d0', '#4ade80', '#16a34a',
  // Row 4: Blues & Purples
  '#bfdbfe', '#60a5fa', '#6366f1', '#7c3aed',
  // Row 5: Pinks & Darks
  '#fbcfe8', '#f472b6', '#1e293b', '#000000',
];

interface ColorPickerProps {
  colors: string[];
  onSelect: (color: string) => void;
  onClose: () => void;
}

function ColorPicker({ colors, onSelect, onClose }: ColorPickerProps) {
  return (
    <div className="absolute top-full left-0 z-50 mt-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
      <div className="grid grid-cols-4 gap-1.5">
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => { onSelect(color); onClose(); }}
            className="h-7 w-7 rounded-md border border-slate-200 transition hover:scale-110 hover:shadow-md"
            style={{ backgroundColor: color === 'transparent' ? '#fff' : color }}
            title={color}
          >
            {color === 'transparent' && (
              <span className="flex items-center justify-center text-xs text-slate-400">∅</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

interface FormattingToolbarProps {
  docId: string;
}

function FormattingToolbarComponent({ docId }: FormattingToolbarProps) {
  const selectedCellId = useSheetStore((s) => s.selectedCellId);
  const cell = useSheetStore((s) =>
    selectedCellId ? s.cells[selectedCellId] : null
  );
  const setCellFormat = useSheetStore((s) => s.setCellFormat);
  const setSaveState = useSheetStore((s) => s.setSaveState);
  const { user } = useAuth();

  const [showTextColors, setShowTextColors] = useState(false);
  const [showBgColors, setShowBgColors] = useState(false);

  const format = useMemo(() => cell?.format ?? {}, [cell?.format]);

  const applyFormat = useCallback(async (newFormat: Record<string, unknown>) => {
    if (!selectedCellId || !user) return;

    const updatedFormat = { ...format, ...newFormat };
    setCellFormat(selectedCellId, updatedFormat);
    setSaveState('saving');

    try {
      const cells = useSheetStore.getState().cells;
      const existing = cells[selectedCellId];
      await writeCell(docId, selectedCellId, {
        value: existing?.value ?? '',
        computed: existing?.computed ?? '',
        updatedAt: Date.now(),
        updatedBy: user.uid,
        format: updatedFormat,
      });
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('error');
    }
  }, [selectedCellId, user, format, setCellFormat, setSaveState, docId]);

  const isDisabled = !selectedCellId;

  return (
    <div className="flex items-center gap-0.5 border-b border-slate-200 bg-white px-3 py-1.5">

      {/* Bold */}
      <button
        disabled={isDisabled}
        onClick={() => applyFormat({ bold: !format.bold })}
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition',
          format.bold
            ? 'bg-blue-100 text-blue-600'
            : 'text-slate-600 hover:bg-slate-100',
          isDisabled && 'opacity-40 cursor-not-allowed'
        )}
        title="Bold"
      >
        <Bold className="h-3.5 w-3.5" />
      </button>

      {/* Italic */}
      <button
        disabled={isDisabled}
        onClick={() => applyFormat({ italic: !format.italic })}
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-lg text-xs transition',
          format.italic
            ? 'bg-blue-100 text-blue-600'
            : 'text-slate-600 hover:bg-slate-100',
          isDisabled && 'opacity-40 cursor-not-allowed'
        )}
        title="Italic"
      >
        <Italic className="h-3.5 w-3.5" />
      </button>

      <div className="mx-1 h-5 w-px bg-slate-200" />

      {/* Text color */}
      <div className="relative">
        <button
          disabled={isDisabled}
          onClick={() => {
            setShowTextColors(!showTextColors);
            setShowBgColors(false);
          }}
          className={cn(
            'flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100',
            isDisabled && 'opacity-40 cursor-not-allowed'
          )}
          title="Text color"
        >
          <Palette className="h-3.5 w-3.5" />
          <div
            className="h-2.5 w-2.5 rounded-full border border-slate-300"
            style={{ backgroundColor: format.textColor ?? '#000000' }}
          />
        </button>
        {showTextColors && (
          <ColorPicker
            colors={TEXT_COLORS}
            onSelect={(color) => applyFormat({ textColor: color })}
            onClose={() => setShowTextColors(false)}
          />
        )}
      </div>

      {/* Background color */}
      <div className="relative">
        <button
          disabled={isDisabled}
          onClick={() => {
            setShowBgColors(!showBgColors);
            setShowTextColors(false);
          }}
          className={cn(
            'flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100',
            isDisabled && 'opacity-40 cursor-not-allowed'
          )}
          title="Cell background"
        >
          <PaintBucket className="h-3.5 w-3.5" />
          <div
            className="h-2.5 w-2.5 rounded-full border border-slate-300"
            style={{
              backgroundColor:
                format.bgColor === 'transparent' || !format.bgColor
                  ? '#ffffff'
                  : format.bgColor,
            }}
          />
        </button>
        {showBgColors && (
          <ColorPicker
            colors={BG_COLORS}
            onSelect={(color) => applyFormat({ bgColor: color })}
            onClose={() => setShowBgColors(false)}
          />
        )}
      </div>

      {/* Format indicator */}
      {selectedCellId && (format.bold || format.italic || format.textColor || format.bgColor) && (
        <>
          <div className="mx-1 h-5 w-px bg-slate-200" />
          <button
            onClick={() => applyFormat({ bold: false, italic: false, textColor: undefined, bgColor: undefined })}
            className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            Clear format
          </button>
        </>
      )}
    </div>
  );
}

export const FormattingToolbar = memo(FormattingToolbarComponent);