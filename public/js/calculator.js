/**
 * Calculator engine — pure logic, no DOM access.
 *
 * The expression is stored as a flat list of committed tokens
 * (number, operator, number, operator, …) plus the number currently
 * being typed (`current`). Evaluation respects standard order of
 * operations: × and ÷ are applied before + and −.
 */

/** Internal operator symbols mapped to their display glyphs. */
export const OPERATORS = Object.freeze({ '+': '+', '-': '−', '*': '×', '/': '÷' });

/** Maximum number of digits a user can type into a single number. */
export const MAX_DIGITS = 15;

/** Error thrown for mathematically invalid operations (e.g. ÷ 0). */
export class CalcError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CalcError';
  }
}

export const ERRORS = Object.freeze({
  divideByZero: "Can't divide by zero",
  overflow: 'Number too large',
});

/** Rounds away floating-point noise (0.1 + 0.2 → 0.3). */
export function normalize(n) {
  return parseFloat(n.toPrecision(15));
}

/** Converts a numeric result into the canonical string stored in state. */
export function formatResult(n) {
  if (!Number.isFinite(n)) throw new CalcError(ERRORS.overflow);
  if (n === 0) return '0'; // also collapses -0
  const value = normalize(n);
  if (Math.abs(value) >= 1e15) {
    return value.toExponential(9).replace(/\.?0+e/, 'e');
  }
  return String(value);
}

/**
 * Formats a raw number string for display: thousands separators,
 * a typographic minus sign, and any in-progress decimal kept intact
 * (so "12." still shows the trailing point while typing).
 */
export function formatNumber(str) {
  if (str === '' || str == null) return '';
  const negative = str.startsWith('-');
  const body = negative ? str.slice(1) : str;
  const sign = negative ? '−' : '';
  if (/e/i.test(body)) return sign + body.replace('e-', 'e−');
  const [intPart, decPart] = body.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return sign + grouped + (body.includes('.') ? `.${decPart}` : '');
}

/** Builds a human-readable expression, e.g. "12 + 3 × (−2)". */
export function expressionText(parts) {
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return OPERATORS[part];
      const text = formatNumber(part);
      return i > 0 && part.startsWith('-') ? `(${text})` : text;
    })
    .join(' ');
}

/**
 * Evaluates [number, op, number, op, number, …] with operator precedence.
 * Throws CalcError for division by zero or overflow.
 */
export function evaluate(parts) {
  if (parts.length === 0) return 0;

  // Pass 1: collapse × and ÷ into terms.
  const terms = [Number(parts[0])];
  const additive = [];
  for (let i = 1; i < parts.length; i += 2) {
    const op = parts[i];
    const n = Number(parts[i + 1]);
    const last = terms.length - 1;
    if (op === '*') {
      terms[last] *= n;
    } else if (op === '/') {
      if (n === 0) throw new CalcError(ERRORS.divideByZero);
      terms[last] /= n;
    } else {
      additive.push(op);
      terms.push(n);
    }
  }

  // Pass 2: apply + and − left to right.
  let result = terms[0];
  additive.forEach((op, i) => {
    result = op === '+' ? result + terms[i + 1] : result - terms[i + 1];
  });

  if (!Number.isFinite(result)) throw new CalcError(ERRORS.overflow);
  return normalize(result);
}

/** Strips an unfinished trailing "." and normalises the number string. */
function commit(str) {
  return formatResult(Number(str.endsWith('.') ? str.slice(0, -1) : str));
}

function digitCount(str) {
  return str.replace(/\D/g, '').length;
}

export class Calculator {
  /**
   * @param {{ onResult?: (entry: { expression: string, result: string }) => void }} [options]
   *   onResult is called after every successful "=" that combined at least two numbers.
   */
  constructor({ onResult } = {}) {
    this.onResult = onResult ?? (() => {});
    this.clear();
  }

  /** AC — resets everything. */
  clear() {
    this.tokens = [];        // committed: ['12', '+', '3', '*']
    this.current = '0';      // number being typed; '' while awaiting an operand
    this.overwrite = false;  // next digit replaces `current` (after = or %)
    this.error = null;       // friendly error message, if any
    this.lastExpression = ''; // shown above the result after "="
  }

  /** Common entry step for input: leaves error state and hides the old expression. */
  #begin() {
    if (this.error) this.clear();
    this.lastExpression = '';
  }

  inputDigit(digit) {
    this.#begin();
    if (this.overwrite || this.current === '' || this.current === '0') {
      this.current = digit;
    } else if (this.current === '-0') {
      this.current = `-${digit}`;
    } else if (digitCount(this.current) < MAX_DIGITS) {
      this.current += digit;
    }
    this.overwrite = false;
  }

  inputDecimal() {
    this.#begin();
    if (this.overwrite || this.current === '') {
      this.current = '0.';
    } else if (!this.current.includes('.') && !/e/i.test(this.current)) {
      this.current += '.';
    }
    this.overwrite = false;
  }

  inputOperator(op) {
    if (!(op in OPERATORS)) return;
    if (this.error) {
      this.clear();
      return;
    }
    this.lastExpression = '';
    if (this.current === '') {
      // Operator pressed twice in a row — replace the previous one.
      this.tokens[this.tokens.length - 1] = op;
      return;
    }
    this.tokens.push(commit(this.current), op);
    this.current = '';
    this.overwrite = false;
  }

  /**
   * "=" — evaluates the expression.
   * @returns {{ expression: string, result: string } | { error: string } | null}
   */
  equals() {
    if (this.error) {
      this.clear();
      return null;
    }
    if (this.tokens.length === 0) return null;

    const parts = [...this.tokens];
    if (this.current === '') parts.pop(); // ignore a dangling operator
    else parts.push(commit(this.current));

    const expression = expressionText(parts);
    let result;
    try {
      result = formatResult(evaluate(parts));
    } catch (err) {
      if (!(err instanceof CalcError)) throw err;
      this.clear();
      this.error = err.message;
      this.lastExpression = expression;
      return { error: err.message };
    }

    this.tokens = [];
    this.current = result;
    this.overwrite = true;
    this.lastExpression = `${expression} =`;

    if (parts.length >= 3) {
      const entry = { expression, result };
      this.onResult(entry);
      return entry;
    }
    return { expression, result };
  }

  /** DEL — removes the last typed character (or the last operator). */
  backspace() {
    if (this.error || this.overwrite) {
      // Results and errors aren't editable digit-by-digit; start fresh.
      this.clear();
      return;
    }
    this.lastExpression = '';
    if (this.current !== '') {
      const next = /e/i.test(this.current) ? '' : this.current.slice(0, -1);
      if (next === '' || next === '-') {
        this.current = this.tokens.length ? '' : '0';
      } else {
        this.current = next;
      }
      return;
    }
    // Awaiting an operand: remove the operator and resume editing the number before it.
    this.tokens.pop();
    this.current = this.tokens.pop() ?? '0';
  }

  /** +/− — flips the sign of the current number. */
  toggleSign() {
    this.#begin();
    if (this.current === '') {
      this.current = '-0';
      this.overwrite = false;
    } else if (this.current.startsWith('-')) {
      this.current = this.current.slice(1);
    } else {
      this.current = `-${this.current}`;
    }
  }

  /**
   * % — converts the current number into a percentage.
   * After + or − it's a percentage of the preceding value (200 + 10% → 200 + 20);
   * otherwise it divides by 100 (50 × 10% → 50 × 0.1).
   */
  percent() {
    this.#begin();
    if (this.current === '') return;
    const value = Number(commit(this.current));
    const prevOp = this.tokens[this.tokens.length - 1];
    try {
      let result;
      if (prevOp === '+' || prevOp === '-') {
        const base = evaluate(this.tokens.slice(0, -1));
        result = (base * value) / 100;
      } else {
        result = value / 100;
      }
      this.current = formatResult(result);
      this.overwrite = true;
    } catch (err) {
      if (!(err instanceof CalcError)) throw err;
      this.clear();
      this.error = err.message;
    }
  }

  /** Inserts a value (e.g. from history) as the current number. */
  loadValue(value) {
    this.#begin();
    this.current = commit(String(value));
    this.overwrite = true;
  }

  /** Snapshot for rendering. */
  getState() {
    if (this.error) {
      return {
        expression: this.lastExpression,
        display: this.error,
        preview: '',
        isError: true,
        pendingOperator: null,
      };
    }

    const awaiting = this.current === '';
    const shownNumber = awaiting ? this.tokens[this.tokens.length - 2] : this.current;

    let preview = '';
    if (this.tokens.length && !awaiting) {
      try {
        preview = formatNumber(formatResult(evaluate([...this.tokens, commit(this.current)])));
      } catch {
        preview = '';
      }
    }

    return {
      expression: this.lastExpression || expressionText(this.tokens),
      display: formatNumber(shownNumber ?? '0'),
      preview,
      isError: false,
      pendingOperator: awaiting ? this.tokens[this.tokens.length - 1] : null,
    };
  }
}
