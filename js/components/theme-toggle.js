/* ============================================================
   components/theme-toggle.js — Theme management
   ============================================================ */

import { STORAGE_KEYS } from '../config.js';

const THEMES = ['default', 'dark'];

/**
 * Initialize the theme from localStorage or default to 'default'.
 */
export function initTheme() {
  let saved = localStorage.getItem(STORAGE_KEYS.theme) || 'default';
  // Migrate legacy theme names
  if (saved === 'tron') saved = 'default';
  if (saved === 'light') saved = 'dark';
  applyTheme(saved);
}

/**
 * Toggle between available themes.
 */
export function toggleTheme() {
  const current = getCurrentTheme();
  const idx = THEMES.indexOf(current);
  const next = THEMES[(idx + 1) % THEMES.length];
  applyTheme(next);
  return next;
}

/**
 * Get the currently active theme name.
 */
export function getCurrentTheme() {
  return document.body.getAttribute('data-theme') || 'default';
}

/**
 * Apply a theme by name.
 */
function applyTheme(name) {
  document.body.setAttribute('data-theme', name);
  localStorage.setItem(STORAGE_KEYS.theme, name);
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: name } }));
}

export default { initTheme, toggleTheme, getCurrentTheme };
