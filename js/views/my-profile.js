/* ============================================================
   views/my-profile.js — Consolidated My Profile view
   Merges Resume Center + AI Tools (Cover Letters) + Companies
   into one tabbed page.
   ============================================================ */

import { renderResumeCenter } from './resume-center.js';
import { renderAiTools } from './ai-tools.js';
import { renderCompanies } from './companies.js';
import { enableTabKeyboardNavigation, setActiveTab } from '../ui/a11y.js';

const SESSION_KEY = 'jobsink_myProfile_activeTab';

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
  const resumeCount = (state.get('resumes') || []).filter(item => item.id && item.id !== '_meta').length;
  const companyCount = (state.get('companies') || []).filter(item => item.id && item.id !== '_meta').length;
  const storyCount = (state.get('stories') || []).filter(item => item.id && item.id !== '_meta').length;

  container.innerHTML = `
    <div class="section-shell">
      <div class="section-intro">
        <div class="section-title-row">
          <p class="eyebrow">Career Materials</p>
          <h2>My Profile</h2>
          <p class="section-copy">${resumeCount ? `${resumeCount} resumes and ${companyCount} company records ready for tailoring.` : 'Keep your resumes, cover-letter drafts, and target companies organized together.'}</p>
        </div>
      </div>
      <div class="section-hero">
        <div class="glance-grid">
          <div class="glance-card">
            <div class="glance-label">Resumes</div>
            <div class="glance-value">${resumeCount}</div>
            <div class="glance-copy">${resumeCount ? 'You have material ready for ATS scoring and role matching.' : 'Uploading one resume makes the rest of the app much smarter.'}</div>
          </div>
          <div class="glance-card">
            <div class="glance-label">Target Companies</div>
            <div class="glance-value">${companyCount}</div>
            <div class="glance-copy">${companyCount ? 'Your company list is ready for tracking and research.' : 'Start a shortlist so networking and applications stay focused.'}</div>
          </div>
          <div class="glance-card">
            <div class="glance-label">Story Assets</div>
            <div class="glance-value">${storyCount}</div>
            <div class="glance-copy">${storyCount ? 'Interview-ready proof points already exist elsewhere in your workflow.' : 'Add story-bank entries in Interviews to strengthen your prep.'}</div>
          </div>
        </div>
        <div class="quick-switcher" aria-label="My Profile shortcuts">
          <span class="muted">Jump to:</span>
          <button class="btn small ghost" type="button" data-jump-tab="resume">Resume center</button>
          <button class="btn small ghost" type="button" data-jump-tab="cover">Cover letters</button>
          <button class="btn small ghost" type="button" data-jump-tab="companies">Company list</button>
          <span class="chip">${resumeCount ? 'Profile ready for tailoring' : 'Needs resume upload'}</span>
        </div>
      </div>
      <div class="view-tabs" role="tablist" aria-label="My Profile views">
        <button class="view-tab ${savedTab === 'resume' ? 'active' : ''}" data-tab="resume" role="tab" aria-selected="${savedTab === 'resume'}">Resume</button>
        <button class="view-tab ${savedTab === 'cover' ? 'active' : ''}" data-tab="cover" role="tab" aria-selected="${savedTab === 'cover'}">Cover Letters</button>
        <button class="view-tab ${savedTab === 'companies' ? 'active' : ''}" data-tab="companies" role="tab" aria-selected="${savedTab === 'companies'}">Companies</button>
      </div>
      <div class="tab-content ${savedTab !== 'resume' ? 'hidden' : ''}" id="tab-resume"></div>
      <div class="tab-content ${savedTab !== 'cover' ? 'hidden' : ''}" id="tab-cover"></div>
      <div class="tab-content ${savedTab !== 'companies' ? 'hidden' : ''}" id="tab-companies"></div>
    </div>
  `;

  const tabBar = container.querySelector('.view-tabs');
  const panes = {
    resume: container.querySelector('#tab-resume'),
    cover: container.querySelector('#tab-cover'),
    companies: container.querySelector('#tab-companies'),
  };

  buildResumePane(panes.resume);
  buildCoverPane(panes.cover);
  buildCompaniesPane(panes.companies);

  const rendered = new Set();
  function renderTabOnce(tab) {
    renderTab(tab, panes, state, addJob);
    rendered.add(tab);
  }

  function activateTab(tab) {
    setActiveTab(tabBar, tab);
    Object.entries(panes).forEach(([key, el]) => {
      el.classList.toggle('hidden', key !== tab);
    });
    sessionStorage.setItem(SESSION_KEY, tab);
    if (!rendered.has(tab)) renderTabOnce(tab);
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
      <div class="inline-form">
        <div class="field-group">
          <label class="muted" style="display:block;font-size:12px;">Resume Name</label>
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
      <span id="aiMode" class="tag blue" style="display:none;">Gemini Active</span>
    </div>

    <div class="grid cols-2">
      <div class="panel">
        <h3>JD ↔ Resume Matcher</h3>
        <textarea id="jdText" class="input" rows="6" placeholder="Paste job description..."></textarea>
        <textarea id="resumeText" class="input" rows="6" placeholder="Paste resume..." style="margin-top:8px"></textarea>
        <div style="margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <button class="btn brand" id="analyzeBtn">Analyze (Local)</button>
          <button class="btn blue" id="analyzeAiBtn">Analyze (AI)</button>
          <span class="chip">Match: <span id="matchScore">—</span>%</span>
        </div>
        <div id="aiMatchResult" class="panel" style="margin-top:12px;display:none">
          <h4>AI Analysis</h4>
          <div id="aiMatchContent" class="muted" style="white-space:pre-wrap;font-size:12px;max-height:200px;overflow-y:auto"></div>
        </div>
        <div class="grid cols-2" style="margin-top:12px">
          <div><h4>Missing Keywords</h4><div id="missingList" class="muted" style="max-height:150px;overflow-y:auto"></div></div>
          <div><h4>Found Keywords</h4><div id="foundList" class="muted" style="max-height:150px;overflow-y:auto"></div></div>
        </div>
      </div>
      <div class="panel">
        <h3>Generators</h3>
        <div style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn" id="createJobFromJd">Job from JD</button>
          <button class="btn" id="draftCoverLetter">Cover Letter</button>
          <button class="btn blue" id="draftCoverLetterAi">AI Cover Letter</button>
          <button class="btn" id="genInterviewQuestions">Interview Questions</button>
          <a id="dlCover" class="btn ghost" download="cover-letter.txt">Download</a>
        </div>
        <textarea id="coverOut" class="input" rows="14" placeholder="Output appears here..."></textarea>
      </div>
    </div>
  `;
}

function buildCompaniesPane(el) {
  el.innerHTML = `
    <div class="toolbar">
      <h2>Companies</h2>
      <div style="margin-left:auto;display:flex;gap:8px;align-items:center">
        <input id="companyName" class="input" placeholder="Company name" style="width:200px">
        <button class="btn" id="addCompany">Add</button>
      </div>
    </div>
    <div class="table-wrapper">
      <table class="table" id="companyTable">
        <thead><tr><th>Logo</th><th>Name</th><th>Domain</th><th>Notes</th><th>Actions</th></tr></thead>
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
