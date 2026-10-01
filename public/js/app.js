/**
 * Wires the calculator engine to the page: keypad, keyboard,
 * display rendering, history panel and theme toggle.
 */

import { Calculator, formatNumber } from './calculator.js';
import { HistoryPanel } from './history.js';
import { commandForKey } from './keyboard.js';
import { initTheme } from './theme.js';

const $ = (id) => document.getElementById(id);

const els = {
  calculator: $('calculator'),
  keypad: $('keypad'),
  expression: $('expression'),
  display: $('display'),
  preview: $('preview'),
  announcer: $('announcer'),
};

HistoryPanel.formatNumber = formatNumber;

const history = new HistoryPanel(
  {
    list: $('history-list'),
    empty: $('history-empty'),
    count: $('history-count'),
    clearButton: $('history-clear'),
  },
  (entry) => {
    calc.loadValue(entry.result);
    render();
    pulse(els.display, 'is-flash');
    announce(`Using ${formatNumber(entry.result)}`);
  },
);

const calc = new Calculator({ onResult: (entry) => history.add(entry) });

/* ---------- Rendering ---------- */

/** Picks a display font size so long numbers always fit. */
function sizeFor(text, isError) {
  if (isError) return 'error';
  const len = text.length;
  if (len > 18) return 'xs';
  if (len > 14) return 'sm';
  if (len > 10) return 'md';
  return 'lg';
}

function render() {
  const state = calc.getState();
  els.expression.textContent = state.expression || ' ';
  els.display.textContent = state.display;
  els.display.dataset.size = sizeFor(state.display, state.isError);
  els.preview.textContent = state.preview ? `= ${state.preview}` : ' ';
  els.calculator.classList.toggle('is-error', state.isError);

  for (const key of els.keypad.querySelectorAll('[data-action="operator"]')) {
    const active = key.dataset.value === state.pendingOperator;
    key.classList.toggle('is-active', active);
    key.setAttribute('aria-pressed', String(active));
  }
}

/** Restarts a one-shot CSS animation class. */
function pulse(el, className) {
  el.classList.remove(className);
  void el.offsetWidth; // force reflow so the animation replays
  el.classList.add(className);
}

function announce(message) {
  els.announcer.textContent = '';
  window.requestAnimationFrame(() => {
    els.announcer.textContent = message;
  });
}

/* ---------- Commands ---------- */

function run({ action, value }) {
  switch (action) {
    case 'digit':
      calc.inputDigit(value);
      break;
    case 'decimal':
      calc.inputDecimal();
      break;
    case 'operator':
      calc.inputOperator(value);
      break;
    case 'percent':
      calc.percent();
      break;
    case 'sign':
      calc.toggleSign();
      break;
    case 'delete':
      calc.backspace();
      break;
    case 'clear':
      calc.clear();
      announce('Cleared');
      break;
    case 'equals': {
      const outcome = calc.equals();
      render();
      if (outcome?.error) {
        pulse(els.calculator, 'is-shake');
        announce(outcome.error);
      } else if (outcome) {
        pulse(els.display, 'is-flash');
        announce(`Equals ${formatNumber(outcome.result)}`);
      }
      return;
    }
    default:
      return;
  }
  render();
  if (calc.getState().isError) {
    pulse(els.calculator, 'is-shake');
    announce(calc.getState().display);
  }
}

function keyButtonFor({ action, value }) {
  const selector = value
    ? `[data-action="${action}"][data-value="${value}"]`
    : `[data-action="${action}"]`;
  return els.keypad.querySelector(selector);
}

els.keypad.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  run({ action: button.dataset.action, value: button.dataset.value });
});

document.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;

  const command = commandForKey(event.key);
  if (!command) return;

  // Let Enter activate other focused controls (theme toggle, history, Clear History)
  // natively. On keypad buttons Enter always means "=".
  const target = event.target;
  const onOtherControl = target instanceof Element
    && target.closest('button, a, input, textarea, select')
    && !els.keypad.contains(target);
  if (event.key === 'Enter' && onOtherControl) return;

  event.preventDefault();
  run(command);

  const button = keyButtonFor(command);
  if (button) pulse(button, 'is-pressed');
});

els.keypad.addEventListener('animationend', (event) => {
  event.target.classList.remove('is-pressed');
});

$('history-clear').addEventListener('click', () => {
  history.clear();
  announce('History cleared');
  els.keypad.querySelector('[data-action="equals"]').focus();
});

initTheme($('theme-toggle'));
render();
