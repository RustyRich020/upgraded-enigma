/* ============================================================
   views/ats-optimizer.js — ATS Resume Optimization Dashboard
   With Smart JD Loader, Keyword Bank, and Market Intelligence
   ============================================================ */

import { escapeHtml } from '../utils.js';
import { toast } from '../components/toast.js';
import {
  extractATSKeywords, scoreATSAlignment,
  deepATSAnalysis, recommendRoles, generateSmartQueries
} from '../services/ats-optimizer.js';
import {
  recordAnalysis, syncResumeSkills,
  getTopKeywords, getTopGaps, getMarketIntelligence,
  getBankStats, loadAnalysisLog,
} from '../services/keyword-bank.js';
import { getSkillDemandHeatmap } from '../services/jd-intelligence.js';

const SEARCH_DB_KEY = 'jobsynk_search_results';

/**
 * Add a keyword to the most recent resume's skills array.
 */
function addKeywordToResume(keyword, state) {
  const resumes = state.get('resumes') || [];
  const resume = resumes.filter(r => r.id !== '_meta').pop();
  if (!resume) { toast('No resume found — upload one first', 'error'); return; }
  if (!resume.skills) resume.skills = [];
  const kw = keyword.toLowerCase().trim();
  if (!resume.skills.includes(kw)) {
    resume.skills.push(kw);
    state.set('resumes', resumes);
    toast(`Added "${keyword}" to ${resume.name}`, 'success');
  }
}

/**
 * Get JD sources: tracked jobs + search results that have descriptions.
 */
function getJDSources(state) {
  const sources = [];

  // Tracked jobs with descriptions
  const jobs = (state.get('jobs') || []).filter(j => j.id && j.id !== '_meta' && j.description);
  for (const j of jobs) {
    sources.push({
      type: 'tracked',
      label: `${j.title || 'Untitled'} — ${j.company || 'Unknown'}`,
      title: j.title,
      company: j.company,
      description: j.description,
      status: j.status,
    });
  }

  // Search results with descriptions
  try {
    const searchResults = JSON.parse(localStorage.getItem(SEARCH_DB_KEY) || '[]');
    for (const r of searchResults) {
      if (r.description && r.description.length > 50) {
        sources.push({
          type: 'search',
          label: `${r.title || 'Untitled'} — ${r.company || 'Unknown'}`,
          title: r.title,
          company: r.company,
          description: r.description,
          source: r.source,
        });
      }
    }
  } catch {}

  return sources;
}

/**
 * Render the ATS Optimizer view.
 */
export function renderATSOptimizer(container, state) {
  const resumes = (state.get('resumes') || []).filter(r => r.id !== '_meta' && r.text);
  const resumeObj = resumes.length > 0 ? resumes[resumes.length - 1] : null;
  const resumeText = resumeObj?.text || '';
  const resumeName = resumeObj?.name || '';
  const resumeSkills = resumeObj?.skills || [];
  const jdSources = getJDSources(state);
  const bankStats = getBankStats();

  // Sync resume skills with keyword bank
  if (resumeSkills.length > 0) syncResumeSkills(resumeSkills);

  container.innerHTML = `
    <div class="toolbar"><h2>ATS Optimizer</h2><span class="tag cyan">AI-Powered</span></div>

    ${!resumeText ? `
      <div class="panel" style="text-align:center;padding:40px;">
        <h3 style="margin-bottom:8px;">Upload a resume first</h3>
        <p class="muted" style="margin-bottom:16px;">Go to Resume Center and parse a PDF to extract your text, then return here.</p>
        <button class="btn brand" onclick="window.location.hash='#resume'">Go to Resume Center</button>
      </div>
    ` : `

    <!-- Resume Summary -->
    <div class="panel" style="margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div>
          <h4 style="margin:0;">Analyzing Resume</h4>
          <span style="font-size:15px;font-weight:600;color:var(--color-text-heading);">${escapeHtml(resumeName)}</span>
        </div>
        <div id="atsResumeKeywordCount" class="muted"></div>
      </div>
    </div>

    <div class="grid cols-2" style="margin-bottom:16px;">
      <!-- Role Recommendations -->
      <div class="panel">
        <h3>Recommended Job Titles</h3>
        <p class="muted" style="margin-bottom:12px;">Based on your resume keywords, these roles are the best fit:</p>
        <div id="atsRoleRecommendations"><span class="spinner"></span> Analyzing...</div>
      </div>

      <!-- Smart Search Queries -->
      <div class="panel">
        <h3>Optimized Search Queries</h3>
        <p class="muted" style="margin-bottom:12px;">ATS-optimized queries to find roles where you'd score highest:</p>
        <div id="atsSmartQueries"><span class="spinner"></span> Generating...</div>
      </div>
    </div>

    <!-- ============ JD Loader + Analyzer ============ -->
    <div class="panel" style="margin-bottom:16px;">
      <h3>Job Posting Analyzer</h3>
      <p class="muted" style="margin-bottom:12px;">Select a saved job or paste a description to analyze ATS alignment.</p>

      <!-- Smart JD Loader -->
      <div class="ats-jd-loader" style="margin-bottom:12px;">
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:end;">
          <div style="flex:1;min-width:220px;">
            <label class="muted" style="display:block;font-size:12px;margin-bottom:4px;">Load from saved jobs</label>
            <select id="atsJdSelect" class="input" style="font-size:14px;">
              <option value="">— Select a job posting —</option>
              ${jdSources.length > 0 ? `
                ${jdSources.filter(s => s.type === 'tracked').length > 0 ? `
                  <optgroup label="Tracked Jobs (${jdSources.filter(s => s.type === 'tracked').length})">
                    ${jdSources.filter(s => s.type === 'tracked').map((s, i) => `<option value="tracked-${i}">${escapeHtml(s.label)}${s.status ? ' [' + s.status + ']' : ''}</option>`).join('')}
                  </optgroup>
                ` : ''}
                ${jdSources.filter(s => s.type === 'search').length > 0 ? `
                  <optgroup label="Search Results (${jdSources.filter(s => s.type === 'search').length})">
                    ${jdSources.filter(s => s.type === 'search').map((s, i) => `<option value="search-${i}">${escapeHtml(s.label)}${s.source ? ' (' + s.source + ')' : ''}</option>`).join('')}
                  </optgroup>
                ` : ''}
              ` : '<option disabled>No saved jobs with descriptions</option>'}
            </select>
          </div>
          <span class="muted" style="padding-bottom:10px;">or paste below</span>
        </div>
      </div>

      <textarea id="atsJobText" class="input" rows="5" placeholder="Paste a full job description here, or select one from the dropdown above..." style="font-size:14px;margin-bottom:12px;"></textarea>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <button class="btn brand" id="atsAnalyzeBtn" style="font-size:14px;padding:10px 20px;">Analyze ATS Match</button>
        <button class="btn blue" id="atsDeepAnalyzeBtn" style="font-size:14px;padding:10px 20px;">Deep AI Analysis</button>
        <span id="atsSelectedJobLabel" class="muted" style="font-size:13px;"></span>
      </div>
    </div>

    <!-- Analysis Results (hidden until analysis runs) -->
    <div id="atsResults" style="display:none;">
      <!-- Score -->
      <div class="panel" style="margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
          <div style="text-align:center;">
            <div id="atsScoreValue" style="font-size:48px;font-weight:700;font-family:var(--font-display);color:var(--color-primary);"></div>
            <div class="muted">ATS Score</div>
          </div>
          <div style="flex:1;min-width:200px;">
            <div id="atsScoreBar" style="height:12px;background:var(--color-surface-border);border-radius:var(--radius-full);overflow:hidden;margin-bottom:8px;">
              <div id="atsScoreFill" style="height:100%;border-radius:var(--radius-full);transition:width 0.5s;"></div>
            </div>
            <div id="atsScoreSummary" class="muted" style="font-size:13px;"></div>
          </div>
        </div>
      </div>

      <!-- Breakdown -->
      <div class="grid cols-2" style="margin-bottom:16px;">
        <div class="panel">
          <h3 style="color:var(--color-success);">Matched Keywords</h3>
          <div id="atsMatched" style="max-height:250px;overflow-y:auto;"></div>
        </div>
        <div class="panel">
          <h3 style="color:var(--color-danger);">Missing Keywords (Add These!)</h3>
          <div id="atsMissing" style="max-height:250px;overflow-y:auto;"></div>
        </div>
      </div>

      <!-- Category Breakdown -->
      <div class="panel" style="margin-bottom:16px;">
        <h3>Category Breakdown</h3>
        <div id="atsBreakdown"></div>
      </div>

      <!-- AI Deep Analysis -->
      <div id="atsDeepResults" class="panel" style="display:none;margin-bottom:16px;">
        <h3>AI Analysis & Suggestions</h3>
        <div id="atsDeepContent"></div>
      </div>
    </div>

    <!-- ============ Keyword Bank ============ -->
    <div class="panel ats-keyword-bank" style="margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
        <div>
          <h3 style="margin:0;">Keyword Intelligence Bank</h3>
          <p class="muted" style="margin:4px 0 0;font-size:13px;">
            ${bankStats.totalAnalyses > 0
              ? `${bankStats.totalKeywords} keywords tracked across ${bankStats.totalAnalyses} analyses`
              : 'Analyze job postings to build your keyword intelligence'}
          </p>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn small ghost" id="atsBankTabDemand" data-bank-tab="demand">Market Demand</button>
          <button class="btn small ghost" id="atsBankTabGaps" data-bank-tab="gaps">My Gaps</button>
          <button class="btn small ghost" id="atsBankTabHistory" data-bank-tab="history">History</button>
        </div>
      </div>
      <div id="atsBankContent"></div>
    </div>

    <!-- ============ Market Intelligence ============ -->
    <div class="panel" style="margin-bottom:16px;">
      <h3>Market Intelligence</h3>
      <p class="muted" style="margin-bottom:12px;">Skill demand across your search results — shows which keywords appear most in your target market.</p>
      <div id="atsMarketHeatmap"></div>
    </div>

    `}
  `;

  if (!resumeText) return;

  // Store JD sources for dropdown handler
  container._jdSources = jdSources;
  container._selectedJob = null;

  // ---- JD Dropdown loader ----
  const jdSelect = container.querySelector('#atsJdSelect');
  const jobLabel = container.querySelector('#atsSelectedJobLabel');
  jdSelect?.addEventListener('change', () => {
    const val = jdSelect.value;
    if (!val) { container._selectedJob = null; return; }
    const [type, idx] = val.split('-');
    const filtered = jdSources.filter(s => s.type === type);
    const source = filtered[parseInt(idx, 10)];
    if (source) {
      const textarea = container.querySelector('#atsJobText');
      if (textarea) textarea.value = source.description;
      container._selectedJob = source;
      if (jobLabel) jobLabel.textContent = `Loaded: ${source.title || 'Job posting'}`;
    }
  });

  // ---- Role recommendations ----
  recommendRoles(resumeText).then(result => {
    const el = container.querySelector('#atsRoleRecommendations');
    const countEl = container.querySelector('#atsResumeKeywordCount');
    if (countEl) countEl.textContent = `${result.totalKeywords} keywords detected`;

    if (el && result.recommendedRoles.length > 0) {
      el.innerHTML = result.recommendedRoles.map(r => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--color-surface-border);">
          <span style="font-size:15px;font-weight:600;">${escapeHtml(r.title)}</span>
          <span class="chip" style="background:${r.score >= 80 ? 'var(--color-success-dim)' : r.score >= 50 ? 'var(--color-warning-dim)' : 'var(--color-surface)'};color:${r.score >= 80 ? 'var(--color-success)' : r.score >= 50 ? 'var(--color-warning)' : 'var(--color-text-dim)'};">${r.score}% match</span>
        </div>
      `).join('');
    } else if (el) {
      el.innerHTML = '<span class="muted">Upload a resume with more detail for recommendations.</span>';
    }
  });

  // ---- Smart queries ----
  const queries = generateSmartQueries(resumeText);
  const queryEl = container.querySelector('#atsSmartQueries');
  if (queryEl) {
    queryEl.innerHTML = queries.length > 0
      ? queries.map(q => `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--color-surface-border);">
          <span style="font-size:14px;flex:1;">"${escapeHtml(q)}"</span>
          <button class="btn small ats-use-query" data-query="${escapeHtml(q)}">Use</button>
        </div>
      `).join('')
      : '<span class="muted">Not enough keywords to generate queries.</span>';

    queryEl.querySelectorAll('.ats-use-query').forEach(btn => {
      btn.addEventListener('click', () => {
        const searchTab = document.querySelector('.view-tab[data-tab="search"]');
        if (searchTab) {
          searchTab.click();
          setTimeout(() => {
            const kw = document.getElementById('searchKeyword');
            if (kw) { kw.value = btn.dataset.query; kw.focus(); }
          }, 100);
        } else {
          sessionStorage.setItem('prefillSearch', btn.dataset.query);
          window.location.hash = '#find-jobs';
        }
      });
    });
  }

  // ---- Analyze button ----
  container.querySelector('#atsAnalyzeBtn')?.addEventListener('click', () => {
    const jobText = container.querySelector('#atsJobText')?.value?.trim();
    if (!jobText) { toast('Paste a job description first', 'error'); return; }

    const result = scoreATSAlignment(resumeText, jobText);
    const meta = container._selectedJob || {};
    recordAnalysis(result, { title: meta.title, company: meta.company, source: meta.source || 'paste', jobText }, resumeSkills);
    showResults(container, result, state);
    renderBankTab(container, 'demand', state);
  });

  // ---- Deep AI analysis ----
  container.querySelector('#atsDeepAnalyzeBtn')?.addEventListener('click', async () => {
    const jobText = container.querySelector('#atsJobText')?.value?.trim();
    if (!jobText) { toast('Paste a job description first', 'error'); return; }

    const btn = container.querySelector('#atsDeepAnalyzeBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Analyzing...';

    const localResult = scoreATSAlignment(resumeText, jobText);
    const meta = container._selectedJob || {};
    recordAnalysis(localResult, { title: meta.title, company: meta.company, source: meta.source || 'paste', jobText }, resumeSkills);
    showResults(container, localResult, state);

    const aiResult = await deepATSAnalysis(resumeText, jobText);
    btn.disabled = false;
    btn.textContent = 'Deep AI Analysis';

    const deepEl = container.querySelector('#atsDeepResults');
    const deepContent = container.querySelector('#atsDeepContent');
    if (deepEl && deepContent) {
      if (aiResult.error) {
        deepContent.innerHTML = `<div style="color:var(--color-danger);font-size:14px;">${escapeHtml(aiResult.error)}</div>`;
      } else {
        deepEl.style.display = 'block';
        deepContent.innerHTML = `
          ${aiResult.bestFitRoles ? `
            <h4 style="margin-top:12px;">Best Fit Roles</h4>
            ${aiResult.bestFitRoles.map(r => `
              <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--color-surface-border);">
                <span style="font-size:14px;font-weight:600;">${escapeHtml(r.title)}</span>
                <span class="chip">${r.matchPercent}%</span>
              </div>
            `).join('')}
          ` : ''}
          ${aiResult.suggestedPhrases ? `
            <h4 style="margin-top:16px;">Phrases to Add to Your Resume</h4>
            ${aiResult.suggestedPhrases.map(s => `
              <div style="padding:8px;margin:6px 0;background:var(--color-success-dim);border:1px solid rgba(74,222,128,0.2);border-radius:var(--radius-md);">
                <div style="font-size:14px;font-weight:600;color:var(--color-success);">"${escapeHtml(s.phrase)}"</div>
                <div class="muted" style="font-size:12px;">Add to: ${escapeHtml(s.where)} — ${escapeHtml(s.why)}</div>
              </div>
            `).join('')}
          ` : ''}
          ${aiResult.resumeTips ? `
            <h4 style="margin-top:16px;">Resume Tips</h4>
            <ul style="padding-left:16px;font-size:14px;color:var(--color-text-dim);">
              ${aiResult.resumeTips.map(t => `<li style="margin:4px 0;">${escapeHtml(t)}</li>`).join('')}
            </ul>
          ` : ''}
          ${aiResult.searchQueries ? `
            <h4 style="margin-top:16px;">AI-Optimized Search Queries</h4>
            ${aiResult.searchQueries.map(q => `
              <div style="display:flex;align-items:center;gap:8px;padding:4px 0;">
                <span style="font-size:14px;">"${escapeHtml(q)}"</span>
                <button class="btn small ats-ai-query" data-query="${escapeHtml(q)}">Search</button>
              </div>
            `).join('')}
          ` : ''}
        `;
        deepContent.querySelectorAll('.ats-ai-query').forEach(btn => {
          btn.addEventListener('click', () => {
            const searchTab = document.querySelector('.view-tab[data-tab="search"]');
            if (searchTab) {
              searchTab.click();
              setTimeout(() => {
                const kw = document.getElementById('searchKeyword');
                if (kw) { kw.value = btn.dataset.query; kw.focus(); }
              }, 100);
            }
          });
        });
      }
      toast('AI analysis complete', 'success');
    }
    renderBankTab(container, 'demand', state);
  });

  // ---- Keyword Bank tabs ----
  const bankTabButtons = container.querySelectorAll('[data-bank-tab]');
  bankTabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      bankTabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderBankTab(container, btn.dataset.bankTab, state);
    });
  });
  // Default: show demand tab
  const defaultTab = container.querySelector('#atsBankTabDemand');
  if (defaultTab) defaultTab.classList.add('active');
  renderBankTab(container, 'demand', state);

  // ---- Market Intelligence heatmap ----
  renderMarketHeatmap(container);
}

/**
 * Render keyword bank tab content.
 */
function renderBankTab(container, tab, state) {
  const el = container.querySelector('#atsBankContent');
  if (!el) return;

  switch (tab) {
    case 'demand': {
      const top = getTopKeywords(30);
      if (top.length === 0) {
        el.innerHTML = '<p class="muted" style="text-align:center;padding:20px;">Analyze a job posting to start building your keyword bank. Each analysis adds intelligence.</p>';
        return;
      }
      const maxCount = top[0].count;
      el.innerHTML = `
        <div class="ats-bank-legend" style="display:flex;gap:12px;margin-bottom:12px;font-size:12px;">
          <span><span style="display:inline-block;width:10px;height:10px;background:var(--color-success);border-radius:2px;"></span> In your resume</span>
          <span><span style="display:inline-block;width:10px;height:10px;background:var(--color-danger);border-radius:2px;"></span> Missing from resume</span>
          <span class="muted">Bar = frequency across analyzed postings</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          ${top.map(item => {
            const barWidth = Math.max(4, Math.round((item.count / maxCount) * 100));
            const color = item.inResume ? 'var(--color-success)' : 'var(--color-danger)';
            return `
              <div class="ats-bank-row" style="display:flex;align-items:center;gap:8px;">
                <div style="width:130px;text-align:right;font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(item.keyword)}">${escapeHtml(item.keyword)}</div>
                <div style="flex:1;height:20px;background:var(--color-surface-border);border-radius:var(--radius-sm);overflow:hidden;">
                  <div style="height:100%;width:${barWidth}%;background:${color};border-radius:var(--radius-sm);transition:width 0.3s;opacity:0.8;"></div>
                </div>
                <div style="width:40px;text-align:center;font-size:12px;font-weight:600;">${item.count}×</div>
                <div style="width:60px;font-size:11px;color:var(--color-text-dim);">${item.sources} job${item.sources === 1 ? '' : 's'}</div>
                ${!item.inResume ? `<button class="btn small ats-bank-add" data-keyword="${escapeHtml(item.keyword)}" style="font-size:11px;padding:2px 8px;">+ Add</button>` : '<span style="width:50px;text-align:center;font-size:11px;color:var(--color-success);">✓</span>'}
              </div>
            `;
          }).join('')}
        </div>
      `;
      // Bind add buttons
      el.querySelectorAll('.ats-bank-add').forEach(btn => {
        btn.addEventListener('click', () => {
          addKeywordToResume(btn.dataset.keyword, state);
          btn.outerHTML = '<span style="width:50px;text-align:center;font-size:11px;color:var(--color-success);">✓</span>';
        });
      });
      break;
    }

    case 'gaps': {
      const gaps = getTopGaps(20);
      if (gaps.length === 0) {
        el.innerHTML = '<p class="muted" style="text-align:center;padding:20px;">No gaps detected yet. Analyze more job postings to identify patterns in what you\'re missing.</p>';
        return;
      }
      el.innerHTML = `
        <p class="muted" style="margin-bottom:12px;font-size:13px;">Keywords you're missing most often across analyzed postings — these are your highest-priority additions.</p>
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${gaps.map((g, i) => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:${i < 5 ? 'var(--color-danger-dim)' : 'var(--color-surface)'};border:1px solid ${i < 5 ? 'rgba(248,113,113,0.15)' : 'var(--color-surface-border)'};border-radius:var(--radius-md);">
              <span style="font-size:12px;font-weight:700;color:var(--color-danger);width:24px;">#${i + 1}</span>
              <span style="flex:1;font-size:14px;font-weight:600;">${escapeHtml(g.keyword)}</span>
              <span class="muted" style="font-size:12px;">${g.category}</span>
              <span style="font-size:12px;font-weight:600;color:var(--color-danger);">Missing in ${g.missed}/${g.count} postings</span>
              <button class="btn small ats-gap-add" data-keyword="${escapeHtml(g.keyword)}" style="font-size:11px;padding:2px 8px;">+ Add</button>
            </div>
          `).join('')}
        </div>
        <div style="margin-top:12px;">
          <button class="btn small brand" id="atsAddTopGaps" style="font-size:12px;">+ Add Top 5 Gaps to Resume</button>
        </div>
      `;
      el.querySelectorAll('.ats-gap-add').forEach(btn => {
        btn.addEventListener('click', () => {
          addKeywordToResume(btn.dataset.keyword, state);
          btn.textContent = '✓ Added';
          btn.disabled = true;
          btn.style.color = 'var(--color-success)';
        });
      });
      el.querySelector('#atsAddTopGaps')?.addEventListener('click', () => {
        gaps.slice(0, 5).forEach(g => addKeywordToResume(g.keyword, state));
        toast(`Added top 5 gap keywords to your resume`, 'success');
        renderBankTab(container, 'gaps', state);
      });
      break;
    }

    case 'history': {
      const log = loadAnalysisLog();
      if (log.length === 0) {
        el.innerHTML = '<p class="muted" style="text-align:center;padding:20px;">No analyses yet. Use the Job Posting Analyzer above to start tracking.</p>';
        return;
      }
      const intel = getMarketIntelligence();
      el.innerHTML = `
        <div class="grid cols-4" style="margin-bottom:16px;gap:12px;">
          <div style="text-align:center;padding:12px;background:var(--color-surface);border:1px solid var(--color-surface-border);border-radius:var(--radius-md);">
            <div style="font-size:24px;font-weight:700;color:var(--color-primary);">${intel.totalAnalyses}</div>
            <div class="muted" style="font-size:11px;">Analyses</div>
          </div>
          <div style="text-align:center;padding:12px;background:var(--color-surface);border:1px solid var(--color-surface-border);border-radius:var(--radius-md);">
            <div style="font-size:24px;font-weight:700;color:var(--color-primary);">${intel.totalKeywords}</div>
            <div class="muted" style="font-size:11px;">Keywords Tracked</div>
          </div>
          <div style="text-align:center;padding:12px;background:var(--color-surface);border:1px solid var(--color-surface-border);border-radius:var(--radius-md);">
            <div style="font-size:24px;font-weight:700;color:${intel.avgScore >= 60 ? 'var(--color-success)' : intel.avgScore >= 40 ? 'var(--color-warning)' : 'var(--color-danger)'};">${intel.avgScore}%</div>
            <div class="muted" style="font-size:11px;">Avg ATS Score</div>
          </div>
          <div style="text-align:center;padding:12px;background:var(--color-surface);border:1px solid var(--color-surface-border);border-radius:var(--radius-md);">
            <div style="font-size:24px;font-weight:700;color:${intel.coverageRate >= 60 ? 'var(--color-success)' : 'var(--color-warning)'};">${intel.coverageRate}%</div>
            <div class="muted" style="font-size:11px;">Resume Coverage</div>
          </div>
        </div>
        ${intel.criticalGaps.length > 0 ? `
          <div style="margin-bottom:12px;">
            <h4 style="margin:0 0 8px;font-size:14px;">Critical Gaps (Recurring Missing Keywords)</h4>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              ${intel.criticalGaps.map(g => `
                <span class="chip" style="background:var(--color-danger-dim);color:var(--color-danger);font-size:12px;">
                  ${escapeHtml(g.keyword)} <strong style="margin-left:4px;">${g.frequency}×</strong>
                </span>
              `).join('')}
            </div>
          </div>
        ` : ''}
        <h4 style="margin:0 0 8px;font-size:14px;">Recent Analyses</h4>
        <div style="max-height:300px;overflow-y:auto;">
          ${log.slice().reverse().slice(0, 20).map(entry => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--color-surface-border);">
              <span style="font-size:20px;font-weight:700;width:50px;text-align:center;color:${entry.score >= 60 ? 'var(--color-success)' : entry.score >= 40 ? 'var(--color-warning)' : 'var(--color-danger)'};">${entry.score}%</span>
              <div style="flex:1;">
                <div style="font-size:14px;font-weight:600;">${escapeHtml(entry.title)}${entry.company ? ` @ ${escapeHtml(entry.company)}` : ''}</div>
                <div class="muted" style="font-size:12px;">${new Date(entry.date).toLocaleDateString()} · ${entry.keywordCount} keywords · ${entry.source}</div>
              </div>
              ${entry.topMissing.length > 0 ? `
                <div style="display:flex;gap:3px;flex-wrap:wrap;max-width:200px;">
                  ${entry.topMissing.slice(0, 3).map(k => `<span class="chip" style="font-size:10px;background:var(--color-danger-dim);color:var(--color-danger);">${escapeHtml(k)}</span>`).join('')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `;
      break;
    }
  }
}

/**
 * Render the market heatmap from search results.
 */
function renderMarketHeatmap(container) {
  const el = container.querySelector('#atsMarketHeatmap');
  if (!el) return;

  let searchResults = [];
  try {
    searchResults = JSON.parse(localStorage.getItem(SEARCH_DB_KEY) || '[]');
  } catch {}

  if (searchResults.length === 0) {
    el.innerHTML = '<p class="muted">Run a job search first to see market skill demand data.</p>';
    return;
  }

  const heatmap = getSkillDemandHeatmap(searchResults);
  if (heatmap.length === 0) {
    el.innerHTML = '<p class="muted">No skill data extracted from search results.</p>';
    return;
  }

  const top = heatmap.slice(0, 20);
  const maxCount = top[0].count;

  el.innerHTML = `
    <p class="muted" style="margin-bottom:8px;font-size:12px;">Skills most mentioned across ${searchResults.length} search results</p>
    <div style="display:flex;flex-direction:column;gap:4px;">
      ${top.map(item => {
        const barWidth = Math.max(4, Math.round((item.count / maxCount) * 100));
        const hue = Math.round((item.percentage / 100) * 120);
        return `
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:110px;text-align:right;font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(item.skill)}</div>
            <div style="flex:1;height:18px;background:var(--color-surface-border);border-radius:var(--radius-sm);overflow:hidden;">
              <div style="height:100%;width:${barWidth}%;background:hsl(${hue}, 70%, 50%);border-radius:var(--radius-sm);"></div>
            </div>
            <div style="width:65px;font-size:11px;color:var(--color-text-dim);">${item.count} (${item.percentage}%)</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function showResults(container, result, state) {
  const resultsEl = container.querySelector('#atsResults');
  if (resultsEl) resultsEl.style.display = 'block';

  // Score
  const scoreVal = container.querySelector('#atsScoreValue');
  const scoreFill = container.querySelector('#atsScoreFill');
  const scoreSummary = container.querySelector('#atsScoreSummary');
  if (scoreVal) scoreVal.textContent = result.score + '%';
  if (scoreFill) {
    const color = result.score >= 80 ? 'var(--color-success)' : result.score >= 60 ? 'var(--color-warning)' : 'var(--color-danger)';
    scoreFill.style.width = result.score + '%';
    scoreFill.style.background = color;
  }
  if (scoreSummary) {
    scoreSummary.textContent = result.score >= 80
      ? 'Excellent match! Your resume is well-aligned with this posting.'
      : result.score >= 60
        ? 'Good match. Add the missing keywords below to improve your score.'
        : 'Low match. Significant keyword gaps — review the missing keywords carefully.';
  }

  // Matched
  const matchedEl = container.querySelector('#atsMatched');
  if (matchedEl) {
    matchedEl.innerHTML = result.matched.length > 0
      ? result.matched.map(k => `
        <span class="chip" style="margin:3px;background:var(--color-success-dim);color:var(--color-success);font-size:13px;">${escapeHtml(k.keyword)}</span>
      `).join('')
      : '<span class="muted">No matching keywords found.</span>';
  }

  // Missing
  const missingEl = container.querySelector('#atsMissing');
  if (missingEl) {
    if (result.missing.length > 0) {
      missingEl.innerHTML = `
        <div style="margin-bottom:8px;">
          <button class="btn small" id="atsAddAllMissing" style="font-size:11px;">+ Add All to Resume</button>
        </div>
        ${result.missing.map(k => `
          <span class="chip ats-missing-chip" data-keyword="${escapeHtml(k.keyword)}" style="margin:3px;background:var(--color-danger-dim);color:var(--color-danger);font-size:13px;border-color:rgba(248,113,113,0.2);cursor:pointer;" title="Click to add to resume">
            + ${escapeHtml(k.keyword)}
          </span>
        `).join('')}
      `;

      missingEl.querySelectorAll('.ats-missing-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          addKeywordToResume(chip.dataset.keyword, state);
          chip.style.background = 'var(--color-success-dim)';
          chip.style.color = 'var(--color-success)';
          chip.style.borderColor = 'rgba(74,222,128,0.2)';
          chip.textContent = '✓ ' + chip.dataset.keyword;
          chip.style.cursor = 'default';
        });
      });

      missingEl.querySelector('#atsAddAllMissing')?.addEventListener('click', () => {
        result.missing.forEach(k => addKeywordToResume(k.keyword, state));
        missingEl.querySelectorAll('.ats-missing-chip').forEach(chip => {
          chip.style.background = 'var(--color-success-dim)';
          chip.style.color = 'var(--color-success)';
          chip.textContent = '✓ ' + chip.dataset.keyword;
        });
        toast(`Added ${result.missing.length} keywords to your resume`, 'success');
      });
    } else {
      missingEl.innerHTML = '<span class="muted">No gaps — all job keywords are in your resume!</span>';
    }
  }

  // Breakdown
  const breakdownEl = container.querySelector('#atsBreakdown');
  if (breakdownEl) {
    breakdownEl.innerHTML = Object.entries(result.breakdown).map(([_, cat]) => `
      <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--color-surface-border);">
        <span style="width:160px;font-size:13px;font-weight:600;">${escapeHtml(cat.label)}</span>
        <div style="flex:1;height:8px;background:var(--color-surface-border);border-radius:var(--radius-full);overflow:hidden;">
          <div style="width:${cat.percentage}%;height:100%;background:${cat.percentage >= 80 ? 'var(--color-success)' : cat.percentage >= 50 ? 'var(--color-warning)' : 'var(--color-danger)'};border-radius:var(--radius-full);transition:width 0.3s;"></div>
        </div>
        <span style="width:70px;text-align:right;font-size:13px;color:var(--color-text-dim);">${cat.matched}/${cat.total}</span>
      </div>
    `).join('');
  }
}

export default { renderATSOptimizer };
