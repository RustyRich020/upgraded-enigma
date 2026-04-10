/* ============================================================
   views/agent-dashboard.js — Automated job search agent UI
   Renders controls, pending jobs, stats, queries, and history.
   ============================================================ */

import { escapeHtml } from '../utils.js';
import { toast } from '../components/toast.js';
import {
  getAgentStatus,
  getAgentConfig,
  getAgentRuns,
  updateAgentConfig,
  startAgent,
  stopAgent,
  runAgentCycle,
  approvePendingJob,
  dismissPendingJob,
  generateSearchQueries
} from '../services/job-agent.js';
import { extractResumeProfile } from '../services/relevance-scorer.js';

/**
 * Render the full agent dashboard.
 * @param {HTMLElement} container — parent element to render into
 * @param {object} state — state store
 * @param {Function} addJob — callback to add a job to the tracker
 */
export function renderAgentDashboard(container, state, addJob) {
  const status = getAgentStatus();
  const config = getAgentConfig();
  const runs = getAgentRuns();
  const lastRun = runs.length > 0 ? runs[runs.length - 1] : null;

  container.innerHTML = `
    <div class="agent-dashboard">
      <!-- Controls Section -->
      <div class="card" style="margin-bottom:20px">
        <h3 style="margin-top:0">Job Search Agent</h3>
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-bottom:16px">
          <button id="agentToggleBtn" class="btn ${status.enabled ? 'danger' : 'brand'}">
            ${status.enabled ? 'Disable Agent' : 'Enable Agent'}
          </button>
          ${renderStatusBadge(status)}
          <button id="agentRunNowBtn" class="btn small ghost">Run Now</button>
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end">
          <div>
            <label class="muted" style="display:block;font-size:12px;margin-bottom:4px">Frequency</label>
            <select id="agentFrequencySelect" class="input" style="min-width:120px">
              <option value="hourly" ${config.frequency === 'hourly' ? 'selected' : ''}>Hourly</option>
              <option value="6h" ${config.frequency === '6h' ? 'selected' : ''}>Every 6h</option>
              <option value="12h" ${config.frequency === '12h' ? 'selected' : ''}>Every 12h</option>
              <option value="24h" ${config.frequency === '24h' ? 'selected' : ''}>Every 24h</option>
            </select>
          </div>

          <div style="flex:1;min-width:180px">
            <label class="muted" style="display:block;font-size:12px;margin-bottom:4px">
              Min Relevance Score: <strong id="agentScoreValue">${config.minRelevanceScore}</strong>
            </label>
            <input type="range" id="agentScoreSlider" min="0" max="100" step="5"
              value="${config.minRelevanceScore}" style="width:100%">
          </div>

          <div>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:14px">
              <input type="checkbox" id="agentAutoAddToggle" ${config.autoAdd ? 'checked' : ''}>
              Auto-add jobs
            </label>
          </div>
        </div>
      </div>

      <!-- Pending Review Section -->
      ${renderPendingSection(config)}

      <!-- Last Run Stats -->
      <div class="card" style="margin-bottom:20px">
        <h3 style="margin-top:0">Last Run Stats</h3>
        ${lastRun ? renderLastRunStats(lastRun) : '<p class="muted">Agent hasn\'t run yet. Click Run Now to start.</p>'}
      </div>

      <!-- Search Queries -->
      <div class="card" style="margin-bottom:20px">
        <h3 style="margin-top:0">Search Queries</h3>
        ${renderQueriesSection(config)}
      </div>

      <!-- Run History -->
      <div class="card">
        <h3 style="margin-top:0">Run History</h3>
        ${renderRunHistory(runs)}
      </div>
    </div>
  `;

  // --- Wire up event listeners ---

  // Toggle enable/disable
  const toggleBtn = container.querySelector('#agentToggleBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      if (status.enabled) {
        stopAgent();
        toast('Agent disabled', 'info');
      } else {
        startAgent();
        toast('Agent enabled', 'success');
      }
      renderAgentDashboard(container, state, addJob);
    });
  }

  // Run now
  const runNowBtn = container.querySelector('#agentRunNowBtn');
  if (runNowBtn) {
    runNowBtn.addEventListener('click', async () => {
      runNowBtn.disabled = true;
      runNowBtn.textContent = 'Running...';
      try {
        const result = await runAgentCycle();
        if (result.status === 'skipped') {
          toast('Agent skipped: ' + result.reason, 'info');
        } else if (result.stats) {
          toast(`Agent found ${result.stats.total} jobs, ${result.stats.scored} matched`, 'success');
        }
      } catch (err) {
        toast('Agent run failed: ' + err.message, 'error');
      }
      renderAgentDashboard(container, state, addJob);
    });
  }

  // Frequency select
  const freqSelect = container.querySelector('#agentFrequencySelect');
  if (freqSelect) {
    freqSelect.addEventListener('change', () => {
      updateAgentConfig({ frequency: freqSelect.value });
      toast('Frequency updated to ' + freqSelect.value, 'success');
      renderAgentDashboard(container, state, addJob);
    });
  }

  // Score slider
  const scoreSlider = container.querySelector('#agentScoreSlider');
  const scoreValue = container.querySelector('#agentScoreValue');
  if (scoreSlider) {
    scoreSlider.addEventListener('input', () => {
      if (scoreValue) scoreValue.textContent = scoreSlider.value;
    });
    scoreSlider.addEventListener('change', () => {
      updateAgentConfig({ minRelevanceScore: parseInt(scoreSlider.value, 10) });
      toast('Min score updated to ' + scoreSlider.value, 'success');
    });
  }

  // Auto-add toggle
  const autoAddToggle = container.querySelector('#agentAutoAddToggle');
  if (autoAddToggle) {
    autoAddToggle.addEventListener('change', () => {
      updateAgentConfig({ autoAdd: autoAddToggle.checked });
      toast(autoAddToggle.checked ? 'Auto-add enabled' : 'Auto-add disabled', 'info');
    });
  }

  // Pending job buttons
  bindPendingActions(container, state, addJob);

  // Regenerate queries button
  const regenBtn = container.querySelector('#agentRegenQueriesBtn');
  if (regenBtn) {
    regenBtn.addEventListener('click', async () => {
      regenBtn.disabled = true;
      regenBtn.textContent = 'Generating...';
      try {
        const resumes = (state.get('resumes') || []).filter(r => !r._meta);
        const profile = extractResumeProfile(resumes);
        await generateSearchQueries(profile);
        toast('Search queries regenerated', 'success');
      } catch (err) {
        toast('Query generation failed: ' + err.message, 'error');
      }
      renderAgentDashboard(container, state, addJob);
    });
  }
}

/* ---------- Rendering helpers ---------- */

function renderStatusBadge(status) {
  if (status.running) {
    return '<span class="chip" style="background:#22c55e;color:#fff">Running</span>';
  }
  if (status.enabled) {
    const next = status.nextRun ? formatTimeUntil(status.nextRun) : '';
    return `<span class="chip" style="background:#eab308;color:#000">Next run ${next}</span>`;
  }
  return '<span class="chip" style="background:#ef4444;color:#fff">Paused</span>';
}

function formatTimeUntil(isoDate) {
  const ms = new Date(isoDate).getTime() - Date.now();
  if (ms <= 0) return 'soon';
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `in ${hours}h ${minutes}m`;
  return `in ${minutes}m`;
}

function renderPendingSection(config) {
  const pending = config.pendingJobs || [];
  if (pending.length === 0) return '';

  const cards = pending.map((job, i) => {
    const scoreBg = job.relevanceScore >= 80 ? '#22c55e'
      : job.relevanceScore >= 60 ? '#eab308'
      : '#ef4444';
    const scoreColor = job.relevanceScore >= 80 ? '#fff'
      : job.relevanceScore >= 60 ? '#000'
      : '#fff';

    const skillChips = (job.matchedSkills || [])
      .slice(0, 6)
      .map(s => `<span class="chip" style="font-size:11px">${escapeHtml(s)}</span>`)
      .join('');

    return `
      <div class="search-result" style="padding:12px;margin-bottom:8px;border-radius:8px;border:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <div style="flex:1">
            <h4 style="margin:0 0 4px 0">${escapeHtml(job.title || '')}</h4>
            <div class="muted" style="font-size:13px">
              ${escapeHtml(job.company || '')}
              ${job.source ? ` &middot; ${escapeHtml(job.source)}` : ''}
              ${job.location ? ` &middot; ${escapeHtml(job.location)}` : ''}
            </div>
          </div>
          <span class="chip" style="background:${scoreBg};color:${scoreColor};font-weight:600;white-space:nowrap">
            ${job.relevanceScore || 0}%
          </span>
        </div>
        ${skillChips ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px">${skillChips}</div>` : ''}
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn small brand pending-approve-btn" data-index="${i}">ADD</button>
          <button class="btn small ghost pending-dismiss-btn" data-index="${i}">DISMISS</button>
          ${job.url ? `<a href="${escapeHtml(job.url)}" target="_blank" class="btn small ghost">VIEW</a>` : ''}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="card" style="margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 style="margin:0">${pending.length} Job${pending.length > 1 ? 's' : ''} Found &mdash; Review</h3>
        <div style="display:flex;gap:8px">
          <button id="agentAddAllBtn" class="btn small brand">Add All</button>
          <button id="agentDismissAllBtn" class="btn small ghost">Dismiss All</button>
        </div>
      </div>
      <div style="max-height:500px;overflow-y:auto">${cards}</div>
    </div>
  `;
}

function renderLastRunStats(run) {
  const stats = run.stats || {};
  const breakdown = run.sourceBreakdown || {};
  const breakdownHtml = Object.entries(breakdown)
    .map(([api, count]) => `<span class="chip">${escapeHtml(api)}: ${count}</span>`)
    .join(' ');

  return `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:12px;margin-bottom:12px">
      <div style="text-align:center">
        <div style="font-size:24px;font-weight:700">${stats.total || 0}</div>
        <div class="muted" style="font-size:12px">Total Found</div>
      </div>
      <div style="text-align:center">
        <div style="font-size:24px;font-weight:700">${stats.unique || 0}</div>
        <div class="muted" style="font-size:12px">New</div>
      </div>
      <div style="text-align:center">
        <div style="font-size:24px;font-weight:700">${stats.duplicates || 0}</div>
        <div class="muted" style="font-size:12px">Duplicates</div>
      </div>
      <div style="text-align:center">
        <div style="font-size:24px;font-weight:700">${stats.scored || 0}</div>
        <div class="muted" style="font-size:12px">High-Scoring</div>
      </div>
      <div style="text-align:center">
        <div style="font-size:24px;font-weight:700">${stats.added || 0}</div>
        <div class="muted" style="font-size:12px">Added</div>
      </div>
    </div>
    ${breakdownHtml ? `<div style="margin-bottom:8px"><span class="muted" style="font-size:12px">Sources:</span> ${breakdownHtml}</div>` : ''}
    <div class="muted" style="font-size:12px">Duration: ${formatDuration(run.duration)} &middot; ${formatDate(run.date)}</div>
  `;
}

function renderQueriesSection(config) {
  const queries = config.searchQueries || [];
  const refinement = config.refinementData || { kept: [], deleted: [] };

  const chips = queries.length > 0
    ? queries.map(q => `<span class="chip">${escapeHtml(q)}</span>`).join(' ')
    : '<span class="muted">No queries generated yet</span>';

  const keptWords = [...new Set(refinement.kept || [])].slice(0, 10);
  const deletedWords = [...new Set(refinement.deleted || [])].slice(0, 10);

  let refinementHtml = '';
  if (keptWords.length > 0 || deletedWords.length > 0) {
    refinementHtml = '<div style="margin-top:12px;font-size:13px">';
    if (keptWords.length > 0) {
      refinementHtml += `<div style="margin-bottom:4px"><span style="color:#22c55e;font-weight:600">Boosting:</span> ${keptWords.map(w => escapeHtml(w)).join(', ')}</div>`;
    }
    if (deletedWords.length > 0) {
      refinementHtml += `<div><span style="color:#ef4444;font-weight:600">Avoiding:</span> ${deletedWords.map(w => escapeHtml(w)).join(', ')}</div>`;
    }
    refinementHtml += '</div>';
  }

  return `
    <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:12px">
      ${chips}
      <button id="agentRegenQueriesBtn" class="btn small ghost" style="margin-left:8px">Regenerate</button>
    </div>
    ${refinementHtml}
  `;
}

function renderRunHistory(runs) {
  if (!runs || runs.length === 0) {
    return '<p class="muted">No runs recorded yet.</p>';
  }

  const recent = runs.slice(-20).reverse();

  const rows = recent.map(run => {
    const stats = run.stats || {};
    const queriesText = (run.queries || []).slice(0, 3).join(', ');
    return `
      <tr>
        <td style="white-space:nowrap">${formatDate(run.date)}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(queriesText)}">${escapeHtml(queriesText)}</td>
        <td style="text-align:center">${stats.total || 0}</td>
        <td style="text-align:center">${stats.unique || 0}</td>
        <td style="text-align:center">${stats.added || 0}</td>
        <td style="text-align:right;white-space:nowrap">${formatDuration(run.duration)}</td>
      </tr>
    `;
  }).join('');

  return `
    <div style="max-height:300px;overflow-y:auto">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:6px 8px">Date</th>
            <th style="text-align:left;padding:6px 8px">Queries</th>
            <th style="text-align:center;padding:6px 8px">Found</th>
            <th style="text-align:center;padding:6px 8px">New</th>
            <th style="text-align:center;padding:6px 8px">Added</th>
            <th style="text-align:right;padding:6px 8px">Duration</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

/* ---------- Action bindings ---------- */

function bindPendingActions(container, state, addJob) {
  // Individual approve/dismiss
  container.querySelectorAll('.pending-approve-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index, 10);
      approvePendingJob(index, addJob);
      renderAgentDashboard(container, state, addJob);
    });
  });

  container.querySelectorAll('.pending-dismiss-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index, 10);
      dismissPendingJob(index);
      renderAgentDashboard(container, state, addJob);
    });
  });

  // Bulk add all
  const addAllBtn = container.querySelector('#agentAddAllBtn');
  if (addAllBtn) {
    addAllBtn.addEventListener('click', () => {
      const pending = (getAgentConfig().pendingJobs || []).length;
      // Approve from index 0 repeatedly (array shifts)
      for (let i = 0; i < pending; i++) {
        approvePendingJob(0, addJob);
      }
      toast(`Added ${pending} job${pending > 1 ? 's' : ''} to tracker`, 'success');
      renderAgentDashboard(container, state, addJob);
    });
  }

  // Bulk dismiss all
  const dismissAllBtn = container.querySelector('#agentDismissAllBtn');
  if (dismissAllBtn) {
    dismissAllBtn.addEventListener('click', () => {
      const pending = (getAgentConfig().pendingJobs || []).length;
      for (let i = 0; i < pending; i++) {
        dismissPendingJob(0);
      }
      toast(`Dismissed ${pending} job${pending > 1 ? 's' : ''}`, 'info');
      renderAgentDashboard(container, state, addJob);
    });
  }
}

/* ---------- Formatting utilities ---------- */

function formatDuration(ms) {
  if (!ms && ms !== 0) return '--';
  if (ms < 1000) return ms + 'ms';
  const secs = (ms / 1000).toFixed(1);
  return secs + 's';
}

function formatDate(isoDate) {
  if (!isoDate) return '--';
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return isoDate.slice(0, 16);
  }
}

export default { renderAgentDashboard };
