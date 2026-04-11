/* ============================================================
   views/my-profile.js — Consolidated My Profile view
   Merges Resume Center + AI Tools (Cover Letters) + Companies
   into one tabbed page.
   ============================================================ */

import { renderResumeCenter } from './resume-center.js';
import { renderAiTools } from './ai-tools.js';
import { renderCompanies } from './companies.js';

const SESSION_KEY = 'tron_myProfile_activeTab';

/**
 * Render the consolidated My Profile view with 3 tabs:
 * Resume | Cover Letters | Companies
 *
 * @param {HTMLElement} container — parent element to render into
 * @param {object} state — state store
 * @param {Function} addJob — callback to add a job
 */
export function renderMyProfile(container, state, addJob) {
  const savedTab = sessionStorage.getItem(SESSION_KEY) || 'resume';

  container.innerHTML = `
    <div class="view-tabs">
      <button class="view-tab ${savedTab === 'resume' ? 'active' : ''}" data-tab="resume">Resume</button>
      <button class="view-tab ${savedTab === 'cover' ? 'active' : ''}" data-tab="cover">Cover Letters</button>
      <button class="view-tab ${savedTab === 'companies' ? 'active' : ''}" data-tab="companies">Companies</button>
    </div>
    <div class="tab-content ${savedTab !== 'resume' ? 'hidden' : ''}" id="tab-resume"></div>
    <div class="tab-content ${savedTab !== 'cover' ? 'hidden' : ''}" id="tab-cover"></div>
    <div class="tab-content ${savedTab !== 'companies' ? 'hidden' : ''}" id="tab-companies"></div>
  `;

  const tabBar = container.querySelector('.view-tabs');
  const panes = {
    resume: container.querySelector('#tab-resume'),
    cover: container.querySelector('#tab-cover'),
    companies: container.querySelector('#tab-companies'),
  };

  /* ---- Build inner content shells ---- */
  buildResumePane(panes.resume);
  buildCoverPane(panes.cover);
  buildCompaniesPane(panes.companies);

  /* ---- Render the active tab ---- */
  renderTab(savedTab, panes, state, addJob);

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
    renderTab(tab, panes, state, addJob);
  });
}

/* ============================================================
   Build pane shells with expected DOM targets
   ============================================================ */

function buildResumePane(el) {
  el.innerHTML = `
    <div class="toolbar"><h2>Resume Center</h2></div>

    <div class="panel" style="margin-bottom:16px;">
      <h3 style="margin-top:0;">Upload &amp; Parse PDF</h3>
      <p class="muted" style="margin-bottom:12px;">Upload a PDF resume to extract text and detect skills automatically.</p>
      <input type="file" id="pdfFileInput" accept="application/pdf" class="input" style="max-width:320px;" />
      <div id="pdfProgress" style="margin-top:8px;"></div>
    </div>

    <div class="panel" style="margin-bottom:16px;">
      <h3 style="margin-top:0;">Add Resume Manually</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;">
        <div style="flex:1;min-width:200px;">
          <label class="muted" style="display:block;font-size:12px;margin-bottom:4px;">Resume Name</label>
          <input id="resumeNameInput" class="input" placeholder="e.g. Software Engineer v2" />
        </div>
        <button id="addResumeBtn" class="btn brand">Add Resume</button>
      </div>
    </div>

    <div class="table-wrap">
      <table id="resumeTable" class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Detected Skills</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>

    <div id="resumeTextPreview" style="display:none;margin-top:16px;"></div>
  `;
}

function buildCoverPane(el) {
  el.innerHTML = `
    <div class="toolbar">
      <h2>Cover Letters &amp; AI Tools</h2>
      <span id="aiMode" class="tag cyan" style="display:none;">AI Mode</span>
    </div>

    <div class="grid cols-2" style="margin-bottom:16px;">
      <div class="panel">
        <h3 style="margin-top:0;">Job Description</h3>
        <textarea id="jdText" class="input" rows="6" placeholder="Paste the full job description..."></textarea>
      </div>
      <div class="panel">
        <h3 style="margin-top:0;">Your Resume / Profile</h3>
        <textarea id="resumeText" class="input" rows="6" placeholder="Paste your resume text or key skills..."></textarea>
      </div>
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
      <button id="analyzeBtn" class="btn brand">Analyze Match</button>
      <button id="coverLetterBtn" class="btn blue">Generate Cover Letter</button>
      <button id="interviewQBtn" class="btn ghost">Interview Questions</button>
    </div>

    <div id="aiResults" style="margin-bottom:16px;"></div>
    <div id="coverLetterOutput" style="margin-bottom:16px;"></div>
    <div id="interviewQOutput"></div>
  `;
}

function buildCompaniesPane(el) {
  el.innerHTML = `
    <div class="toolbar">
      <h2>Companies</h2>
    </div>

    <div class="panel" style="margin-bottom:16px;">
      <h3 style="margin-top:0;">Add Company</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;">
        <div style="flex:1;min-width:160px;">
          <label class="muted" style="display:block;font-size:12px;margin-bottom:4px;">Company Name</label>
          <input id="companyNameInput" class="input" placeholder="e.g. Google" />
        </div>
        <div style="min-width:160px;">
          <label class="muted" style="display:block;font-size:12px;margin-bottom:4px;">Domain (optional)</label>
          <input id="companyDomainInput" class="input" placeholder="e.g. google.com" />
        </div>
        <div style="min-width:100px;">
          <label class="muted" style="display:block;font-size:12px;margin-bottom:4px;">Priority</label>
          <select id="companyPriority" class="input">
            <option value="High">High</option>
            <option value="Medium" selected>Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
        <button id="addCompanyBtn" class="btn brand">Add</button>
      </div>
    </div>

    <div class="table-wrap">
      <table id="companyTable" class="table">
        <thead>
          <tr>
            <th style="width:40px;"></th>
            <th>Company</th>
            <th>Domain</th>
            <th>Priority</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  `;
}

/* ============================================================
   Render individual tab content
   ============================================================ */

function renderTab(tab, panes, state, addJob) {
  switch (tab) {
    case 'resume':
      renderResumeCenter(panes.resume, state);
      break;
    case 'cover':
      renderAiTools(panes.cover, state, addJob);
      break;
    case 'companies':
      renderCompanies(panes.companies, state);
      break;
  }
}

export default { renderMyProfile };
