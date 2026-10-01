/**
 * Calculation history — persisted per-browser in localStorage
 * and rendered into the history panel.
 */

const STORAGE_KEY = 'smart-calc-history';
const MAX_ENTRIES = 50;

function readStorage() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed)
      ? parsed.filter((e) => typeof e?.expression === 'string' && typeof e?.result === 'string')
      : [];
  } catch {
    return [];
  }
}

function writeStorage(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage unavailable (private mode / quota) — history still works for this session.
  }
}

export class HistoryPanel {
  /**
   * @param {{ list: HTMLElement, empty: HTMLElement, count: HTMLElement, clearButton: HTMLButtonElement }} els
   * @param {(entry: { expression: string, result: string }) => void} onSelect
   */
  constructor(els, onSelect) {
    this.els = els;
    this.entries = readStorage();

    els.list.addEventListener('click', (event) => {
      const item = event.target.closest('[data-index]');
      if (item) onSelect(this.entries[Number(item.dataset.index)]);
    });

    this.render();
  }

  add(entry) {
    this.entries = [{ ...entry, time: Date.now() }, ...this.entries].slice(0, MAX_ENTRIES);
    writeStorage(this.entries);
    this.render({ animateFirst: true });
  }

  clear() {
    this.entries = [];
    writeStorage(this.entries);
    this.render();
  }

  render({ animateFirst = false } = {}) {
    const { list, empty, count, clearButton } = this.els;
    const { formatNumber } = HistoryPanel;

    list.replaceChildren(
      ...this.entries.map((entry, index) => {
        const li = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'history-item';
        button.dataset.index = String(index);
        button.setAttribute('aria-label', `${entry.expression} equals ${formatNumber(entry.result)}. Use this result`);

        const expr = document.createElement('span');
        expr.className = 'history-expr';
        expr.textContent = `${entry.expression} =`;

        const result = document.createElement('span');
        result.className = 'history-result';
        result.textContent = formatNumber(entry.result);

        button.append(expr, result);
        li.append(button);
        if (animateFirst && index === 0) li.classList.add('is-new');
        return li;
      }),
    );

    const total = this.entries.length;
    empty.hidden = total > 0;
    list.hidden = total === 0;
    count.textContent = total ? `${total} ${total === 1 ? 'entry' : 'entries'}` : '';
    clearButton.disabled = total === 0;
  }
}

/** Set by app.js so the panel formats numbers the same way as the display. */
HistoryPanel.formatNumber = (value) => value;
