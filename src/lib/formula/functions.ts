export const FUNCTIONS: Record<string, (args: number[]) => number> = {
  SUM: (args) => args.reduce((a, b) => a + b, 0),
  AVERAGE: (args) => args.reduce((a, b) => a + b, 0) / args.length,
  MIN: (args) => Math.min(...args),
  MAX: (args) => Math.max(...args),
  COUNT: (args) => args.length,
};