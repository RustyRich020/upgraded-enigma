/* ============================================================
   views/find-jobs.js — Consolidated Find Jobs view
   Merges Job Search + ATS Optimizer + Job Agent into one
   tabbed page.
   ============================================================ */

import { renderJobSearch } from './job-search.js';
import { renderATSOptimizer } from './ats-optimizer.js';
import { renderAgentDashboard } from './agent-dashboard.js';
import { enableTabKeyboardNavigation, setActiveTab } from '../ui/a11y.js';
import { initSwipeCards } from '../ui/swipe-cards.js';

const SEARCH_DB_KEY = 'jobsynk_search_results';
const SESSION_KEY = 'jobsynk_findJobs_activeTab';

function getStoredSearchCount() {
  try {
    return JSON.parse(localStorage.getItem(SEARCH_DB_KEY) || '[]').length;
  } catch {
    return 0;
  }
}

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
  const storedResults = getStoredSearchCount();
  const resumes = (state.get('resumes') || []).filter(item => item.id && item.id !== '_meta');
  const activeJobs = (state.get('jobs') || []).filter(item => item.id && item.id !== '_meta' && item.status !== 'Closed');
  const settings = state.get('settings') || {};
  const connectedKeys = ['adzunaId', 'adzunaKey', 'jsearchKey'].filter(key => Boolean(settings[key])).length;

  container.innerHTML = `
    <div class="section-shell">
      <div class="section-intro">
        <div class="section-title-row">
          <p class="eyebrow">Opportunity Flow</p>
          <h2>Find Jobs</h2>
          <p class="section-copy">Search openings, stress-test your resume against postings, and let the job agent help with discovery from one workspace.</p>
        </div>
      </div>
      <div class="section-hero">
        <div class="glance-grid">
          <div class="glance-card">
            <div class="glance-label">Stored Results</div>
            <div class="glance-value">${storedResults}</div>
            <div class="glance-copy">${storedResults ? 'Your search database is ready for filtering and re-sorting.' : 'Run a search once and your best leads will stay nearby.'}</div>
          </div>
          <div class="glance-card">
            <div class="glance-label">Resume Coverage</div>
            <div class="glance-value">${resumes.length}</div>
            <div class="glance-copy">${resumes.length ? 'You have profile material ready for ATS checks and fit scoring.' : 'Add a resume to make role scoring and ATS help more useful.'}</div>
          </div>
          <div class="glance-card">
            <div class="glance-label">Pipeline Ready</div>
            <div class="glance-value">${activeJobs.length}</div>
            <div class="glance-copy">${activeJobs.length ? `${activeJobs.length} tracked roles can inform better search decisions.` : 'No active roles yet, so this is a good moment to build the top of funnel.'}</div>
          </div>
        </div>
        <div class="quick-switcher" aria-label="Find Jobs shortcuts">
          <span class="muted">Jump to:</span>
          <button class="btn small ghost" type="button" data-jump-tab="search">Search roles</button>
          <button class="btn small ghost" type="button" data-jump-tab="ats">Check ATS fit</button>
          <button class="btn small ghost" type="button" data-jump-tab="agent">Open job agent</button>
          <span class="chip">${connectedKeys ? `${connectedKeys} premium source key${connectedKeys === 1 ? '' : 's'} connected` : 'Free sources ready'}</span>
        </div>
      </div>
      <div class="view-tabs" role="tablist" aria-label="Find Jobs views">
        <button class="view-tab ${savedTab === 'search' ? 'active' : ''}" data-tab="search" role="tab" aria-selected="${savedTab === 'search'}">Search</button>
        <button class="view-tab ${savedTab === 'ats' ? 'active' : ''}" data-tab="ats" role="tab" aria-selected="${savedTab === 'ats'}">ATS Optimizer</button>
        <button class="view-tab ${savedTab === 'agent' ? 'active' : ''}" data-tab="agent" role="tab" aria-selected="${savedTab === 'agent'}">Job Agent</button>
      </div>
      <div class="tab-content ${savedTab !== 'search' ? 'hidden' : ''}" id="tab-search"></div>
      <div class="tab-content ${savedTab !== 'ats' ? 'hidden' : ''}" id="tab-ats"></div>
      <div class="tab-content ${savedTab !== 'agent' ? 'hidden' : ''}" id="tab-agent"></div>
    </div>
  `;

  // Swipe carousel for mobile
  initSwipeCards(container.querySelector('.glance-grid'), { label: 'Find Jobs stats' });

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

  /* ---- Track which tabs have been rendered ---- */
  const rendered = new Set();

  function renderTabOnce(tab) {
    if (!rendered.has(tab)) {
      renderTab(tab, panes, state, addJob);
      rendered.add(tab);
    }
  }

  function activateTab(tab) {
    setActiveTab(tabBar, tab);
    Object.entries(panes).forEach(([key, el]) => {
      el.classList.toggle('hidden', key !== tab);
    });
    sessionStorage.setItem(SESSION_KEY, tab);
    renderTabOnce(tab);
  }

  /* ---- Render the active tab immediately ---- */
  activateTab(savedTab);

  /* ---- Tab click handler — show/hide, don't re-render ---- */
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

  // Auto-search: pick up pending search from onboarding flow
  const pendingSearch = sessionStorage.getItem('jobsynk_pending_search');
  if (pendingSearch) {
    sessionStorage.removeItem('jobsynk_pending_search');
    // Ensure search tab is active and rendered
    activateTab('search');
    // Fill in keyword and trigger search after a short delay for DOM readiness
    setTimeout(() => {
      const keywordInput = container.querySelector('#searchKeyword') || container.querySelector('input[placeholder*="security"]');
      if (keywordInput) {
        keywordInput.value = pendingSearch;
        keywordInput.dispatchEvent(new Event('input', { bubbles: true }));
        // Click search button after input is set
        setTimeout(() => {
          const searchBtn = container.querySelector('#searchAllBtn') || container.querySelector('button[class*="brand"]');
          if (searchBtn) searchBtn.click();
        }, 500);
      }
    }, 300);
  }
}

/* ============================================================
   Tab content shells — provide the DOM structure each
   sub-view expects (querySelector targets).
   ============================================================ */

function buildSearchPane(el) {
  el.innerHTML = `
    <div class="toolbar">
      <h3>Job Search</h3>
      <span class="tag green">Unified</span>
    </div>

    <div class="panel stack-md" style="margin-bottom:16px;">
      <div class="inline-form">
        <div class="field-group">
          <label class="muted" style="display:block;font-size:12px;">Keywords</label>
          <input id="searchKeyword" class="input" placeholder="e.g. security analyst" />
        </div>
        <div class="field-group">
          <label class="muted" style="display:block;font-size:12px;">Location</label>
          <input id="searchLocation" class="input" placeholder="e.g. Remote, NYC" />
        </div>
        <div class="field-group compact">
          <label class="muted" style="display:block;font-size:12px;">Min Salary</label>
          <input id="searchMinSalary" class="input" type="number" placeholder="50000" />
        </div>
        <div class="field-group compact">
          <label class="muted" style="display:block;font-size:12px;">Remote</label>
          <select id="searchRemoteFilter" class="input">
            <option value="">Any</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On-site</option>
          </select>
        </div>
        <button id="searchAllBtn" class="btn brand">Search All</button>
      </div>
    </div>

    <!-- Filter bar -->
    <div id="searchFilterBar" style="display:none;margin-bottom:12px;">
      <div class="action-cluster">
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
