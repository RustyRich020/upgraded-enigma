/* ============================================================
   views/interviews.js — Interview Scheduler
   ============================================================ */

import { escapeHtml, uid, fmtDate, today } from '../utils.js';
import { toast } from '../components/toast.js';

/**
 * Render the interview scheduler view.
 * @param {HTMLElement} container — section element
 * @param {object} state — state store
 */
export function renderInterviews(container, state) {
  const interviews = (state.get('interviews') || []).slice().sort((a, b) => {
    const da = a.date + 'T' + (a.time || '00:00');
    const db = b.date + 'T' + (b.time || '00:00');
    return da < db ? -1 : da > db ? 1 : 0;
  });
  const jobs = state.get('jobs') || [];

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:16px">
      <h2 style="margin:0">Interview Scheduler</h2>
      <button class="btn" id="toggleInterviewForm">+ INTERVIEW</button>
    </div>

    <div id="interviewFormWrap" style="display:none;margin-bottom:20px;padding:16px;border:1px solid var(--border);border-radius:8px;background:var(--surface)">
      <h3 style="margin:0 0 12px">Add Interview</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">
        <div>
          <label class="label">Date *</label>
          <input type="date" class="input" id="intDate" value="${today()}">
        </div>
        <div>
          <label class="label">Time</label>
          <input type="time" class="input" id="intTime" value="09:00">
        </div>
        <div>
          <label class="label">Company *</label>
          ${jobs.length > 0 ? `
            <select class="input" id="intJob">
              <option value="">-- Select job --</option>
              ${jobs.map(j => `<option value="${j.id}" data-company="${escapeHtml(j.company || '')}" data-role="${escapeHtml(j.title || '')}">${escapeHtml(j.company || 'Unknown')} — ${escapeHtml(j.title || 'No title')}</option>`).join('')}
              <option value="__custom">Other (type below)</option>
            </select>
            <input type="text" class="input" id="intCompanyCustom" placeholder="Company name" style="display:none;margin-top:6px">
            <input type="text" class="input" id="intRoleCustom" placeholder="Role title" style="display:none;margin-top:6px">
          ` : `
            <input type="text" class="input" id="intCompanyCustom" placeholder="Company name">
            <input type="text" class="input" id="intRoleCustom" placeholder="Role title" style="margin-top:6px">
          `}
        </div>
        <div>
          <label class="label">Type</label>
          <select class="input" id="intType">
            <option>Phone</option>
            <option>Video</option>
            <option>Onsite</option>
            <option>Technical</option>
          </select>
        </div>
      </div>
      <div style="margin-top:10px">
        <label class="label">Prep Notes</label>
        <textarea class="input" id="intNotes" rows="3" placeholder="Research topics, questions to ask, things to review..."></textarea>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px">
        <button class="btn" id="saveInterview">SAVE</button>
        <button class="btn" id="cancelInterview">CANCEL</button>
      </div>
    </div>

    <div id="interviewList">
      ${interviews.length === 0
        ? `<div class="empty-state"><div class="empty-state-icon">&#128197;</div><h3>No interviews scheduled</h3><p>Click "+ INTERVIEW" to add one</p></div>`
        : interviews.map(iv => renderInterviewCard(iv)).join('')
      }
    </div>
  `;

  /* --- Toggle form --- */
  container.querySelector('#toggleInterviewForm').onclick = () => {
    const wrap = container.querySelector('#interviewFormWrap');
    wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none';
  };

  container.querySelector('#cancelInterview')?.addEventListener('click', () => {
    container.querySelector('#interviewFormWrap').style.display = 'none';
  });

  /* --- Job select -> custom toggle --- */
  const jobSelect = container.querySelector('#intJob');
  if (jobSelect) {
    jobSelect.onchange = () => {
      const custom = jobSelect.value === '__custom';
      const cc = container.querySelector('#intCompanyCustom');
      const rc = container.querySelector('#intRoleCustom');
      if (cc) cc.style.display = custom ? 'block' : 'none';
      if (rc) rc.style.display = custom ? 'block' : 'none';
    };
  }

  /* --- Save interview --- */
  container.querySelector('#saveInterview').onclick = () => {
    const date = container.querySelector('#intDate')?.value;
    const time = container.querySelector('#intTime')?.value || '';
    const type = container.querySelector('#intType')?.value || 'Phone';
    const notes = container.querySelector('#intNotes')?.value || '';

    let company = '';
    let role = '';
    let jobId = '';

    const sel = container.querySelector('#intJob');
    if (sel && sel.value && sel.value !== '__custom') {
      jobId = sel.value;
      const opt = sel.selectedOptions[0];
      company = opt?.dataset.company || '';
      role = opt?.dataset.role || '';
    } else {
      company = (container.querySelector('#intCompanyCustom')?.value || '').trim();
      role = (container.querySelector('#intRoleCustom')?.value || '').trim();
    }

    if (!date || !company) {
      toast('Date and company are required', 'error');
      return;
    }

    const list = state.get('interviews') || [];
    list.push({
      id: uid(),
      jobId,
      company,
      role,
      date,
      time,
      type,
      notes,
      status: 'Scheduled',
      createdAt: new Date().toISOString()
    });
    state.set('interviews', list);
    toast('Interview added', 'success');
    renderInterviews(container, state);
  };

  /* --- Card actions (delegation) --- */
  container.querySelector('#interviewList').onclick = (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const id = btn.dataset.id;
    const act = btn.dataset.act;
    const list = state.get('interviews') || [];
    const iv = list.find(x => x.id === id);
    if (!iv) return;

    if (act === 'complete') {
      iv.status = 'Completed';
      state.set('interviews', list);
      toast('Marked as completed', 'success');
      renderInterviews(container, state);
    }
    if (act === 'cancel') {
      iv.status = 'Cancelled';
      state.set('interviews', list);
      toast('Interview cancelled', 'info');
      renderInterviews(container, state);
    }
    if (act === 'editNotes') {
      const card = btn.closest('.interview-card');
      const ta = card?.querySelector('.edit-notes-area');
      if (ta) {
        ta.style.display = ta.style.display === 'none' ? 'block' : 'none';
        if (ta.style.display === 'block') ta.querySelector('textarea')?.focus();
      }
    }
    if (act === 'saveNotes') {
      const card = btn.closest('.interview-card');
      const ta = card?.querySelector('.edit-notes-area textarea');
      if (ta) {
        iv.notes = ta.value;
        state.set('interviews', list);
        toast('Notes updated', 'success');
        renderInterviews(container, state);
      }
    }
    if (act === 'toggleNotes') {
      const card = btn.closest('.interview-card');
      const notesBody = card?.querySelector('.notes-body');
      if (notesBody) {
        notesBody.style.display = notesBody.style.display === 'none' ? 'block' : 'none';
        btn.textContent = notesBody.style.display === 'none' ? 'Show Notes' : 'Hide Notes';
      }
    }
  };
}

function renderInterviewCard(iv) {
  const statusColors = {
    Scheduled: '#2196F3',
    Completed: '#4CAF50',
    Cancelled: '#9E9E9E'
  };
  const typeBadgeColors = {
    Phone: '#8BC34A',
    Video: '#03A9F4',
    Onsite: '#FF9800',
    Technical: '#E91E63'
  };
  const color = statusColors[iv.status] || '#999';
  const badgeColor = typeBadgeColors[iv.type] || '#999';
  const hasNotes = iv.notes && iv.notes.trim().length > 0;
  const dateStr = iv.date ? new Date(iv.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
  const timeStr = iv.time || '';

  return `
    <div class="interview-card" style="border:1px solid var(--border);border-left:4px solid ${color};border-radius:8px;padding:14px;margin-bottom:12px;background:var(--surface)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
        <div>
          <div style="font-weight:600;font-size:15px">${escapeHtml(iv.company)}</div>
          <div class="muted" style="font-size:13px">${escapeHtml(iv.role || '')}</div>
          <div style="margin-top:6px;font-size:13px">
            <span style="margin-right:12px">&#128197; ${escapeHtml(dateStr)}${timeStr ? ' at ' + escapeHtml(timeStr) : ''}</span>
            <span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;color:#fff;background:${badgeColor}">${escapeHtml(iv.type)}</span>
            <span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;color:${color};border:1px solid ${color};margin-left:4px">${escapeHtml(iv.status)}</span>
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${iv.status === 'Scheduled' ? `
            <button class="btn small" data-act="complete" data-id="${iv.id}" style="font-size:11px">COMPLETE</button>
            <button class="btn small" data-act="cancel" data-id="${iv.id}" style="font-size:11px">CANCEL</button>
          ` : ''}
          <button class="btn small" data-act="editNotes" data-id="${iv.id}" style="font-size:11px">EDIT NOTES</button>
        </div>
      </div>
      ${hasNotes ? `
        <div style="margin-top:8px">
          <button class="btn small" data-act="toggleNotes" data-id="${iv.id}" style="font-size:11px">Show Notes</button>
          <div class="notes-body" style="display:none;margin-top:6px;padding:8px;background:var(--bg);border-radius:4px;font-size:13px;white-space:pre-wrap">${escapeHtml(iv.notes)}</div>
        </div>
      ` : ''}
      <div class="edit-notes-area" style="display:none;margin-top:8px">
        <textarea class="input" rows="3" style="width:100%">${escapeHtml(iv.notes || '')}</textarea>
        <button class="btn small" data-act="saveNotes" data-id="${iv.id}" style="margin-top:6px;font-size:11px">SAVE NOTES</button>
      </div>
    </div>
  `;
}

export default { renderInterviews };
