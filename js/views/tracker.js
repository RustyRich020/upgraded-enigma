/* ============================================================
   views/tracker.js — Job tracker table + kanban views
   ============================================================ */

import { escapeHtml, fmtDate, today } from '../utils.js';
import { STATUSES } from '../config.js';
import { buildCareerProfile, evaluateOpportunity } from '../services/career-ops-lite.js';

/**
 * Render the tracker view (table + kanban toggle).
 * @param {HTMLElement} container — section element
 * @param {object} state — state store
 * @param {{ addJob: Function, updateJob: Function, removeJob: Function }} actions
 */
export function renderTracker(container, state, { addJob, updateJob, removeJob }) {
  // Filter out _meta docs from Firestore
  const jobs = (state.get('jobs') || []).filter(j => j.id && j.id !== '_meta' && j.title);
  const profile = buildCareerProfile({
    resumes: state.get('resumes') || [],
    jobs,
    offers: state.get('offers') || [],
    settings: state.get('settings') || {}
  });
  const scoredJobs = jobs.map(job => ({
    ...job,
    fit: evaluateOpportunity(job, profile)
  }));
  const isListView = state.get('listView') !== false;
  const role = state.get('role') || 'Candidate';
  const hideSalary = role === 'Auditor';

  // Render table
  const tbody = container.querySelector('#trackerTable tbody');
  if (tbody) {
    if (jobs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-state-icon">&#9670;</div><h3>No jobs tracked yet</h3><p>Click "+ JOB" to add your first application</p></div></td></tr>`;
    } else {
      tbody.innerHTML = scoredJobs.map(j => `
        <tr draggable="true" data-id="${j.id}">
          <td>
            <div class="table-job-cell">
              ${j.url
                ? `<a href="${escapeHtml(j.url)}" target="_blank" style="color:var(--color-primary)">${escapeHtml(j.title || '')}</a>`
                : escapeHtml(j.title || '')
              }
              ${j.fit ? `<div class="fit-inline"><span class="fit-grade fit-grade-${(j.fit.grade || 'c').toLowerCase()}">${escapeHtml(j.fit.grade)}</span><span class="muted">${j.fit.score}% fit</span></div>` : ''}
            </div>
          </td>
          <td>${escapeHtml(j.company || '')}</td>
          <td>
            <select class="input small" data-act="chgStatus" data-id="${j.id}" style="width:auto">
              ${STATUSES.map(s => `<option ${j.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </td>
          <td>
            <input type="date" class="input" data-act="chgFollow" data-id="${j.id}" value="${fmtDate(j.follow)}" style="width:auto">
          </td>
          <td class="salary-cell" ${hideSalary ? 'style="display:none"' : ''}>
            ${j.salary ? '$' + Number(j.salary).toLocaleString() : ''}
          </td>
          <td>${escapeHtml(j.source || '')}</td>
          <td style="white-space:nowrap">
            <button class="btn small" data-act="quickFollow" data-id="${j.id}">+3d</button>
            <button class="btn small" data-act="quickFollow7" data-id="${j.id}">+7d</button>
            <button class="btn danger small" data-act="del" data-id="${j.id}">DEL</button>
          </td>
        </tr>
      `).join('');
    }

    // Hide salary column header if auditor
    container.querySelectorAll('.salary-col').forEach(el => {
      el.style.display = hideSalary ? 'none' : '';
    });
  }

  // Table event delegation
  const table = container.querySelector('#trackerTable');
  if (table) {
    table.onchange = (e) => {
      const id = e.target.getAttribute('data-id');
      const act = e.target.getAttribute('data-act');
      if (act === 'chgStatus') updateJob(id, { status: e.target.value });
      if (act === 'chgFollow') updateJob(id, { follow: e.target.value });
    };

    table.onclick = (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      const act = btn.getAttribute('data-act');
      if (act === 'del') removeJob(id);
      if (act === 'quickFollow') updateJob(id, { follow: today(3) });
      if (act === 'quickFollow7') updateJob(id, { follow: today(7) });
    };
  }

  // Kanban rendering
  renderKanban(container, scoredJobs, updateJob);

  // Toggle view button
  const toggleBtn = container.querySelector('#toggleViewBtn');
  if (toggleBtn) {
    toggleBtn.textContent = isListView ? 'KANBAN' : 'LIST';
    toggleBtn.onclick = () => {
      const next = !state.get('listView');
      state.set('listView', next);
      const listView = container.querySelector('#listView');
      const kanbanView = container.querySelector('#kanbanView');
      if (listView) listView.classList.toggle('hidden', !next);
      if (kanbanView) kanbanView.classList.toggle('hidden', next);
      toggleBtn.textContent = next ? 'KANBAN' : 'LIST';
      if (!next) {
        const nextJobs = (state.get('jobs') || []).filter(j => j.id && j.id !== '_meta' && j.title).map(job => ({
          ...job,
          fit: evaluateOpportunity(job, buildCareerProfile({
            resumes: state.get('resumes') || [],
            jobs: state.get('jobs') || [],
            offers: state.get('offers') || [],
            settings: state.get('settings') || {}
          }))
        }));
        renderKanban(container, nextJobs, updateJob);
      }
    };
  }

  // Sync visibility
  const listView = container.querySelector('#listView');
  const kanbanView = container.querySelector('#kanbanView');
  if (listView) listView.classList.toggle('hidden', !isListView);
  if (kanbanView) kanbanView.classList.toggle('hidden', isListView);
}

function renderKanban(container, jobs, updateJob) {
  container.querySelectorAll('.drop').forEach(d => { d.innerHTML = ''; });

  (jobs || []).forEach(j => {
    const el = document.createElement('div');
    el.className = 'card';
    el.draggable = true;
    el.dataset.id = j.id;
    el.innerHTML = `
      <strong>${escapeHtml(j.title)}</strong>
      <div class="muted">${escapeHtml(j.company)}</div>
      ${j.fit ? `<div class="fit-inline"><span class="fit-grade fit-grade-${(j.fit.grade || 'c').toLowerCase()}">${escapeHtml(j.fit.grade)}</span><span class="muted">${j.fit.score}% fit</span></div>` : ''}
    `;

    el.addEventListener('dragstart', ev => {
      ev.dataTransfer.setData('text/plain', j.id);
    });

    const col = container.querySelector(`.drop[data-status="${j.status}"]`)
      || container.querySelector('.drop[data-status="Saved"]');
    if (col) col.appendChild(el);
  });

  // Drop zones
  container.querySelectorAll('.drop').forEach(d => {
    d.ondragover = e => e.preventDefault();
    d.ondrop = e => {
      e.preventDefault();
      const id = e.dataTransfer.getData('text/plain');
      updateJob(id, { status: d.dataset.status });
    };
  });
}

export default { renderTracker };
