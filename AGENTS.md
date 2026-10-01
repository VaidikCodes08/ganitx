# AGENTS.md

## Overview
Smart Calculator is a static site (no build step, no dependencies). Netlify publishes `public/` as-is (see `netlify.toml`). Scripts are native ES modules loaded via `<script type="module" src="/js/app.js">`.

## Architecture
- `public/js/calculator.js` — the `Calculator` class and pure helpers (`evaluate`, `formatNumber`, `formatResult`, `expressionText`). **No DOM access** so it can be unit-tested in Node. State: `tokens` (committed `[num, op, num, op…]` strings, operators stored as `+ - * /`), `current` (number being typed; `''` means awaiting an operand), `overwrite` (next digit replaces `current`, set after `=`, `%`, or loading from history), `error`, `lastExpression`.
- `evaluate` does two passes (× ÷ then + −) for order of operations; results are normalised with `toPrecision(15)` to remove float noise. Values ≥ 1e15 render in exponent notation.
- `public/js/app.js` — rendering and event wiring. Every input goes through `run({ action, value })`; keypad buttons declare `data-action` / `data-value` matching those commands, and `keyboard.js` maps keys to the same commands.
- `public/js/history.js` — `HistoryPanel` stores up to 50 entries in `localStorage` (`smart-calc-history`). History is intentionally per-browser and private, so no server database is used.
- `public/js/theme.js` — toggles `data-theme` on `<html>`; saved as `smart-calc-theme`. An inline script in `<head>` applies the theme before first paint.

## Conventions
- Theme colours are CSS custom properties at the top of `styles.css`; add new colours to both light and dark blocks.
- Display strings use typographic `−`, `×`, `÷`; internal values use ASCII.
- Build DOM with `textContent` / `createElement` (never `innerHTML` with user data).
- Keyboard: Enter on a focused keypad button means "=", while Enter on other controls (theme, history, Clear History) activates them natively.

## Testing
`npm test` runs `tests/calculator.test.js` with Node's built-in test runner. Add a case there for any engine change.
