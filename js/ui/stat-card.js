import { escapeHtml } from '../utils.js';

/**
 * Renders a single stat block (large value + label).
 *
 * @param {Object} opts
 * @param {string} opts.label            - Stat description.
 * @param {string|number} opts.value     - Primary metric.
 * @param {string} [opts.sublabel='']    - Secondary note beneath label.
 * @param {string} [opts.color='']       - CSS color override for value (e.g. 'var(--color-success)').
 * @returns {string} HTML string.
 */
export function StatCard({ label, value, sublabel = '', color = '', _gridCell = false } = {}) {
  const valueColor = color || 'var(--color-text)';
  const bgStyle = _gridCell ? 'background:var(--color-surface);' : '';

  return `<div class="ui-stat-card" style="${bgStyle}text-align:center;padding:16px 12px;">
  <div style="font-size:28px;font-weight:700;font-family:var(--font-display);color:${valueColor};line-height:1.2;">${escapeHtml(String(value))}</div>
  <div style="font-size:var(--text-xs);color:var(--color-text-dim);margin-top:4px;text-transform:uppercase;letter-spacing:.04em;">${escapeHtml(label)}</div>
  ${sublabel ? `<div style="font-size:var(--text-xs);color:var(--color-muted);margin-top:2px;">${escapeHtml(sublabel)}</div>` : ''}
</div>`;
}

/**
 * Wraps multiple StatCards in a CSS grid.
 *
 * @param {Object} opts
 * @param {Array<{label:string, value:string|number, sublabel?:string, color?:string}>} opts.stats
 * @param {number} [opts.cols=4] - Number of grid columns.
 * @returns {string} HTML string.
 */
export function StatGrid({ stats, cols = 4 } = {}) {
  const cards = (stats || []).map(s => StatCard({ ...s, _gridCell: true })).join('');

  return `<div class="ui-stat-grid" style="display:grid;grid-template-columns:repeat(${Number(cols)}, 1fr);gap:1px;background:var(--color-surface-border);border:1px solid var(--color-surface-border);border-radius:var(--radius-lg);overflow:hidden;">
  ${cards}
</div>`;
}
