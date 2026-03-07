import type { SheetCells } from '@/types/cell';
import { cellIdToAddress, addressToCellId } from './cellAddress';

export function exportToCsv(cells: SheetCells, title: string): void {
  // Find bounds of data
  let maxRow = 0;
  let maxCol = 0;

  Object.keys(cells).forEach((cellId) => {
    const cell = cells[cellId];
    if (!cell || cell.value === '') return;
    const { row, col } = cellIdToAddress(cellId);
    if (row > maxRow) maxRow = row;
    if (col > maxCol) maxCol = col;
  });

  // Build CSV rows
  const rows: string[] = [];

  for (let row = 0; row <= maxRow; row++) {
    const cols: string[] = [];
    for (let col = 0; col <= maxCol; col++) {
      const cellId = addressToCellId({ row, col });
      const cell = cells[cellId];
      const value = cell?.computed ?? '';

      // Escape commas and quotes
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        cols.push(`"${value.replace(/"/g, '""')}"`);
      } else {
        cols.push(value);
      }
    }
    rows.push(cols.join(','));
  }

  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  // Trigger download
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/[^a-z0-9]/gi, '_')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}