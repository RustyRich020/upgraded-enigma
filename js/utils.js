/* ============================================================
   utils.js — Shared utility functions
   ============================================================ */

/**
 * Generate a short random ID.
 */
export function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function toLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a date value to YYYY-MM-DD string.
 */
export function fmtDate(v) {
  if (!v) return '';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  try {
    const date = new Date(v);
    if (Number.isNaN(date.getTime())) return '';
    return toLocalDateString(date);
  } catch {
    return '';
  }
}

/**
 * Return today's date (or offset by n days) as YYYY-MM-DD.
 */
export function today(n = 0) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return toLocalDateString(d);
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
