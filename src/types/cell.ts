export interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  textColor?: string;
  bgColor?: string;
}

export interface CellData {
  value: string;
  computed: string;
  updatedAt: number;
  updatedBy: string;
  format?: CellFormat;
}

export interface CellAddress {
  row: number;
  col: number;
}

export type CellId = string;
export type SheetCells = Record<CellId, CellData>;