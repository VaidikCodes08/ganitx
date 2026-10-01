/**
 * Light / dark theme toggle. The initial theme is applied by an inline
 * script in <head> to avoid a flash of the wrong theme.
 */

const STORAGE_KEY = 'smart-calc-theme';
const THEME_COLORS = { light: '#eef1f7', dark: '#0b0f1a' };

export function initTheme(button) {
  const root = document.documentElement;
  const meta = document.querySelector('meta[name="theme-color"]');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

  function apply(theme) {
    root.dataset.theme = theme;
    const next = theme === 'dark' ? 'light' : 'dark';
    button.setAttribute('aria-label', `Switch to ${next} mode`);
    button.title = `Switch to ${next} mode`;
    if (meta) meta.content = THEME_COLORS[theme];
  }

  function savedTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  apply(root.dataset.theme === 'dark' ? 'dark' : 'light');

  button.addEventListener('click', () => {
    const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    // Briefly enable colour transitions only while switching themes.
    root.classList.add('theme-transition');
    window.setTimeout(() => root.classList.remove('theme-transition'), 400);
    apply(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  });

  // Follow the OS setting until the user picks a theme explicitly.
  systemDark.addEventListener('change', (event) => {
    if (!savedTheme()) apply(event.matches ? 'dark' : 'light');
  });
}
