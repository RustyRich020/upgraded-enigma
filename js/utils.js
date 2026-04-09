/* ============================================================
   utils.js — Shared utility functions
   ============================================================ */

/**
 * Generate a short random ID.
 */
export function uid() {
  return Math.random().toString(36).slice(2, 9);
}

/**
 * Format a date value to YYYY-MM-DD string.
 */
export function fmtDate(v) {
  if (!v) return '';
  try {
    return new Date(v).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

/**
 * Return today's date (or offset by n days) as YYYY-MM-DD.
 */
export function today(n = 0) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Escape HTML special characters to prevent XSS.
 */
export function escapeHtml(s) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return (s || '').replace(/[&<>"']/g, c => map[c]);
}

/**
 * Trigger a file download in the browser.
 */
export function download(filename, text, type = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/**
 * Tokenize a string into lowercase words (letters and digits only).
 */
export function tokenize(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
}

/**
 * Build a keyword set from text, filtering out stop words and short terms.
 */
export function keyset(s) {
  const stop = new Set([
    'the', 'and', 'for', 'with', 'a', 'an', 'to', 'in', 'of',
    'on', 'is', 'are', 'or', 'by', 'as', 'at', 'from'
  ]);
  const ks = new Set();
  tokenize(s).forEach(w => {
    if (!stop.has(w) && w.length > 2) ks.add(w);
  });
  return ks;
}
