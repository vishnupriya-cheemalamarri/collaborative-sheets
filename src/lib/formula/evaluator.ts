import type { SheetCells } from '@/types/cell';
import { cellIdToAddress, addressToCellId } from '@/lib/utils/cellAddress';
import { FUNCTIONS } from './functions';

// ─── Cell Helpers ─────────────────────────────────────────────────────────────

function getCellNumber(cells: SheetCells, cellId: string): number {
  const cell = cells[cellId];
  if (!cell) return 0;
  const source = cell.value.startsWith('=') ? cell.computed : cell.value;
  const num = parseFloat(source);
  return isNaN(num) ? 0 : num;
}

function expandRange(start: string, end: string): string[] {
  const startAddr = cellIdToAddress(start);
  const endAddr   = cellIdToAddress(end);
  const cellIds: string[] = [];
  for (let row = startAddr.row; row <= endAddr.row; row++) {
    for (let col = startAddr.col; col <= endAddr.col; col++) {
      cellIds.push(addressToCellId({ row, col }));
    }
  }
  return cellIds;
}

// ─── Tokeniser ────────────────────────────────────────────────────────────────
//
// Converts a formula expression string into a flat list of tokens.
// Supported token kinds:
//   NUMBER   – numeric literal, e.g. 42 or 3.14
//   CELL     – cell reference, e.g. A1 or B12
//   RANGE    – range reference, e.g. A1:B3
//   FUNC     – function name immediately followed by '(', e.g. SUM
//   OP       – arithmetic operator + - * /
//   LPAREN   – (
//   RPAREN   – )
//   COMMA    – ,

type TokenKind = 'NUMBER' | 'CELL' | 'RANGE' | 'FUNC' | 'OP' | 'LPAREN' | 'RPAREN' | 'COMMA';

interface Token {
  kind: TokenKind;
  value: string;
}

function tokenise(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i]!;

    // Skip whitespace
    if (/\s/.test(ch)) { i++; continue; }

    // Number literal
    if (/[0-9.]/.test(ch)) {
      let num = '';
      while (i < expr.length && /[0-9.]/.test(expr[i]!)) num += expr[i++];
      tokens.push({ kind: 'NUMBER', value: num });
      continue;
    }

    // Identifier — could be FUNC, RANGE, or CELL
    if (/[A-Za-z]/.test(ch)) {
      let ident = '';
      while (i < expr.length && /[A-Za-z0-9]/.test(expr[i]!)) ident += expr[i++];
      const upper = ident.toUpperCase();

      // Peek ahead for range colon, e.g. A1:B3
      if (i < expr.length && expr[i] === ':') {
        i++; // consume ':'
        let endIdent = '';
        while (i < expr.length && /[A-Za-z0-9]/.test(expr[i]!)) endIdent += expr[i++];
        tokens.push({ kind: 'RANGE', value: `${upper}:${endIdent.toUpperCase()}` });
        continue;
      }

      // Peek ahead for function call '('
      if (i < expr.length && expr[i] === '(') {
        tokens.push({ kind: 'FUNC', value: upper });
        continue;
      }

      // Otherwise it's a cell reference
      tokens.push({ kind: 'CELL', value: upper });
      continue;
    }

    // Operators and punctuation
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      tokens.push({ kind: 'OP', value: ch });
      i++; continue;
    }
    if (ch === '(') { tokens.push({ kind: 'LPAREN',  value: ch }); i++; continue; }
    if (ch === ')') { tokens.push({ kind: 'RPAREN',  value: ch }); i++; continue; }
    if (ch === ',') { tokens.push({ kind: 'COMMA',   value: ch }); i++; continue; }

    // Unknown character — abort with a signal the caller will catch
    throw new Error(`Unexpected character: ${ch}`);
  }

  return tokens;
}

// ─── Recursive Descent Parser / Evaluator ────────────────────────────────────
//
// Grammar (standard operator precedence):
//
//   expr     → term   (('+' | '-') term)*
//   term     → unary  (('*' | '/') unary)*
//   unary    → '-' unary | primary
//   primary  → NUMBER | CELL | FUNC '(' arglist ')' | '(' expr ')'
//   arglist  → (expr | RANGE) (',' (expr | RANGE))*

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(
    tokens: Token[],
    private readonly cells: SheetCells,
    private readonly visiting: Set<string>,
  ) {
    this.tokens = tokens;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    const t = this.tokens[this.pos];
    if (!t) throw new Error('Unexpected end of expression');
    this.pos++;
    return t;
  }

  private expect(kind: TokenKind): Token {
    const t = this.consume();
    if (t.kind !== kind) throw new Error(`Expected ${kind}, got ${t.kind}`);
    return t;
  }

  // expr → term (('+' | '-') term)*
  parseExpr(): number {
    let left = this.parseTerm();
    while (this.peek()?.kind === 'OP' && (this.peek()!.value === '+' || this.peek()!.value === '-')) {
      const op = this.consume().value;
      const right = this.parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  // term → unary (('*' | '/') unary)*
  private parseTerm(): number {
    let left = this.parseUnary();
    while (this.peek()?.kind === 'OP' && (this.peek()!.value === '*' || this.peek()!.value === '/')) {
      const op = this.consume().value;
      const right = this.parseUnary();
      if (op === '/' && right === 0) throw new Error('#DIV/0!');
      left = op === '*' ? left * right : left / right;
    }
    return left;
  }

  // unary → '-' unary | primary
  private parseUnary(): number {
    if (this.peek()?.kind === 'OP' && this.peek()!.value === '-') {
      this.consume();
      return -this.parseUnary();
    }
    return this.parsePrimary();
  }

  // primary → NUMBER | CELL | FUNC '(' arglist ')' | '(' expr ')'
  private parsePrimary(): number {
    const t = this.peek();
    if (!t) throw new Error('Unexpected end of expression');

    if (t.kind === 'NUMBER') {
      this.consume();
      const n = parseFloat(t.value);
      if (isNaN(n)) throw new Error('#VALUE!');
      return n;
    }

    if (t.kind === 'CELL') {
      this.consume();
      if (this.visiting.has(t.value)) throw new Error('#CIRC!');
      return getCellNumber(this.cells, t.value);
    }

    if (t.kind === 'FUNC') {
      this.consume();
      const fnName = t.value;
      const fn = FUNCTIONS[fnName];
      if (!fn) throw new Error('#NAME?');

      this.expect('LPAREN');
      const args = this.parseArgList();
      this.expect('RPAREN');

      return fn(args);
    }

    if (t.kind === 'LPAREN') {
      this.consume();
      const val = this.parseExpr();
      this.expect('RPAREN');
      return val;
    }

    throw new Error(`Unexpected token: ${t.kind} (${t.value})`);
  }

  // arglist → (expr | RANGE) (',' (expr | RANGE))*
  // Returns a flat number[] — ranges are expanded and each cell resolved
  private parseArgList(): number[] {
    const args: number[] = [];
    if (this.peek()?.kind === 'RPAREN') return args; // empty arg list

    args.push(...this.parseArg());

    while (this.peek()?.kind === 'COMMA') {
      this.consume();
      args.push(...this.parseArg());
    }

    return args;
  }

  // A single argument is either a RANGE token or a full expr
  private parseArg(): number[] {
    if (this.peek()?.kind === 'RANGE') {
      const t = this.consume();
      const [start, end] = t.value.split(':') as [string, string];
      return expandRange(start, end).map((id) => getCellNumber(this.cells, id));
    }
    return [this.parseExpr()];
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function evaluateFormula(
  formula: string,
  cells: SheetCells,
  visiting: Set<string> = new Set(),
): string {
  try {
    const expr = formula.slice(1).trim().toUpperCase();
    const tokens = tokenise(expr);
    const parser = new Parser(tokens, cells, visiting);
    const result = parser.parseExpr();

    if (!isFinite(result)) return '#DIV/0!';
    // Trim floating-point noise (e.g. 0.10000000000000001 → 0.1)
    return parseFloat(result.toFixed(10)).toString();
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    // Propagate known error codes directly
    if (msg.startsWith('#')) return msg.split('!')[0] + '!';
    return '#ERROR!';
  }
}

export function computeCellValue(
  rawValue: string,
  cells: SheetCells,
  cellId: string,
): string {
  if (!rawValue.startsWith('=')) return rawValue;
  const visiting = new Set([cellId.toUpperCase()]);
  return evaluateFormula(rawValue, cells, visiting);
}

export function recomputeAllFormulas(cells: SheetCells): SheetCells {
  const updated = { ...cells };
  for (const [cellId, cell] of Object.entries(cells)) {
    if (cell.value.startsWith('=')) {
      updated[cellId] = {
        ...cell,
        computed: computeCellValue(cell.value, cells, cellId),
      };
    }
  }
  return updated;
}