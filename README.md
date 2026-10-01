# Smart Calculator

**Fast, Simple & Accurate** — a polished, responsive calculator website built with plain HTML, CSS and JavaScript (no frameworks, no runtime dependencies).

## Features

- Digits, decimal point, `+ − × ÷`, `=`, `AC`, `DEL`, `%` and `+/−`
- Standard order of operations (`2 + 3 × 4 = 14`)
- Live result preview while typing and a highlighted pending operator
- Friendly errors for division by zero and overflow
- Calculation history (saved in the browser) — click any entry to reuse its result, plus **Clear History**
- Full keyboard support and Tab navigation — usable without a mouse
- Light / dark mode that follows the system preference until you choose
- Responsive layout for desktop, tablet and mobile; respects reduced-motion settings

### Keyboard shortcuts

| Key | Action |
| --- | --- |
| `0`–`9` | Digits |
| `.` or `,` | Decimal point |
| `+` `-` `*` (or `x`) `/` | Operators |
| `Enter` or `=` | Calculate |
| `Backspace` | Delete last digit |
| `Esc`, `Delete` or `C` | Clear all |
| `%` | Percent |
| `F9` or `N` | Toggle +/− |

### Percent behaviour

After `+` or `−`, `%` takes a percentage of the preceding value (`200 + 10%` → `200 + 20`). Otherwise it divides by 100 (`50 × 10%` → `50 × 0.1`).

## Project structure

```
public/            Deployed site (Netlify publish directory)
  index.html       Markup
  css/styles.css   All styles, theme tokens at the top
  js/calculator.js Calculation engine (pure logic, no DOM)
  js/app.js        Wires engine, keypad, keyboard, history and theme
  js/history.js    History storage + rendering
  js/keyboard.js   Key → command mapping
  js/theme.js      Light/dark toggle
tests/             Node test suite for the engine
netlify.toml       Netlify config
```

## Running locally

Any static file server works, for example:

```bash
npx serve public
# or, with the Netlify CLI
netlify dev
```

Run the engine tests (Node 20+):

```bash
npm test
```
