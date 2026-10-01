/**
 * Maps keyboard keys to calculator commands.
 * Each command matches a keypad button's data-action / data-value.
 */

const KEY_MAP = {
  '+': { action: 'operator', value: '+' },
  '-': { action: 'operator', value: '-' },
  '−': { action: 'operator', value: '-' },
  '*': { action: 'operator', value: '*' },
  x: { action: 'operator', value: '*' },
  X: { action: 'operator', value: '*' },
  '×': { action: 'operator', value: '*' },
  '/': { action: 'operator', value: '/' },
  '÷': { action: 'operator', value: '/' },
  '.': { action: 'decimal' },
  ',': { action: 'decimal' },
  Enter: { action: 'equals' },
  '=': { action: 'equals' },
  Backspace: { action: 'delete' },
  Escape: { action: 'clear' },
  Delete: { action: 'clear' },
  c: { action: 'clear' },
  C: { action: 'clear' },
  '%': { action: 'percent' },
  F9: { action: 'sign' },
  n: { action: 'sign' },
  N: { action: 'sign' },
};

/** @returns {{ action: string, value?: string } | null} */
export function commandForKey(key) {
  if (/^[0-9]$/.test(key)) return { action: 'digit', value: key };
  return KEY_MAP[key] ?? null;
}
