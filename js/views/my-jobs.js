/* ============================================================
   views/my-jobs.js — Consolidated My Jobs view
   Merges Tracker (table) + Kanban + Timeline into one
   tabbed page with a Compare toolbar button.
   ============================================================ */

import { escapeHtml } from '../utils.js';
import { renderTracker } from './tracker.js';
import { renderTimeline } from './timeline.js';
import { toast } from '../components/toast.js';
import { renderJobComparison } from '../services/jd-intelligence.js';
import { buildCareerProfile, evaluateOpportunity } from '../services/career-ops-lite.js';
import { enableTabKeyboardNavigation, setActiveTab } from '../ui/a11y.js';
import { initSwipeCards } from '../ui/swipe-cards.js';

const SESSION_KEY = 'jobsynk_myJobs_activeTab';

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
  const jobs = (state.get('jobs') || []).filter(j => j.id && j.id !== '_meta' && j.title);
  const activeCount = jobs.filter(job => job.status !== 'Closed').length;
  const interviewCount = jobs.filter(job => ['Interview', 'Offer'].includes(job.status)).length;
  const dueSoonLimit = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10);
  const followUpCount = jobs.filter(job => job.follow && job.follow <= dueSoonLimit && job.status !== 'Closed').length;
  const profile = buildCareerProfile({
    resumes: state.get('resumes') || [],
    jobs,
    offers: state.get('offers') || [],
    settings: state.get('settings') || {}
  });
  const scoredJobs = jobs.map(job => evaluateOpportunity(job, profile));
  const avgFit = scoredJobs.length
    ? Math.round(scoredJobs.reduce((sum, item) => sum + item.score, 0) / scoredJobs.length)
    : 0;

  container.innerHTML = `
    <div class="section-shell">
      <div class="section-intro">
        <div class="section-title-row">
          <p class="eyebrow">Pipeline Control</p>
          <h2>My Jobs</h2>
          <p class="section-copy">${jobs.length ? `${activeCount} active jobs and ${interviewCount} roles in later stages.` : 'Capture roles, organize them visually, and review the full timeline of your search.'}</p>
        </div>
        <button id="compareJobsBtn" class="btn ghost small" type="button">Compare</button>
      </div>
      <div class="section-hero">
        <div class="glance-grid">
          <div class="glance-card">
            <div class="glance-label">Active Pipeline</div>
            <div class="glance-value">${activeCount}</div>
            <div class="glance-copy">${activeCount ? 'These roles are still alive and need active attention.' : 'Your tracker is quiet right now. Add a few roles to build momentum.'}</div>
          </div>
          <div class="glance-card">
            <div class="glance-label">Due This Week</div>
            <div class="glance-value">${followUpCount}</div>
            <div class="glance-copy">${followUpCount ? 'Follow-ups are coming due soon, so this is your highest-leverage admin work.' : 'No near-term follow-ups are due. You have room to search or prep.'}</div>
          </div>
          <div class="glance-card">
            <div class="glance-label">Average Fit</div>
            <div class="glance-value">${avgFit ? `${avgFit}%` : '--'}</div>
            <div class="glance-copy">${avgFit ? 'A quick signal for how aligned your current pipeline is overall.' : 'Upload a resume and add role detail to unlock stronger fit signals.'}</div>
          </div>
        </div>
        <div class="quick-switcher" aria-label="My Jobs shortcuts">
          <span class="muted">Jump to:</span>
          <button class="btn small ghost" type="button" data-jump-tab="table">Review table</button>
          <button class="btn small ghost" type="button" data-jump-tab="kanban">Move stages</button>
          <button class="btn small ghost" type="button" data-jump-tab="timeline">See timeline</button>
          <span class="chip">${interviewCount} late-stage role${interviewCount === 1 ? '' : 's'}</span>
        </div>
      </div>
      <div class="view-tabs" role="tablist" aria-label="My Jobs views">
        <button class="view-tab ${savedTab === 'table' ? 'active' : ''}" data-tab="table" role="tab" aria-selected="${savedTab === 'table'}">Table</button>
        <button class="view-tab ${savedTab === 'kanban' ? 'active' : ''}" data-tab="kanban" role="tab" aria-selected="${savedTab === 'kanban'}">Kanban</button>
        <button class="view-tab ${savedTab === 'timeline' ? 'active' : ''}" data-tab="timeline" role="tab" aria-selected="${savedTab === 'timeline'}">Timeline</button>
      </div>

      <div class="tab-content ${savedTab !== 'table' ? 'hidden' : ''}" id="tab-table"></div>
      <div class="tab-content ${savedTab !== 'kanban' ? 'hidden' : ''}" id="tab-kanban"></div>
      <div class="tab-content ${savedTab !== 'timeline' ? 'hidden' : ''}" id="tab-timeline"></div>

      <!-- Comparison panel (hidden by default) -->
      <div id="comparePanel" class="panel hidden">
        <div class="section-intro">
          <div class="section-title-row">
            <h3>Job Comparison</h3>
            <p class="section-copy">Pick 2 to 3 jobs to compare ATS fit and gaps side by side.</p>
          </div>
          <button id="closeCompareBtn" class="btn small ghost" type="button">Close</button>
        </div>
        <div id="compareJobSelect" class="compare-picker" style="margin-bottom:12px;"></div>
        <button id="runCompareBtn" class="btn brand small" style="margin-bottom:16px;" type="button">Run Comparison</button>
        <div id="compareResults"></div>
      </div>
    </div>
  `;

  // Swipe carousel for mobile
  initSwipeCards(container.querySelector('.glance-grid'), { label: 'My Jobs stats' });

  const tabBar = container.querySelector('.view-tabs');
  const panes = {
    table: container.querySelector('#tab-table'),
    kanban: container.querySelector('#tab-kanban'),
    timeline: container.querySelector('#tab-timeline'),
  };

  buildTablePane(panes.table);
  buildKanbanPane(panes.kanban);
  buildTimelinePane(panes.timeline);

  const rendered = new Set();
  function renderTabOnce(tab) {
    renderTab(tab, panes, state, { addJob, updateJob, removeJob });
    rendered.add(tab);
  }

  function activateTab(tab) {
    setActiveTab(tabBar, tab);
    Object.entries(panes).forEach(([key, el]) => {
      el.classList.toggle('hidden', key !== tab);
    });
    sessionStorage.setItem(SESSION_KEY, tab);
    if (!rendered.has(tab) || tab === 'table' || tab === 'kanban') {
      renderTabOnce(tab);
    }
  }

  activateTab(savedTab);

  tabBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.view-tab');
    if (!btn) return;
    const tab = btn.dataset.tab;
    if (!tab) return;
    activateTab(tab);
  });

  container.querySelectorAll('[data-jump-tab]').forEach(button => {
    button.addEventListener('click', () => {
      const tab = button.dataset.jumpTab;
      if (tab) activateTab(tab);
    });
  });

  enableTabKeyboardNavigation(tabBar, activateTab);

  /* ---- Compare button ---- */
  const comparePanel = container.querySelector('#comparePanel');
  const compareBtn = container.querySelector('#compareJobsBtn');
  const closeCompareBtn = container.querySelector('#closeCompareBtn');

  compareBtn.addEventListener('click', () => {
    const isVisible = !comparePanel.classList.contains('hidden');
    comparePanel.classList.toggle('hidden', isVisible);
    if (!isVisible) buildCompareSelector(container, state);
  });

  closeCompareBtn.addEventListener('click', () => {
    comparePanel.classList.add('hidden');
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
      <div class="action-cluster">
        <button id="toggleViewBtn" class="btn ghost small" type="button">Kanban</button>
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
    ${jobs.map(j => `
      <label>
        <input type="checkbox" class="compare-check" value="${j.id}" />
        <strong>${escapeHtml(j.title)}</strong>
        <span class="muted">@ ${escapeHtml(j.company || 'Unknown')}</span>
      </label>
    `).join('')}
  `;
}

export default { renderMyJobs };
