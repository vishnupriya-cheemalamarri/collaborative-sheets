export type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'CELL_REF'
  | 'RANGE'
  | 'FUNCTION'
  | 'OPERATOR'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'COLON';

export interface Token {
  type: TokenType;
  value: string;
}

export type FormulaResult = string | number | boolean;
export type FormulaError = '#REF!' | '#CIRC!' | '#DIV/0!' | '#VALUE!' | '#NAME?';
export type CellValue = FormulaResult | FormulaError;