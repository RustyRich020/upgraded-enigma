import { escapeHtml } from '../utils.js';
import { EmptyState } from './empty-state.js';

/**
 * Renders a data table with optional custom cell renderers.
 *
 * @param {Object} opts
 * @param {Array<{key:string, label:string, align?:'left'|'center'|'right', render?:(value:*, row:Object)=>string}>} opts.columns
 * @param {Array<Object>} opts.rows
 * @param {string} [opts.emptyIcon='📋']
 * @param {string} [opts.emptyTitle='No data']
 * @param {string} [opts.emptyDesc='']
 * @param {boolean} [opts.sortable=false] - Adds data-sortable attribute for external sort handlers.
 * @returns {string} HTML string.
 */
export function DataTable({ columns, rows, emptyIcon = '📋', emptyTitle = 'No data', emptyDesc = '', sortable = false } = {}) {
  if (!rows || rows.length === 0) {
    return EmptyState({ icon: emptyIcon, title: emptyTitle, description: emptyDesc });
  }

  const alignStyle = (align) => {
    if (!align || align === 'left') return '';
    return ` style="text-align:${align};"`;
  };

  const theadCells = columns.map(col => {
    const sortAttr = sortable ? ` data-sortable data-key="${escapeHtml(col.key)}"` : '';
    return `<th${alignStyle(col.align)}${sortAttr} style="padding:10px 12px;text-align:${col.align || 'left'};font-size:var(--text-xs);font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--color-text-dim);border-bottom:1px solid var(--color-surface-border);white-space:nowrap;">${escapeHtml(col.label)}</th>`;
  }).join('');

  const tbodyRows = rows.map(row => {
    const cells = columns.map(col => {
      const raw = row[col.key];
      const content = typeof col.render === 'function'
        ? col.render(raw, row)
        : escapeHtml(raw != null ? String(raw) : '');
      return `<td style="padding:10px 12px;font-size:var(--text-sm);color:var(--color-text);border-bottom:1px solid var(--color-surface-border);text-align:${col.align || 'left'};">${content}</td>`;
    }).join('');
    return `<tr style="transition:background .15s;">${cells}</tr>`;
  }).join('');

  return `<div class="ui-data-table-wrap" style="overflow-x:auto;">
  <table class="ui-data-table" style="width:100%;border-collapse:collapse;font-family:var(--font-body);">
    <thead><tr>${theadCells}</tr></thead>
    <tbody>${tbodyRows}</tbody>
  </table>
</div>`;
}
