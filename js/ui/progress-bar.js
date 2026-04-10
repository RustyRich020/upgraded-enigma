import { escapeHtml } from '../utils.js';

/**
 * Height map for bar sizes.
 * @type {Record<string, string>}
 */
const SIZE_MAP = {
  sm: '4px',
  md: '8px',
  lg: '12px',
};

/**
 * Renders a horizontal progress bar.
 *
 * @param {Object} opts
 * @param {number} [opts.value=0]          - Current value.
 * @param {number} [opts.max=100]          - Maximum value.
 * @param {string} [opts.color='']         - CSS color for the filled portion (defaults to --color-primary).
 * @param {'sm'|'md'|'lg'} [opts.size='md']
 * @param {string} [opts.label='']         - Optional text label above the bar.
 * @param {boolean} [opts.showPercent=false] - Show percentage text on the right.
 * @returns {string} HTML string.
 */
export function ProgressBar({ value = 0, max = 100, color = '', size = 'md', label = '', showPercent = false } = {}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const barColor = color || 'var(--color-primary)';
  const height = SIZE_MAP[size] || SIZE_MAP.md;

  const labelHtml = (label || showPercent)
    ? `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;font-size:var(--text-xs);color:var(--color-text-dim);">
        ${label ? `<span>${escapeHtml(label)}</span>` : '<span></span>'}
        ${showPercent ? `<span>${Math.round(pct)}%</span>` : ''}
      </div>`
    : '';

  return `<div class="ui-progress" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100">
  ${labelHtml}
  <div class="ui-progress-track" style="width:100%;height:${height};background:var(--color-surface-border);border-radius:var(--radius-full);overflow:hidden;">
    <div class="ui-progress-fill" style="width:${pct.toFixed(1)}%;height:100%;background:${barColor};border-radius:var(--radius-full);transition:width .4s ease;"></div>
  </div>
</div>`;
}
