/* ============================================================
   views/my-jobs.js — Consolidated My Jobs view
   Merges Tracker (table) + Kanban + Timeline into one
   tabbed page with a Compare toolbar button.
   ============================================================ */

import { escapeHtml, fmtDate, today } from '../utils.js';
import { STATUSES } from '../config.js';
import { renderTracker } from './tracker.js';
import { renderTimeline } from './timeline.js';
import { toast } from '../components/toast.js';
import { renderJobComparison } from '../services/jd-intelligence.js';

const SESSION_KEY = 'tron_myJobs_activeTab';

/**
 * Render the consolidated My Jobs view with 3 tabs:
 * Table | Kanban | Timeline
 *
 * @param {HTMLElement} container — parent element to render into
 * @param {object} state — state store
 * @param {{ addJob: Function, updateJob: Function, removeJob: Function }} actions
 */
export function renderMyJobs(container, state, { addJob, updateJob, removeJob }) {
  const savedTab = sessionStorage.getItem(SESSION_KEY) || 'table';

  container.innerHTML = `
    <div class="toolbar" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
      <div class="view-tabs" style="border-bottom:none;">
        <button class="view-tab ${savedTab === 'table' ? 'active' : ''}" data-tab="table">Table</button>
        <button class="view-tab ${savedTab === 'kanban' ? 'active' : ''}" data-tab="kanban">Kanban</button>
        <button class="view-tab ${savedTab === 'timeline' ? 'active' : ''}" data-tab="timeline">Timeline</button>
      </div>
      <button id="compareJobsBtn" class="btn ghost small">Compare</button>
    </div>

    <div class="tab-content ${savedTab !== 'table' ? 'hidden' : ''}" id="tab-table"></div>
    <div class="tab-content ${savedTab !== 'kanban' ? 'hidden' : ''}" id="tab-kanban"></div>
    <div class="tab-content ${savedTab !== 'timeline' ? 'hidden' : ''}" id="tab-timeline"></div>

    <!-- Comparison panel (hidden by default) -->
    <div id="comparePanel" class="panel" style="display:none;margin-top:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h3 style="margin:0;">Job Comparison</h3>
        <button id="closeCompareBtn" class="btn small ghost">Close</button>
      </div>
      <p class="muted" style="margin-bottom:12px;">Select 2-3 jobs below to compare ATS scores and skill gaps.</p>
      <div id="compareJobSelect" style="margin-bottom:12px;"></div>
      <button id="runCompareBtn" class="btn brand small" style="margin-bottom:16px;">Run Comparison</button>
      <div id="compareResults"></div>
    </div>
  `;

  const tabBar = container.querySelector('.view-tabs');
  const panes = {
    table: container.querySelector('#tab-table'),
    kanban: container.querySelector('#tab-kanban'),
    timeline: container.querySelector('#tab-timeline'),
  };

  /* ---- Build inner content shells ---- */
  buildTablePane(panes.table);
  buildKanbanPane(panes.kanban);
  buildTimelinePane(panes.timeline);

  /* ---- Render the active tab ---- */
  renderTab(savedTab, panes, state, { addJob, updateJob, removeJob });

  /* ---- Tab click handler ---- */
  tabBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.view-tab');
    if (!btn) return;
    const tab = btn.dataset.tab;
    if (!tab) return;

    tabBar.querySelectorAll('.view-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    Object.entries(panes).forEach(([key, el]) => {
      el.classList.toggle('hidden', key !== tab);
    });

    sessionStorage.setItem(SESSION_KEY, tab);
    renderTab(tab, panes, state, { addJob, updateJob, removeJob });
  });

  /* ---- Compare button ---- */
  const comparePanel = container.querySelector('#comparePanel');
  const compareBtn = container.querySelector('#compareJobsBtn');
  const closeCompareBtn = container.querySelector('#closeCompareBtn');

  compareBtn.addEventListener('click', () => {
    const isVisible = comparePanel.style.display !== 'none';
    comparePanel.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) buildCompareSelector(container, state);
  });

  closeCompareBtn.addEventListener('click', () => {
    comparePanel.style.display = 'none';
  });

  /* ---- Run Comparison ---- */
  const runCompareBtn = container.querySelector('#runCompareBtn');
  runCompareBtn.addEventListener('click', () => {
    const checked = container.querySelectorAll('.compare-check:checked');
    if (checked.length < 2) {
      toast('Select at least 2 jobs to compare', 'error');
      return;
    }
    if (checked.length > 3) {
      toast('Select at most 3 jobs to compare', 'error');
      return;
    }

    const jobs = state.get('jobs') || [];
    const selectedJobs = Array.from(checked).map(cb => {
      return jobs.find(j => j.id === cb.value);
    }).filter(Boolean);

    const resumes = (state.get('resumes') || []).filter(r => r.id !== '_meta' && r.text);
    const resumeText = resumes.length > 0 ? resumes[resumes.length - 1].text : '';

    const resultsEl = container.querySelector('#compareResults');
    renderJobComparison(resultsEl, selectedJobs, resumeText);
  });
}

/* ============================================================
   Build pane shells with expected DOM targets
   ============================================================ */

function buildTablePane(el) {
  el.innerHTML = `
    <div class="toolbar" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
      <h2>Applications</h2>
      <div style="display:flex;gap:8px;">
        <button id="toggleViewBtn" class="btn ghost small">KANBAN</button>
      </div>
    </div>

    <div id="listView">
      <div class="table-wrap">
        <table id="trackerTable" class="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Company</th>
              <th>Status</th>
              <th>Follow-up</th>
              <th class="salary-col">Salary</th>
              <th>Source</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>

    <div id="kanbanView" class="hidden">
      <div class="kanban">
        ${['Saved', 'Applied', 'Interview', 'Offer', 'Closed'].map(s => `
          <div class="kanban-col">
            <div class="kanban-col-header">${s}</div>
            <div class="drop" data-status="${s}"></div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function buildKanbanPane(el) {
  el.innerHTML = `
    <div class="kanban">
      ${['Saved', 'Applied', 'Interview', 'Offer', 'Closed'].map(s => `
        <div class="kanban-col">
          <div class="kanban-col-header">${s}</div>
          <div class="drop" data-status="${s}"></div>
        </div>
      `).join('')}
    </div>
  `;
}

function buildTimelinePane(el) {
  // Timeline view renders its own innerHTML
  el.innerHTML = '';
}

/* ============================================================
   Render individual tab content
   ============================================================ */

function renderTab(tab, panes, state, actions) {
  switch (tab) {
    case 'table':
      renderTracker(panes.table, state, actions);
      break;
    case 'kanban':
      renderKanbanTab(panes.kanban, state, actions.updateJob);
      break;
    case 'timeline':
      renderTimeline(panes.timeline, state);
      break;
  }
}

/* ============================================================
   Standalone Kanban renderer for the Kanban tab
   ============================================================ */

function renderKanbanTab(container, state, updateJob) {
  const jobs = (state.get('jobs') || []).filter(j => j.id && j.id !== '_meta' && j.title);

  container.querySelectorAll('.drop').forEach(d => { d.innerHTML = ''; });

  jobs.forEach(j => {
    const el = document.createElement('div');
    el.className = 'card';
    el.draggable = true;
    el.dataset.id = j.id;
    el.innerHTML = `
      <strong>${escapeHtml(j.title)}</strong>
      <div class="muted">${escapeHtml(j.company || '')}</div>
      ${j.salary ? `<div style="font-size:12px;color:var(--color-primary);">$${Number(j.salary).toLocaleString()}</div>` : ''}
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

/* ============================================================
   Comparison job selector
   ============================================================ */

function buildCompareSelector(container, state) {
  const jobs = (state.get('jobs') || []).filter(j => j.id && j.id !== '_meta' && j.title);
  const selectEl = container.querySelector('#compareJobSelect');

  if (jobs.length === 0) {
    selectEl.innerHTML = '<p class="muted">No tracked jobs to compare. Add jobs first.</p>';
    return;
  }

  selectEl.innerHTML = `
    <div style="max-height:200px;overflow-y:auto;border:1px solid var(--color-surface-border);border-radius:var(--radius-md);padding:8px;">
      ${jobs.map(j => `
        <label style="display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;">
          <input type="checkbox" class="compare-check" value="${j.id}" />
          <strong>${escapeHtml(j.title)}</strong>
          <span class="muted">@ ${escapeHtml(j.company || 'Unknown')}</span>
        </label>
      `).join('')}
    </div>
  `;
}

export default { renderMyJobs };
