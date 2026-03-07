import type { CellAddress, CellId } from '@/types/cell';

const COL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function colIndexToLetter(index: number): string {
  let letter = '';
  let n = index;
  while (n >= 0) {
    letter = (COL_LETTERS[n % 26] ?? '') + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

export function colLetterToIndex(letter: string): number {
  return letter.toUpperCase().split('').reduce((acc, char) => {
    return acc * 26 + (char.charCodeAt(0) - 64);
  }, 0) - 1;
}

export function addressToCellId({ row, col }: CellAddress): CellId {
  return `${colIndexToLetter(col)}${row + 1}`;
}

export function cellIdToAddress(cellId: CellId): CellAddress {
  const match = cellId.match(/^([A-Z]+)(\d+)$/);
  if (!match || !match[1] || !match[2]) {
    throw new Error(`Invalid cell ID: ${cellId}`);
  }
  return {
    row: parseInt(match[2], 10) - 1,
    col: colLetterToIndex(match[1]),
  };
}