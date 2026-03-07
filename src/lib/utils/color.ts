const PRESENCE_COLORS = [
  '#E53E3E', '#DD6B20', '#D69E2E', '#38A169',
  '#319795', '#3182CE', '#805AD5', '#D53F8C',
  '#2B6CB0', '#276749', '#744210', '#702459',
] as const;

export function getUserColor(uid: string): string {
  const hash = uid.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
  return PRESENCE_COLORS[hash % PRESENCE_COLORS.length] ?? PRESENCE_COLORS[0];
}