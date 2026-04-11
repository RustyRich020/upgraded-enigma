/* ============================================================
   views/networking.js — Networking tracker + outreach helper
   ============================================================ */

import { escapeHtml, uid, today } from '../utils.js';
import { toast } from '../components/toast.js';
import { generateOutreachDraft } from '../services/career-ops-lite.js';

const ACTIVITY_TYPES = [
  'Informational Interview',
  'Referral',
  'LinkedIn Connection',
  'Event',
  'Coffee Chat',
  'Email Outreach'
];

function renderActivityRows(activities) {
  if (!activities.length) {
    return `<tr><td colspan="7"><div class="empty-inline">No networking activity yet. Add outreach, referrals, or coffee chats to build momentum.</div></td></tr>`;
  }

  return activities.map(activity => `
    <tr>
      <td>${escapeHtml(activity.date || '')}</td>
      <td><span class="chip">${escapeHtml(activity.type || '')}</span></td>
      <td>${escapeHtml(activity.contactName || '')}</td>
      <td>${escapeHtml(activity.company || '')}</td>
      <td>${escapeHtml(activity.notes || '')}</td>
      <td>${escapeHtml(activity.outcome || '')}</td>
      <td><button class="btn danger small" data-act="del" data-id="${activity.id}" type="button">Del</button></td>
    </tr>
  `).join('');
}

export function renderNetworking(container, state) {
  const activities = (state.get('networking') || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const todayStr = today();
  const weekAgoStr = today(-7);
  const totalCount = activities.length;
  const thisWeekCount = activities.filter(item => item.date >= weekAgoStr && item.date <= todayStr).length;
  const referralCount = activities.filter(item => item.type === 'Referral').length;
  const connectionCount = activities.filter(item => item.type === 'LinkedIn Connection').length;
  const latest = activities[0];
  const latestDraft = generateOutreachDraft({
    contactName: latest?.contactName || '',
    company: latest?.company || '',
    askType: latest?.type === 'Referral' ? 'referral' : 'informational',
    notes: latest?.notes || ''
  });

  container.innerHTML = `
    <div class="section-shell">
      <div class="section-intro">
        <div class="section-title-row">
          <p class="eyebrow">Relationship Engine</p>
          <h2>Networking</h2>
          <p class="section-copy">Track conversations, keep outcomes visible, and generate lightweight outreach drafts without paid tools.</p>
        </div>
        <button class="btn" id="toggleNetForm" type="button">+ Activity</button>
      </div>

      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-value">${totalCount}</div>
          <div class="metric-label">Activities</div>
          <div class="metric-detail">Total networking touchpoints logged.</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${thisWeekCount}</div>
          <div class="metric-label">This Week</div>
          <div class="metric-detail">Momentum from the last 7 days.</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${referralCount}</div>
          <div class="metric-label">Referrals</div>
          <div class="metric-detail">People directly helping your pipeline.</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${connectionCount}</div>
          <div class="metric-label">Connections</div>
          <div class="metric-detail">New relationship surface area.</div>
        </div>
      </div>

      <div class="grid cols-2">
        <div class="panel stack-md">
          <div id="netFormWrap" class="surface-inline hidden">
            <div class="section-title-row">
              <h3>Add Networking Activity</h3>
              <p class="section-copy">Capture the contact, what happened, and the next useful outcome.</p>
            </div>
            <div class="inline-form">
              <label class="field-group compact">
                <span class="muted">Type</span>
                <select class="input" id="netType">
                  ${ACTIVITY_TYPES.map(type => `<option>${type}</option>`).join('')}
                </select>
              </label>
              <label class="field-group">
                <span class="muted">Contact Name</span>
                <input type="text" class="input" id="netContact" placeholder="Jane Smith">
              </label>
              <label class="field-group">
                <span class="muted">Company</span>
                <input type="text" class="input" id="netCompany" placeholder="Acme Corp">
              </label>
              <label class="field-group compact">
                <span class="muted">Date</span>
                <input type="date" class="input" id="netDate" value="${todayStr}">
              </label>
            </div>
            <label class="field-group">
              <span class="muted">Notes</span>
              <textarea class="input" id="netNotes" rows="2" placeholder="What was discussed, what stood out, what you should follow up on..."></textarea>
            </label>
            <label class="field-group">
              <span class="muted">Outcome</span>
              <input type="text" class="input" id="netOutcome" placeholder="Scheduled follow-up, got advice, opened referral path...">
            </label>
            <div class="action-cluster">
              <button class="btn brand" id="saveNet" type="button">Save Activity</button>
              <button class="btn ghost" id="cancelNet" type="button">Cancel</button>
            </div>
          </div>

          <div class="section-title-row">
            <h3>Activity Log</h3>
            <p class="section-copy">A simple CRM-style view of recent relationship-building work.</p>
          </div>
          <div class="table-wrap">
            <table class="table" id="netTable">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Contact</th>
                  <th>Company</th>
                  <th>Notes</th>
                  <th>Outcome</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="netTbody">${renderActivityRows(activities)}</tbody>
            </table>
          </div>
        </div>

        <div class="panel stack-md">
          <div class="section-title-row">
            <h3>Outreach Helper</h3>
            <p class="section-copy">Generate a concise starter draft for informational chats, referrals, or follow-ups using only local logic.</p>
          </div>
          <div class="surface-inline stack-md">
            <div class="inline-form">
              <label class="field-group">
                <span class="muted">Contact Name</span>
                <input class="input" id="draftContact" value="${escapeHtml(latest?.contactName || '')}" placeholder="Santiago">
              </label>
              <label class="field-group">
                <span class="muted">Company</span>
                <input class="input" id="draftCompany" value="${escapeHtml(latest?.company || '')}" placeholder="Career Ops">
              </label>
            </div>
            <div class="inline-form">
              <label class="field-group">
                <span class="muted">Role</span>
                <input class="input" id="draftRole" placeholder="AI Engineer">
              </label>
              <label class="field-group compact">
                <span class="muted">Ask Type</span>
                <select class="input" id="draftAskType">
                  <option value="informational">Informational</option>
                  <option value="referral">Referral</option>
                  <option value="followup">Follow-Up</option>
                </select>
              </label>
            </div>
            <label class="field-group">
              <span class="muted">Shared Context</span>
              <input class="input" id="draftSharedContext" placeholder="mutual interest in AI workflow automation">
            </label>
            <label class="field-group">
              <span class="muted">Extra Notes</span>
              <textarea class="input" id="draftNotes" rows="3" placeholder="What should the draft mention or ask for?">${escapeHtml(latest?.notes || '')}</textarea>
            </label>
            <div class="action-cluster">
              <button class="btn brand" id="generateDraft" type="button">Generate Draft</button>
              <button class="btn ghost" id="copyDraft" type="button">Copy</button>
            </div>
          </div>
          <div class="draft-output">
            <strong>Subject</strong>
            <p id="draftSubject" style="margin-top:6px;">${escapeHtml(latestDraft.subject)}</p>
            <strong>Message</strong>
            <textarea id="draftBody">${escapeHtml(latestDraft.body)}</textarea>
          </div>
        </div>
      </div>
    </div>
  `;

  const formWrap = container.querySelector('#netFormWrap');

  container.querySelector('#toggleNetForm')?.addEventListener('click', () => {
    formWrap?.classList.toggle('hidden');
  });
  container.querySelector('#cancelNet')?.addEventListener('click', () => {
    formWrap?.classList.add('hidden');
  });

  container.querySelector('#saveNet')?.addEventListener('click', () => {
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

    const nextActivities = state.get('networking') || [];
    nextActivities.push({
      id: uid(),
      type,
      contactName,
      company,
      date,
      notes,
      outcome,
      createdAt: new Date().toISOString()
    });
    state.set('networking', nextActivities);
    toast('Activity added', 'success');
    renderNetworking(container, state);
  });

  container.querySelector('#netTable')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-act="del"]');
    if (!button) return;
    const nextActivities = (state.get('networking') || []).filter(activity => activity.id !== button.dataset.id);
    state.set('networking', nextActivities);
    toast('Activity removed', 'info');
    renderNetworking(container, state);
  });

  container.querySelector('#generateDraft')?.addEventListener('click', () => {
    const draft = generateOutreachDraft({
      contactName: container.querySelector('#draftContact')?.value || '',
      company: container.querySelector('#draftCompany')?.value || '',
      role: container.querySelector('#draftRole')?.value || '',
      askType: container.querySelector('#draftAskType')?.value || 'informational',
      sharedContext: container.querySelector('#draftSharedContext')?.value || '',
      notes: container.querySelector('#draftNotes')?.value || ''
    });

    const subjectEl = container.querySelector('#draftSubject');
    const bodyEl = container.querySelector('#draftBody');
    if (subjectEl) subjectEl.textContent = draft.subject;
    if (bodyEl) bodyEl.value = draft.body;
    toast('Draft generated', 'success');
  });

  container.querySelector('#copyDraft')?.addEventListener('click', async () => {
    const subject = container.querySelector('#draftSubject')?.textContent || '';
    const body = container.querySelector('#draftBody')?.value || '';
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      toast('Draft copied', 'success');
    } catch {
      toast('Copy failed in this browser', 'error');
    }
  });
}

export default { renderNetworking };
