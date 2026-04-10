/* ============================================================
   views/ats-optimizer.js — ATS Resume Optimization Dashboard
   ============================================================ */

import { escapeHtml } from '../utils.js';
import { toast } from '../components/toast.js';
import {
  extractATSKeywords, scoreATSAlignment,
  deepATSAnalysis, recommendRoles, generateSmartQueries
} from '../services/ats-optimizer.js';

/**
 * Render the ATS Optimizer view.
 */
export function renderATSOptimizer(container, state) {
  const resumes = (state.get('resumes') || []).filter(r => r.id !== '_meta' && r.text);
  const resumeText = resumes.length > 0 ? resumes[resumes.length - 1].text : '';
  const resumeName = resumes.length > 0 ? resumes[resumes.length - 1].name : '';

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

    <!-- JD Analyzer -->
    <div class="panel" style="margin-bottom:16px;">
      <h3>Job Posting Analyzer</h3>
      <p class="muted" style="margin-bottom:12px;">Paste a job description to see your ATS match score and keyword gaps.</p>
      <textarea id="atsJobText" class="input" rows="5" placeholder="Paste a full job description here..." style="font-size:14px;margin-bottom:12px;"></textarea>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn brand" id="atsAnalyzeBtn" style="font-size:14px;padding:10px 20px;">Analyze ATS Match</button>
        <button class="btn blue" id="atsDeepAnalyzeBtn" style="font-size:14px;padding:10px 20px;">Deep AI Analysis</button>
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
    `}
  `;

  if (!resumeText) return;

  // Run role recommendations immediately
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

  // Generate smart queries
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

    // Bind "Use" buttons to navigate to search with that query
    queryEl.querySelectorAll('.ats-use-query').forEach(btn => {
      btn.addEventListener('click', () => {
        const kw = document.getElementById('searchKeyword');
        if (kw) kw.value = btn.dataset.query;
        window.location.hash = '#search';
      });
    });
  }

  // Analyze button
  container.querySelector('#atsAnalyzeBtn')?.addEventListener('click', () => {
    const jobText = container.querySelector('#atsJobText')?.value?.trim();
    if (!jobText) { toast('Paste a job description first', 'error'); return; }

    const result = scoreATSAlignment(resumeText, jobText);
    showResults(container, result);
  });

  // Deep AI analysis button
  container.querySelector('#atsDeepAnalyzeBtn')?.addEventListener('click', async () => {
    const jobText = container.querySelector('#atsJobText')?.value?.trim();
    if (!jobText) { toast('Paste a job description first', 'error'); return; }

    const btn = container.querySelector('#atsDeepAnalyzeBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Analyzing...';

    // Run local analysis first
    const localResult = scoreATSAlignment(resumeText, jobText);
    showResults(container, localResult);

    // Then run AI analysis
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

        // Bind AI query buttons
        deepContent.querySelectorAll('.ats-ai-query').forEach(btn => {
          btn.addEventListener('click', () => {
            const kw = document.getElementById('searchKeyword');
            if (kw) kw.value = btn.dataset.query;
            window.location.hash = '#search';
          });
        });
      }
      toast('AI analysis complete', 'success');
    }
  });
}

function showResults(container, result) {
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
    missingEl.innerHTML = result.missing.length > 0
      ? result.missing.map(k => `
        <span class="chip" style="margin:3px;background:var(--color-danger-dim);color:var(--color-danger);font-size:13px;border-color:rgba(248,113,113,0.2);">${escapeHtml(k.keyword)}</span>
      `).join('')
      : '<span class="muted">No gaps — all job keywords are in your resume!</span>';
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
