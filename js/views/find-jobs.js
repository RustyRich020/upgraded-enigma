/* ============================================================
   views/find-jobs.js — Consolidated Find Jobs view
   Merges Job Search + ATS Optimizer + Job Agent into one
   tabbed page.
   ============================================================ */

import { renderJobSearch } from './job-search.js';
import { renderATSOptimizer } from './ats-optimizer.js';
import { renderAgentDashboard } from './agent-dashboard.js';

const SESSION_KEY = 'tron_findJobs_activeTab';

/**
 * Render the consolidated Find Jobs view with 3 tabs:
 * Search | ATS Optimizer | Job Agent
 *
 * @param {HTMLElement} container — parent element to render into
 * @param {object} state — state store
 * @param {Function} addJob — callback to add a job to the tracker
 */
export function renderFindJobs(container, state, addJob) {
  const savedTab = sessionStorage.getItem(SESSION_KEY) || 'search';

  container.innerHTML = `
    <div class="view-tabs">
      <button class="view-tab ${savedTab === 'search' ? 'active' : ''}" data-tab="search">Search</button>
      <button class="view-tab ${savedTab === 'ats' ? 'active' : ''}" data-tab="ats">ATS Optimizer</button>
      <button class="view-tab ${savedTab === 'agent' ? 'active' : ''}" data-tab="agent">Job Agent</button>
    </div>
    <div class="tab-content ${savedTab !== 'search' ? 'hidden' : ''}" id="tab-search"></div>
    <div class="tab-content ${savedTab !== 'ats' ? 'hidden' : ''}" id="tab-ats"></div>
    <div class="tab-content ${savedTab !== 'agent' ? 'hidden' : ''}" id="tab-agent"></div>
  `;

  const tabBar = container.querySelector('.view-tabs');
  const panes = {
    search: container.querySelector('#tab-search'),
    ats: container.querySelector('#tab-ats'),
    agent: container.querySelector('#tab-agent'),
  };

  /* ---- Build inner content shells ---- */
  buildSearchPane(panes.search);
  buildATSPane(panes.ats);
  buildAgentPane(panes.agent);

  /* ---- Render the active tab immediately ---- */
  renderTab(savedTab, panes, state, addJob);

  /* ---- Tab click handler ---- */
  tabBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.view-tab');
    if (!btn) return;
    const tab = btn.dataset.tab;
    if (!tab) return;

    // Update active class
    tabBar.querySelectorAll('.view-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Toggle pane visibility
    Object.entries(panes).forEach(([key, el]) => {
      el.classList.toggle('hidden', key !== tab);
    });

    // Persist selection
    sessionStorage.setItem(SESSION_KEY, tab);

    // Re-render active tab
    renderTab(tab, panes, state, addJob);
  });
}

/* ============================================================
   Tab content shells — provide the DOM structure each
   sub-view expects (querySelector targets).
   ============================================================ */

function buildSearchPane(el) {
  el.innerHTML = `
    <div class="toolbar" style="flex-wrap:wrap;gap:8px;">
      <h2>Job Search</h2>
      <span class="tag green">Unified</span>
    </div>

    <div class="panel" style="margin-bottom:16px;">
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;">
        <div style="flex:1;min-width:160px;">
          <label class="muted" style="display:block;font-size:12px;margin-bottom:4px;">Keywords</label>
          <input id="searchKeyword" class="input" placeholder="e.g. security analyst" />
        </div>
        <div style="flex:1;min-width:140px;">
          <label class="muted" style="display:block;font-size:12px;margin-bottom:4px;">Location</label>
          <input id="searchLocation" class="input" placeholder="e.g. Remote, NYC" />
        </div>
        <div style="min-width:110px;">
          <label class="muted" style="display:block;font-size:12px;margin-bottom:4px;">Min Salary</label>
          <input id="searchMinSalary" class="input" type="number" placeholder="50000" />
        </div>
        <div style="min-width:100px;">
          <label class="muted" style="display:block;font-size:12px;margin-bottom:4px;">Remote</label>
          <select id="searchRemoteFilter" class="input">
            <option value="">Any</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On-site</option>
          </select>
        </div>
        <button id="searchAllBtn" class="btn brand" style="height:38px;">Search All</button>
      </div>
    </div>

    <!-- Filter bar -->
    <div id="searchFilterBar" style="display:none;margin-bottom:12px;">
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
        <select id="searchSourceFilter" class="input small" style="width:auto;">
          <option value="">All Sources</option>
        </select>
        <select id="searchSortBy" class="input small" style="width:auto;">
          <option value="date">Newest First</option>
          <option value="salary">Highest Salary</option>
          <option value="relevance">Most Relevant</option>
        </select>
        <span id="searchResultCount" class="muted" style="font-size:13px;"></span>
      </div>
    </div>

    <div id="searchStatus"></div>
    <div id="searchResults"></div>
  `;
}

function buildATSPane(el) {
  // ATS Optimizer renders its own innerHTML; just provide empty container
  el.innerHTML = '';
}

function buildAgentPane(el) {
  // Agent dashboard renders its own innerHTML; just provide empty container
  el.innerHTML = '';
}

/* ============================================================
   Render individual tab content
   ============================================================ */

function renderTab(tab, panes, state, addJob) {
  switch (tab) {
    case 'search':
      renderJobSearch(panes.search, state, addJob);
      break;
    case 'ats':
      renderATSOptimizer(panes.ats, state);
      break;
    case 'agent':
      renderAgentDashboard(panes.agent, state, addJob);
      break;
  }
}

export default { renderFindJobs };
