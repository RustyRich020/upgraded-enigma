/* ============================================================
   views/networking.js — Networking Tracker
   ============================================================ */

import { escapeHtml, uid, fmtDate, today } from '../utils.js';
import { toast } from '../components/toast.js';

const ACTIVITY_TYPES = [
  'Informational Interview',
  'Referral',
  'LinkedIn Connection',
  'Event',
  'Coffee Chat',
  'Email Outreach'
];

/**
 * Render the networking tracker view.
 * @param {HTMLElement} container — section element
 * @param {object} state — state store
 */
export function renderNetworking(container, state) {
  const activities = (state.get('networking') || []).slice();
  const todayStr = today();
  const weekAgoStr = today(-7);

  /* --- Stats --- */
  const totalCount = activities.length;
  const thisWeekCount = activities.filter(a => a.date >= weekAgoStr && a.date <= todayStr).length;
  const referralCount = activities.filter(a => a.type === 'Referral').length;
  const connectionCount = activities.filter(a => a.type === 'LinkedIn Connection').length;

  /* --- Sort state --- */
  let sortField = 'date';
  let sortDir = -1; // descending

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:16px">
      <h2 style="margin:0">Networking Tracker</h2>
      <button class="btn" id="toggleNetForm">+ ACTIVITY</button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-bottom:20px">
      <div style="padding:14px;border:1px solid var(--border);border-radius:8px;background:var(--surface);text-align:center">
        <div style="font-size:28px;font-weight:700">${totalCount}</div>
        <div class="muted" style="font-size:12px">Total Activities</div>
      </div>
      <div style="padding:14px;border:1px solid var(--border);border-radius:8px;background:var(--surface);text-align:center">
        <div style="font-size:28px;font-weight:700">${thisWeekCount}</div>
        <div class="muted" style="font-size:12px">This Week</div>
      </div>
      <div style="padding:14px;border:1px solid var(--border);border-radius:8px;background:var(--surface);text-align:center">
        <div style="font-size:28px;font-weight:700">${referralCount}</div>
        <div class="muted" style="font-size:12px">Referrals</div>
      </div>
      <div style="padding:14px;border:1px solid var(--border);border-radius:8px;background:var(--surface);text-align:center">
        <div style="font-size:28px;font-weight:700">${connectionCount}</div>
        <div class="muted" style="font-size:12px">Connections</div>
      </div>
    </div>

    <div id="netFormWrap" style="display:none;margin-bottom:20px;padding:16px;border:1px solid var(--border);border-radius:8px;background:var(--surface)">
      <h3 style="margin:0 0 12px">Add Networking Activity</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">
        <div>
          <label class="label">Type *</label>
          <select class="input" id="netType">
            ${ACTIVITY_TYPES.map(t => `<option>${t}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="label">Contact Name *</label>
          <input type="text" class="input" id="netContact" placeholder="Jane Smith">
        </div>
        <div>
          <label class="label">Company</label>
          <input type="text" class="input" id="netCompany" placeholder="Acme Corp">
        </div>
        <div>
          <label class="label">Date</label>
          <input type="date" class="input" id="netDate" value="${todayStr}">
        </div>
      </div>
      <div style="margin-top:10px">
        <label class="label">Notes</label>
        <textarea class="input" id="netNotes" rows="2" placeholder="What was discussed, key takeaways..."></textarea>
      </div>
      <div style="margin-top:10px">
        <label class="label">Outcome</label>
        <input type="text" class="input" id="netOutcome" placeholder="Got a referral, scheduled follow-up, etc.">
      </div>
      <div style="margin-top:12px;display:flex;gap:8px">
        <button class="btn" id="saveNet">SAVE</button>
        <button class="btn" id="cancelNet">CANCEL</button>
      </div>
    </div>

    <div style="overflow-x:auto">
      <table class="table" id="netTable" style="width:100%">
        <thead>
          <tr>
            <th data-sort="date" style="cursor:pointer">Date &#9650;&#9660;</th>
            <th data-sort="type" style="cursor:pointer">Type &#9650;&#9660;</th>
            <th data-sort="contactName" style="cursor:pointer">Contact &#9650;&#9660;</th>
            <th data-sort="company" style="cursor:pointer">Company &#9650;&#9660;</th>
            <th>Notes</th>
            <th>Outcome</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="netTbody"></tbody>
      </table>
    </div>
  `;

  /* --- Render table rows --- */
  function renderRows(field, dir) {
    const sorted = activities.slice().sort((a, b) => {
      const va = (a[field] || '').toString().toLowerCase();
      const vb = (b[field] || '').toString().toLowerCase();
      return va < vb ? -dir : va > vb ? dir : 0;
    });

    const tbody = container.querySelector('#netTbody');
    if (sorted.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-state-icon">&#129309;</div><h3>No networking activities</h3><p>Start tracking your networking efforts</p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = sorted.map(a => `
      <tr>
        <td style="white-space:nowrap">${escapeHtml(fmtDate(a.date))}</td>
        <td><span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;border:1px solid var(--border)">${escapeHtml(a.type)}</span></td>
        <td>${escapeHtml(a.contactName || '')}</td>
        <td>${escapeHtml(a.company || '')}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(a.notes || '')}">${escapeHtml(a.notes || '')}</td>
        <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(a.outcome || '')}">${escapeHtml(a.outcome || '')}</td>
        <td><button class="btn danger small" data-act="del" data-id="${a.id}">DEL</button></td>
      </tr>
    `).join('');
  }

  renderRows(sortField, sortDir);

  /* --- Toggle form --- */
  container.querySelector('#toggleNetForm').onclick = () => {
    const wrap = container.querySelector('#netFormWrap');
    wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none';
  };
  container.querySelector('#cancelNet').onclick = () => {
    container.querySelector('#netFormWrap').style.display = 'none';
  };

  /* --- Save activity --- */
  container.querySelector('#saveNet').onclick = () => {
    const contactName = (container.querySelector('#netContact')?.value || '').trim();
    const type = container.querySelector('#netType')?.value || ACTIVITY_TYPES[0];
    const company = (container.querySelector('#netCompany')?.value || '').trim();
    const date = container.querySelector('#netDate')?.value || todayStr;
    const notes = container.querySelector('#netNotes')?.value || '';
    const outcome = container.querySelector('#netOutcome')?.value || '';

    if (!contactName) {
      toast('Contact name is required', 'error');
      return;
    }

    const list = state.get('networking') || [];
    list.push({
      id: uid(),
      type,
      contactName,
      company,
      date,
      notes,
      outcome,
      createdAt: new Date().toISOString()
    });
    state.set('networking', list);
    toast('Activity added', 'success');
    renderNetworking(container, state);
  };

  /* --- Sort headers --- */
  container.querySelectorAll('#netTable thead th[data-sort]').forEach(th => {
    th.onclick = () => {
      const field = th.dataset.sort;
      if (sortField === field) {
        sortDir = -sortDir;
      } else {
        sortField = field;
        sortDir = 1;
      }
      renderRows(sortField, sortDir);
    };
  });

  /* --- Delete delegation --- */
  container.querySelector('#netTable').onclick = (e) => {
    const btn = e.target.closest('[data-act="del"]');
    if (!btn) return;
    const id = btn.dataset.id;
    const list = state.get('networking') || [];
    state.set('networking', list.filter(x => x.id !== id));
    toast('Activity removed', 'info');
    renderNetworking(container, state);
  };
}

export default { renderNetworking };
