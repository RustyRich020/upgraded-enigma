/**
 * Renders a generic panel / card component.
 *
 * @param {Object} opts
 * @param {string} [opts.title='']       - Header title text (plain text, escaped internally).
 * @param {string} [opts.subtitle='']    - Smaller text beneath the title.
 * @param {string} [opts.headerRight=''] - Raw HTML placed on the right side of the header.
 * @param {string} [opts.body='']        - Raw HTML for the body section.
 * @param {string} [opts.footer='']      - Raw HTML for the footer section.
 * @param {string} [opts.className='']   - Additional CSS class(es).
 * @param {string} [opts.id='']          - Optional element id.
 * @returns {string} HTML string.
 */
export function Card({ title = '', subtitle = '', headerRight = '', body = '', footer = '', className = '', id = '' } = {}) {
  const idAttr = id ? ` id="${id}"` : '';
  const cls = `ui-card${className ? ' ' + className : ''}`;

  const hasHeader = title || subtitle || headerRight;
  const headerHtml = hasHeader
    ? `<div class="ui-card-header" style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--color-surface-border);">
        <div>
          ${title ? `<div style="font-family:var(--font-display);font-size:var(--text-base);font-weight:600;color:var(--color-text);">${title}</div>` : ''}
          ${subtitle ? `<div style="font-size:var(--text-xs);color:var(--color-text-dim);margin-top:2px;">${subtitle}</div>` : ''}
        </div>
        ${headerRight ? `<div>${headerRight}</div>` : ''}
      </div>`
    : '';

  const bodyHtml = body
    ? `<div class="ui-card-body" style="padding:16px;">${body}</div>`
    : '';

  const footerHtml = footer
    ? `<div class="ui-card-footer" style="padding:12px 16px;border-top:1px solid var(--color-surface-border);font-size:var(--text-xs);color:var(--color-text-dim);">${footer}</div>`
    : '';

  return `<div class="${cls}"${idAttr} style="background:var(--color-surface);border:1px solid var(--color-surface-border);border-radius:var(--radius-lg);overflow:hidden;">
  ${headerHtml}${bodyHtml}${footerHtml}
</div>`;
}
