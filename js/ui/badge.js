import { escapeHtml } from '../utils.js';

/**
 * Color map from variant name to CSS custom property.
 * @type {Record<string, string>}
 */
const VARIANT_COLORS = {
  default: 'var(--color-text-dim)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger:  'var(--color-danger)',
  info:    'var(--color-info)',
  accent:  'var(--color-accent)',
  muted:   'var(--color-muted)',
};

/**
 * Renders an inline badge / tag.
 *
 * @param {Object} opts
 * @param {string} opts.text                - Display text.
 * @param {'default'|'success'|'warning'|'danger'|'info'|'accent'|'muted'} [opts.variant='default']
 * @param {'sm'|'md'} [opts.size='sm']
 * @returns {string} HTML string.
 */
export function Badge({ text, variant = 'default', size = 'sm' } = {}) {
  const color = VARIANT_COLORS[variant] || VARIANT_COLORS.default;
  const fontSize = size === 'md' ? 'var(--text-sm)' : 'var(--text-xs)';
  const padding = size === 'md' ? '3px 10px' : '2px 8px';

  return `<span class="badge badge-${escapeHtml(variant)} badge-${escapeHtml(size)}" style="display:inline-block;padding:${padding};font-size:${fontSize};font-family:var(--font-body);line-height:1.4;border-radius:var(--radius-full);color:${color};background:color-mix(in srgb, ${color} 14%, transparent);">${escapeHtml(text)}</span>`;
}
