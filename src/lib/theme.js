import { readStorage, writeStorage } from './storage';

export const themes = [
  { id: 'yellow', country: 'Spain', accent: '#f4c550' },
  { id: 'green', country: 'Italy', accent: '#9fbaae' },
  { id: 'blue', country: 'Ukraine', accent: '#9fb7ce' },
  { id: 'pink', country: 'United Kingdom', accent: '#e0a39a' },
  { id: 'peach', country: 'Germany', accent: '#f0aa8d' },
];

export function initializeTheme() {
  if (window.__learnLingoTheme) return window.__learnLingoTheme;
  const previous = readStorage('learnlingo:theme-index', -1);
  const index =
    Number.isInteger(previous) && previous >= -1 && previous < themes.length
      ? (previous + 1) % themes.length
      : 0;
  const theme = themes[index];
  writeStorage('learnlingo:theme-index', index);
  document.documentElement.dataset.theme = theme.id;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme.accent);
  window.__learnLingoTheme = theme;
  return theme;
}
