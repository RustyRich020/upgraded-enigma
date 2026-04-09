/* ============================================================
   views/companies.js — Company tracking with Clearbit logos
   ============================================================ */

import { escapeHtml, uid } from '../utils.js';
import { ENDPOINTS } from '../config.js';

/**
 * Render the companies view.
 * @param {HTMLElement} container — section element
 * @param {object} state — state store
 */
export function renderCompanies(container, state) {
  const companies = state.get('companies') || [];

  const tbody = container.querySelector('#companyTable tbody');
  if (tbody) {
    if (companies.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon">&#127970;</div><h3>No companies tracked</h3><p>Add companies to auto-fetch logos via Clearbit</p></div></td></tr>`;
    } else {
      tbody.innerHTML = companies.map(c => {
        const domain = c.domain || (c.name || '').toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
        return `
          <tr>
            <td>
              <img src="${ENDPOINTS.clearbitLogo}/${escapeHtml(domain)}"
                onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22><rect fill=%22%23333%22 width=%2224%22 height=%2224%22 rx=%224%22/><text x=%2212%22 y=%2217%22 text-anchor=%22middle%22 fill=%22%23888%22 font-size=%2214%22>${escapeHtml((c.name || '?')[0])}</text></svg>'"
                style="width:32px;height:32px;border-radius:4px;background:#fff;object-fit:contain" alt="">
            </td>
            <td><strong>${escapeHtml(c.name)}</strong></td>
            <td contenteditable data-cid="${c.id}" data-field="domain" style="min-width:120px;color:var(--blue)">${escapeHtml(c.domain || domain)}</td>
            <td contenteditable data-cid="${c.id}" data-field="notes" style="min-width:200px">${escapeHtml(c.notes || '')}</td>
            <td><button class="btn danger small" data-cid="${c.id}" data-act="del">DEL</button></td>
          </tr>
        `;
      }).join('');
    }
  }

  // Add company button
  const addBtn = container.querySelector('#addCompany');
  if (addBtn) {
    addBtn.onclick = () => {
      const nameEl = container.querySelector('#companyName');
      const name = (nameEl?.value || '').trim();
      if (!name) return;
      const domain = name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
      const list = state.get('companies') || [];
      list.push({ id: uid(), name, domain, notes: '' });
      state.set('companies', list);
      if (nameEl) nameEl.value = '';
      renderCompanies(container, state);
    };
  }

  // Table event delegation
  const table = container.querySelector('#companyTable');
  if (table) {
    table.onclick = (e) => {
      const btn = e.target.closest('[data-act="del"]');
      if (!btn) return;
      const id = btn.getAttribute('data-cid');
      state.set('companies', (state.get('companies') || []).filter(x => x.id !== id));
      renderCompanies(container, state);
    };

    // Contenteditable blur saves
    table.addEventListener('blur', (e) => {
      if (e.target.hasAttribute('contenteditable')) {
        const id = e.target.getAttribute('data-cid');
        const field = e.target.getAttribute('data-field');
        const list = state.get('companies') || [];
        const rec = list.find(x => x.id === id);
        if (rec) {
          rec[field] = e.target.innerText.trim();
          state.set('companies', list);
        }
      }
    }, true);
  }
}

export default { renderCompanies };
