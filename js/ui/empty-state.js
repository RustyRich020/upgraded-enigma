import { escapeHtml } from '../utils.js';

/**
 * Renders a centered empty-state panel.
 *
 * @param {Object}  opts
 * @param {string}  [opts.icon='📋']      - Emoji or HTML icon string.
 * @param {string}  [opts.title='']       - Heading text.
 * @param {string}  [opts.description=''] - Muted body copy.
 * @param {string|null} [opts.cta=null]   - Button label (omit to hide).
 * @param {string|null} [opts.ctaHref=null] - Button href or data-action target.
 * @returns {string} HTML string.
 */
export function EmptyState({ icon = '📋', title = '', description = '', cta = null, ctaHref = null } = {}) {
  const ctaHtml = cta
    ? `<button class="btn"${ctaHref ? ` data-href="${escapeHtml(ctaHref)}"` : ''}>${escapeHtml(cta)}</button>`
    : '';

  return `<div class="empty-state">
  <div class="empty-state-icon">${escapeHtml(icon)}</div>
  ${title ? `<h3>${escapeHtml(title)}</h3>` : ''}
  ${description ? `<p>${escapeHtml(description)}</p>` : ''}
  ${ctaHtml}
</div>`;
}
