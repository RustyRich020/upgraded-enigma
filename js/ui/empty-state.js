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
    ? `<button class="btn btn-primary"${ctaHref ? ` data-href="${escapeHtml(ctaHref)}"` : ''}
        style="margin-top:16px;padding:8px 20px;border:none;border-radius:var(--radius-md);
               background:var(--color-primary);color:#fff;font-family:var(--font-body);
               font-size:var(--text-sm);cursor:pointer;">${escapeHtml(cta)}</button>`
    : '';

  return `<div class="empty-state" style="text-align:center;padding:48px 20px;color:var(--color-muted);">
  <div class="empty-state-icon" style="font-size:40px;margin-bottom:12px;opacity:.3;">${escapeHtml(icon)}</div>
  ${title ? `<h3 style="margin:0 0 8px;font-family:var(--font-display);font-size:var(--text-lg);color:var(--color-text);">${escapeHtml(title)}</h3>` : ''}
  ${description ? `<p style="margin:0;font-size:var(--text-sm);color:var(--color-text-dim);">${escapeHtml(description)}</p>` : ''}
  ${ctaHtml}
</div>`;
}
