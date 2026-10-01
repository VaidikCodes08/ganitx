import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Calculator, evaluate, formatNumber, formatResult, ERRORS } from '../public/js/calculator.js';

/** Feeds a key sequence like "12+3*2=" into a calculator. */
function press(calc, keys) {
  const ops = { '+': '+', '-': '-', '*': '*', '/': '/' };
  for (const key of keys) {
    if (/\d/.test(key)) calc.inputDigit(key);
    else if (key === '.') calc.inputDecimal();
    else if (key in ops) calc.inputOperator(ops[key]);
    else if (key === '=') calc.equals();
    else if (key === '%') calc.percent();
    else if (key === 'n') calc.toggleSign();
    else if (key === '<') calc.backspace();
    else if (key === 'C') calc.clear();
    else throw new Error(`Unknown key ${key}`);
  }
  return calc;
}

const run = (keys) => press(new Calculator(), keys).getState();

test('digits and display formatting', () => {
  assert.equal(run('').display, '0');
  assert.equal(run('007').display, '7');
  assert.equal(run('1234567').display, '1,234,567');
  assert.equal(run('1234.50').display, '1,234.50');
  assert.equal(run('12.').display, '12.');
  assert.equal(run('1234567890123456789').display, '123,456,789,012,345', 'caps at 15 digits');
});

test('decimal point', () => {
  assert.equal(run('.').display, '0.');
  assert.equal(run('1.2.3').display, '1.23');
  assert.equal(run('1+.5=').display, '1.5');
  assert.equal(run('0.1+0.2=').display, '0.3', 'floating point noise removed');
});

test('basic operations', () => {
  assert.equal(run('7+5=').display, '12');
  assert.equal(run('7-9=').display, '−2');
  assert.equal(run('6*7=').display, '42');
  assert.equal(run('9/4=').display, '2.25');
  assert.equal(run('1/3=').display, '0.333333333333333');
  assert.equal(run('1/3*3=').display, '1');
});

test('order of operations', () => {
  assert.equal(run('2+3*4=').display, '14');
  assert.equal(run('10-6/2=').display, '7');
  assert.equal(run('2*3+4*5=').display, '26');
  assert.equal(run('100/10/2=').display, '5', 'left-to-right division');
  assert.equal(run('10-2-3=').display, '5', 'left-to-right subtraction');
  assert.equal(run('1+2*3-4/2=').display, '5');
  assert.equal(evaluate(['8', '-', '2', '*', '3', '+', '1']), 3);
});

test('division by zero shows a friendly error and recovers', () => {
  const calc = press(new Calculator(), '5/0=');
  let s = calc.getState();
  assert.equal(s.isError, true);
  assert.equal(s.display, ERRORS.divideByZero);
  assert.equal(s.expression, '5 ÷ 0');
  press(calc, '3');
  s = calc.getState();
  assert.equal(s.isError, false);
  assert.equal(s.display, '3');
  assert.equal(run('2+6/0*3=').display, ERRORS.divideByZero);
  assert.equal(run('5/0=+').display, '0', 'operator after error resets');
  assert.equal(run('5/0=<').display, '0', 'DEL after error resets');
  assert.equal(run('0/5=').display, '0');
});

test('overflow is reported', () => {
  assert.equal(run('999999999999999*999999999999999*999999999999999*999999999999999*999999999999999*999999999999999*999999999999999*999999999999999*999999999999999*999999999999999*999999999999999*999999999999999*999999999999999*999999999999999*999999999999999*999999999999999*999999999999999*999999999999999*999999999999999*999999999999999*999999999999999*999999999999999=').display, ERRORS.overflow);
});

test('large results use exponent notation', () => {
  assert.equal(run('99999999*99999999=').display, '9.9999998e+15');
  assert.equal(run('999999999*999999999=').display, '9.99999998e+17');
});

test('equals behaviour', () => {
  const s = run('2+3=');
  assert.equal(s.expression, '2 + 3 =');
  assert.equal(run('2+3=4').display, '4', 'typing after = starts fresh');
  assert.equal(run('2+3=*2=').display, '10', 'operator after = continues with result');
  assert.equal(run('2+=').display, '2', 'dangling operator ignored');
  assert.equal(run('=').display, '0');
  assert.equal(run('5=').display, '5');
});

test('operator replacement', () => {
  const s = run('5+*');
  assert.equal(s.expression, '5 ×');
  assert.equal(s.pendingOperator, '*');
  assert.equal(run('5+*2=').display, '10');
  assert.equal(run('5-+2=').display, '7');
});

test('AC clears everything', () => {
  const s = run('12+3*C');
  assert.equal(s.display, '0');
  assert.equal(s.expression, '');
});

test('DEL removes the last character or operator', () => {
  assert.equal(run('123<').display, '12');
  assert.equal(run('1<').display, '0');
  assert.equal(run('1<<').display, '0');
  assert.equal(run('1.5<').display, '1.');
  assert.equal(run('n5<').display, '0');
  let s = run('12+<');
  assert.equal(s.display, '12');
  assert.equal(s.expression, '');
  assert.equal(run('12+<3=').display, '123');
  s = run('12+3<');
  assert.equal(s.display, '12', 'awaiting operand shows previous number');
  assert.equal(s.expression, '12 +');
  assert.equal(run('12+3<4=').display, '16');
  assert.equal(run('2+3=<').display, '0', 'DEL on a result clears');
});

test('+/− toggles sign', () => {
  assert.equal(run('5n').display, '−5');
  assert.equal(run('5nn').display, '5');
  assert.equal(run('n').display, '−0');
  assert.equal(run('n7').display, '−7');
  assert.equal(run('3*n2=').display, '−6');
  assert.equal(run('3*n2').expression, '3 ×');
  assert.equal(run('3n*2=').display, '−6');
  assert.equal(run('2+3=n').display, '−5');
  assert.equal(run('5*n').display, '−0');
  assert.equal(run('4*2n=').display, '−8');
  assert.equal(new Calculator().getState().display, '0');
  const expr = press(new Calculator(), '4*2n=').getState().expression;
  assert.equal(expr, '4 × (−2) =');
});

test('% percentage', () => {
  assert.equal(run('50%').display, '0.5');
  assert.equal(run('200+10%').display, '20');
  assert.equal(run('200+10%=').display, '220');
  assert.equal(run('200-10%=').display, '180');
  assert.equal(run('50*10%=').display, '5');
  assert.equal(run('50/10%=').display, '500');
  assert.equal(run('50%3').display, '3', 'digit after % starts a new number');
  assert.equal(run('5+%').display, '5', '% with no operand is ignored');
  assert.equal(run('10+5*2+10%=').display, '22', 'percentage of preceding value with precedence');
});

test('history callback receives completed calculations', () => {
  const entries = [];
  const calc = new Calculator({ onResult: (e) => entries.push(e) });
  press(calc, '2+3*4=');
  press(calc, '5=');
  press(calc, '1/0=');
  press(calc, 'C9-1=');
  assert.deepEqual(entries, [
    { expression: '2 + 3 × 4', result: '14' },
    { expression: '9 − 1', result: '8' },
  ]);
});

test('loadValue inserts a history result', () => {
  const calc = press(new Calculator(), '10+');
  calc.loadValue('14');
  press(calc, '=');
  assert.equal(calc.getState().display, '24');
  const calc2 = new Calculator();
  calc2.loadValue('-3.5');
  press(calc2, '*2=');
  assert.equal(calc2.getState().display, '−7');
});

test('live preview', () => {
  assert.equal(run('2+3*4').preview, '14');
  assert.equal(run('2+3*').preview, '');
  assert.equal(run('7').preview, '');
  assert.equal(run('8/0').preview, '');
});

test('formatting helpers', () => {
  assert.equal(formatNumber('-1234.5'), '−1,234.5');
  assert.equal(formatNumber('1.5e-7'), '1.5e−7');
  assert.equal(formatResult(-0), '0');
  assert.equal(formatResult(1e-7), '1e-7');
});

test('15-digit inputs stay exact', () => {
  assert.equal(run('999999999999999+0=').display, '999,999,999,999,999');
  assert.equal(run('999999999999999+1=').display, '1e+15');
});
