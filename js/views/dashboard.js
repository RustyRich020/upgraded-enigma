/* ============================================================
   views/dashboard.js — Main dashboard with charts and stats
   ============================================================ */

import { makeChart, getThemeColors } from '../components/charts.js';
import { escapeHtml, fmtDate, today } from '../utils.js';
import { fetchBlsData } from '../services/bls-service.js';
import { toast } from '../components/toast.js';
import { requestPermission, getPermissionStatus, scheduleChecks } from '../services/notifications.js';
import { getApi } from '../services/api-keys.js';
import { renderChecklistHTML, bindChecklistEvents, isChecklistDismissed } from '../components/getting-started.js';
import { buildCareerProfile, evaluateOpportunity, summarizeLearningGaps } from '../services/career-ops-lite.js';
import { navigate } from '../router.js';
import { initSwipeCards } from '../ui/swipe-cards.js';

function computeStats(jobs) {
  const byStatus = { Saved: 0, Applied: 0, Interview: 0, Offer: 0, Closed: 0 };
  const bySource = {};
  const upcoming = [];

  (jobs || []).forEach(j => {
    byStatus[j.status] = (byStatus[j.status] || 0) + 1;
    if (j.source) bySource[j.source] = (bySource[j.source] || 0) + 1;
    if (j.follow) {
      const d = new Date(`${fmtDate(j.follow)}T12:00:00`);
      const now = new Date(`${today()}T12:00:00`);
      const diff = (d - now) / (1000 * 3600 * 24);
      if (diff >= -1 && diff <= 14) upcoming.push(j);
    }
  });

  return {
    byStatus,
    bySource,
    upcoming: upcoming.sort((a, b) => new Date(a.follow) - new Date(b.follow)).slice(0, 8)
  };
}

function averageSalary(jobs) {
  const salaries = jobs
    .map(job => Number(job.salary))
    .filter(value => Number.isFinite(value) && value > 0);
  if (salaries.length === 0) return 0;
  return Math.round(salaries.reduce((sum, value) => sum + value, 0) / salaries.length);
}

function buildScoredJobs(jobs, state) {
  const profile = buildCareerProfile({
    resumes: state.get('resumes') || [],
    jobs,
    offers: state.get('offers') || [],
    settings: state.get('settings') || {}
  });

  return {
    profile,
    scoredJobs: jobs.map(job => ({
      ...job,
      fit: evaluateOpportunity(job, profile)
    }))
  };
}

function buildGapInsights(scoredJobs, profile, limit = 5) {
  const gapSkills = summarizeLearningGaps(scoredJobs, profile, limit);
  return gapSkills.map(item => {
    const matchingRoles = scoredJobs
      .filter(job => job.fit?.missingSkills?.includes(item.skill))
      .sort((a, b) => (b.fit?.score || 0) - (a.fit?.score || 0))
      .slice(0, 2)
      .map(job => `${job.title || 'Untitled'} at ${job.company || 'Unknown company'}`);

    return {
      ...item,
      examples: matchingRoles
    };
  });
}

function buildNextActions({ scoredJobs, interviews, networking, stories, gapInsights }) {
  const todayStr = today();
  const soonStr = today(3);
  const weekAhead = today(7);
  const actions = [];

  interviews
    .filter(interview => interview.status === 'Scheduled' && interview.date && interview.date >= todayStr && interview.date <= weekAhead)
    .sort((a, b) => `${a.date || ''}T${a.time || '00:00'}`.localeCompare(`${b.date || ''}T${b.time || '00:00'}`))
    .slice(0, 2)
    .forEach(interview => {
      actions.push({
        priority: 100,
        title: `Prep for ${interview.company || 'your next interview'}`,
        detail: `${fmtDate(interview.date)}${interview.time ? ` at ${interview.time}` : ''} - ${interview.role || 'Interview loop'} is on deck.`,
        route: 'interviews',
        cta: 'Open prep'
      });
    });

  scoredJobs
    .filter(job => job.status !== 'Closed' && job.follow && job.follow <= soonStr)
    .sort((a, b) => {
      if (a.follow !== b.follow) return (a.follow || '').localeCompare(b.follow || '');
      return (b.fit?.score || 0) - (a.fit?.score || 0);
    })
    .slice(0, 2)
    .forEach(job => {
      const timingLabel = job.follow < todayStr ? 'Overdue follow-up' : `Follow up by ${fmtDate(job.follow)}`;
      actions.push({
        priority: job.follow < todayStr ? 95 : 90,
        title: `${timingLabel} with ${job.company || 'this company'}`,
        detail: `${job.title || 'Tracked role'} is currently ${job.status || 'active'} and scores ${job.fit?.score || 0}% fit.`,
        route: 'my-jobs',
        cta: 'Open tracker'
      });
    });

  const topSaved = scoredJobs
    .filter(job => job.status === 'Saved')
    .sort((a, b) => (b.fit?.score || 0) - (a.fit?.score || 0))[0];
  if (topSaved) {
    actions.push({
      priority: 82,
      title: `Apply to ${topSaved.company || 'your top saved role'}`,
      detail: `${topSaved.title || 'Saved role'} is your strongest saved match at ${topSaved.fit?.score || 0}% (${topSaved.fit?.grade || 'N/A'} fit).`,
      route: 'my-jobs',
      cta: 'Review role'
    });
  }

  if ((stories || []).length < 3) {
    const remaining = Math.max(1, 3 - stories.length);
    actions.push({
      priority: 75,
      title: `Add ${remaining} more interview stor${remaining === 1 ? 'y' : 'ies'}`,
      detail: 'A small story bank makes interview prep faster across multiple roles.',
      route: 'interviews',
      cta: 'Build stories'
    });
  }

  if (gapInsights.length) {
    const topGap = gapInsights[0];
    actions.push({
      priority: 72,
      title: `Close the ${topGap.skill} gap`,
      detail: `${topGap.skill} shows up in ${topGap.count} tracked roles${topGap.examples[0] ? `, including ${topGap.examples[0]}.` : '.'}`,
      route: 'my-profile',
      cta: 'Tune profile'
    });
  }

  const latestNetworking = (networking || [])
    .slice()
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
  const noRecentNetworking = !latestNetworking || latestNetworking.date < today(-7);
  if (latestNetworking && /follow|check in|stay in touch/i.test(`${latestNetworking.outcome || ''} ${latestNetworking.notes || ''}`)) {
    actions.push({
      priority: 68,
      title: `Send the follow-up to ${latestNetworking.contactName || 'your contact'}`,
      detail: `${latestNetworking.company || 'Recent networking activity'} suggests there is still warm momentum to keep alive.`,
      route: 'networking',
      cta: 'Open networking'
    });
  } else if (noRecentNetworking) {
    actions.push({
      priority: 58,
      title: 'Restart networking momentum',
      detail: 'There has not been a logged touchpoint in the last 7 days. One quality follow-up can reopen surface area.',
      route: 'networking',
      cta: 'Log outreach'
    });
  }

  const uniqueActions = [];
  const seen = new Set();
  actions
    .sort((a, b) => b.priority - a.priority)
    .forEach(action => {
      const key = `${action.title}|${action.route}`;
      if (seen.has(key)) return;
      seen.add(key);
      uniqueActions.push(action);
    });

  return uniqueActions.slice(0, 5);
}

function renderCareerOpsPanel(state, jobs) {
  const panel = document.getElementById('careerOpsPanel');
  if (!panel) return;

  if (!jobs.length) {
    panel.innerHTML = `
      <div class="empty-inline">
        Career Ops lights up once you add roles, resumes, or interview prep data. Start with a few tracked jobs to generate fit signals and next actions.
      </div>
    `;
    return;
  }

  const interviews = state.get('interviews') || [];
  const networking = state.get('networking') || [];
  const stories = state.get('stories') || [];
  const activeJobs = jobs.filter(job => job.status !== 'Closed');
  const { profile, scoredJobs } = buildScoredJobs(activeJobs, state);
  const topFitRoles = scoredJobs
    .slice()
    .sort((a, b) => (b.fit?.score || 0) - (a.fit?.score || 0))
    .slice(0, 3);
  const gapInsights = buildGapInsights(scoredJobs, profile, 5);
  const nextActions = buildNextActions({ scoredJobs, interviews, networking, stories, gapInsights });

  panel.innerHTML = `
    <div class="career-ops-grid">
      <section class="career-ops-column">
        <div class="career-ops-column-header">
          <div>
            <h3>Top-Fit Roles</h3>
            <p class="muted">Your best current matches based on role alignment, skills, seniority, comp, and timing.</p>
          </div>
          <span class="chip">${topFitRoles.length} surfaced</span>
        </div>
        <div class="career-ops-stack">
          ${topFitRoles.length ? topFitRoles.map(job => `
            <article class="career-ops-role">
              <div class="career-ops-role-head">
                <div>
                  <strong>${escapeHtml(job.title || 'Untitled role')}</strong>
                  <p class="muted">${escapeHtml(job.company || 'Unknown company')} - ${escapeHtml(job.status || 'Tracked')}</p>
                </div>
                <span class="fit-grade fit-grade-${(job.fit?.grade || 'f').toLowerCase()}">${escapeHtml(job.fit?.grade || 'F')} · ${job.fit?.score || 0}%</span>
              </div>
              <p class="career-ops-summary">${escapeHtml(job.fit?.summary || 'Fit summary unavailable.')}</p>
              <div class="fit-chip-row">
                ${(job.fit?.strengths || []).length
                  ? job.fit.strengths.map(item => `<span class="chip chip-strong">${escapeHtml(item)}</span>`).join('')
                  : '<span class="chip">Needs more role data</span>'
                }
              </div>
              ${(job.fit?.risks || []).length ? `
                <div class="fit-chip-row">
                  ${job.fit.risks.map(item => `<span class="chip chip-risk">${escapeHtml(item)}</span>`).join('')}
                </div>
              ` : ''}
            </article>
          `).join('') : '<div class="empty-inline">No active roles to score yet.</div>'}
        </div>
      </section>

      <section class="career-ops-column">
        <div class="career-ops-column-header">
          <div>
            <h3>Repeated Gap Skills</h3>
            <p class="muted">Patterns worth closing because they recur across multiple tracked opportunities.</p>
          </div>
          <span class="chip">${gapInsights.length} signals</span>
        </div>
        <div class="career-ops-stack">
          ${gapInsights.length ? gapInsights.map(item => `
            <article class="career-ops-skill">
              <div class="career-ops-skill-head">
                <strong>${escapeHtml(item.skill)}</strong>
                <span class="chip chip-risk">${item.count} role${item.count === 1 ? '' : 's'}</span>
              </div>
              <p class="muted">${item.examples.length ? `Showing up in ${escapeHtml(item.examples.join(' and '))}.` : 'Shows up repeatedly across the current pipeline.'}</p>
            </article>
          `).join('') : '<div class="empty-inline">No repeated skill gaps detected yet. Your current pipeline looks fairly aligned.</div>'}
        </div>
      </section>

      <section class="career-ops-column">
        <div class="career-ops-column-header">
          <div>
            <h3>Best Next Actions</h3>
            <p class="muted">What to do next based on interviews, follow-ups, fit, networking, and prep coverage.</p>
          </div>
          <span class="chip">${nextActions.length} queued</span>
        </div>
        <div class="career-ops-stack">
          ${nextActions.length ? nextActions.map(action => `
            <article class="career-ops-action">
              <div>
                <strong>${escapeHtml(action.title)}</strong>
                <p class="muted">${escapeHtml(action.detail)}</p>
              </div>
              <button class="btn small ghost" type="button" data-career-route="${escapeHtml(action.route)}">${escapeHtml(action.cta)}</button>
            </article>
          `).join('') : `
            <div class="empty-inline">
              No urgent actions right now. That usually means your pipeline is caught up and ready for new top-fit roles.
            </div>
          `}
        </div>
      </section>
    </div>
  `;

  panel.querySelectorAll('[data-career-route]').forEach(button => {
    button.addEventListener('click', () => {
      const route = button.dataset.careerRoute;
      if (route) navigate(route);
    });
  });
}

/**
 * Render the dashboard view.
 * @param {HTMLElement} container — section element
 * @param {object} state — state store
 */
export function renderDashboard(container, state) {
  const jobs = (state.get('jobs') || []).filter(j => j.id && j.id !== '_meta' && j.title);
  const { byStatus, bySource, upcoming } = computeStats(jobs);
  const colors = getThemeColors();
  const p = colors.pipeline;
  const activeJobs = jobs.filter(job => job.status !== 'Closed').length;
  const topSource = Object.entries(bySource).sort((a, b) => b[1] - a[1])[0];
  const avgTarget = averageSalary(jobs);

  const metricsEl = document.getElementById('dashboardMetrics');
  if (metricsEl) {
    metricsEl.innerHTML = [
      {
        value: jobs.length,
        label: 'Tracked Roles',
        detail: `${activeJobs} still in motion`
      },
      {
        value: byStatus.Applied + byStatus.Interview + byStatus.Offer,
        label: 'Live Pipeline',
        detail: `${byStatus.Interview + byStatus.Offer} late-stage opportunities`
      },
      {
        value: upcoming.length,
        label: 'Next 14 Days',
        detail: upcoming.length ? `${fmtDate(upcoming[0].follow)} is next up` : 'Nothing due right now'
      },
      {
        value: avgTarget ? `$${Math.round(avgTarget / 1000)}k` : '--',
        label: 'Average Target',
        detail: topSource ? `${topSource[0]} is your top source` : 'Add a few jobs to build insights'
      }
    ].map(metric => `
      <div class="glance-card">
        <div class="glance-label">${metric.label}</div>
        <div class="glance-value">${metric.value}</div>
        <div class="glance-copy">${metric.detail}</div>
      </div>
    `).join('');
  }

  // Swipe carousel for mobile
  initSwipeCards(metricsEl, { label: 'Dashboard stats' });

  container.querySelectorAll('[data-dash-nav]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.dashNav));
  });

  renderCareerOpsPanel(state, jobs);

  const checklistContainer = document.getElementById('dashboardChecklist');
  if (checklistContainer && !isChecklistDismissed()) {
    const userName = state.get('settings')?.name || '';
    checklistContainer.innerHTML = renderChecklistHTML(userName);
    bindChecklistEvents(checklistContainer, () => {
      renderDashboard(container, state);
    });
  } else if (checklistContainer) {
    checklistContainer.innerHTML = '';
  }

  const statusLabels = ['Saved', 'Applied', 'Interview', 'Offer', 'Closed'];
  const statusData = statusLabels.map(s => byStatus[s] || 0);
  const statusColors = statusLabels.map(s => p[s]);
  makeChart('pipelineChart', {
    type: 'doughnut',
    data: {
      labels: statusLabels,
      datasets: [{
        data: statusData,
        backgroundColor: statusColors,
        borderColor: colors.bg,
        borderWidth: 2
      }]
    },
    options: { plugins: { legend: { position: 'bottom', labels: { padding: 10, usePointStyle: true, pointStyle: 'circle' } } } }
  });

  const srcLabels = Object.keys(bySource).slice(0, 10);
  const srcData = srcLabels.map(k => bySource[k]);
  makeChart('sourceChart', {
    type: 'bar',
    data: {
      labels: srcLabels,
      datasets: [{
        label: 'Jobs',
        data: srcData,
        backgroundColor: colors.primaryDim.replace('0.1', '0.5'),
        borderColor: colors.primary,
        borderWidth: 1
      }]
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: colors.gridColor } },
        y: { grid: { color: colors.gridColor } }
      }
    }
  });

  const upcomingEl = document.getElementById('upcomingList');
  if (upcomingEl) {
    upcomingEl.innerHTML = upcoming.map(j => `
      <div class="list-item">
        <div class="list-item-meta">
          <strong class="list-item-title">${escapeHtml(j.title)}</strong>
          <span class="muted">${escapeHtml(j.company || 'Unknown company')}</span>
        </div>
        <span class="chip">${fmtDate(j.follow)}</span>
      </div>
    `).join('') || '<div class="empty-inline">No upcoming follow-ups. Add a reminder from a job card to stay on top of outreach.</div>';
  }

  const days = [];
  for (let i = 6; i >= 0; i--) {
    days.push(today(-i));
  }
  const dailyCounts = days.map(d =>
    jobs.filter(j => j.follow === d || (j._added && j._added === d)).length
  );
  makeChart('weeklyChart', {
    type: 'line',
    data: {
      labels: days.map(d => d.slice(5)),
      datasets: [{
        label: 'Activity',
        data: dailyCounts,
        borderColor: colors.accent,
        backgroundColor: colors.accentDim,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: colors.gridColor } },
        y: { grid: { color: colors.gridColor }, beginAtZero: true }
      }
    }
  });

  const blsBtn = document.getElementById('loadBlsBtn');
  if (blsBtn) {
    blsBtn.onclick = async () => {
      blsBtn.disabled = true;
      blsBtn.innerHTML = '<span class="spinner"></span> Loading';
      try {
        const bls = await fetchBlsData();
        const benchEl = document.getElementById('blsBenchmarks');
        if (benchEl) {
          const ratio = avgTarget && bls.annual ? Math.round(avgTarget / bls.annual * 100) : 0;
          const comparisonClass = avgTarget > bls.annual ? 'good' : 'warn';
          benchEl.innerHTML = `
            <div class="bls-grid">
              <div class="bls-stat">
                <div class="muted" style="font-size:11px">BLS NATIONAL MEDIAN</div>
                <div class="bls-value accent">$${bls.annual.toLocaleString()}</div>
                <div class="muted" style="font-size:10px">${bls.year} ${bls.period} · $${bls.weekly}/week</div>
              </div>
              <div class="bls-stat">
                <div class="muted" style="font-size:11px">YOUR AVG TARGET</div>
                <div class="bls-value ${comparisonClass}">${avgTarget ? `$${avgTarget.toLocaleString()}` : '--'}</div>
                <div class="muted" style="font-size:10px">${avgTarget ? `${avgTarget > bls.annual ? 'Above' : 'Below'} national median` : 'Add salary targets to compare'}</div>
              </div>
            </div>
            <div class="stack-sm">
              <div class="muted" style="font-size:11px">YOUR TARGET VS MEDIAN</div>
              <div class="salary-bar"><div class="fill" style="width:${Math.min(100, ratio)}%"></div></div>
              <div class="muted" style="font-size:10px">${avgTarget ? `${ratio}% of national median` : 'No salary target data yet'}</div>
            </div>`;
        }
        toast('BLS salary data loaded', 'success');
      } catch (err) {
        const benchEl = document.getElementById('blsBenchmarks');
        if (benchEl) {
          benchEl.innerHTML = `<div class="empty-inline">BLS error: ${escapeHtml(err.message)}</div>`;
        }
      } finally {
        blsBtn.disabled = false;
        blsBtn.textContent = 'Load BLS Data';
      }
    };
  }

  const notifBtn = document.getElementById('enableNotifBtn');
  const notifStatus = document.getElementById('notifStatus');
  const permStatus = getPermissionStatus();

  if (notifStatus) {
    const statusColors = { granted: 'var(--color-success)', denied: 'var(--color-danger)', default: 'var(--color-muted)', unsupported: 'var(--color-muted)' };
    notifStatus.innerHTML = `<span style="color:${statusColors[permStatus.status]}">${permStatus.label}</span>`;
  }

  if (notifBtn) {
    if (permStatus.status === 'granted') {
      notifBtn.textContent = 'Notifications On';
      notifBtn.disabled = true;
    } else if (permStatus.status === 'denied') {
      notifBtn.textContent = 'Reset In Browser';
      notifBtn.onclick = () => {
        toast('Click the lock/info icon in your browser address bar → Site Settings → Notifications → Allow. Then reload the page.', 'info');
      };
    } else {
      notifBtn.onclick = async () => {
        const granted = await requestPermission();
        if (granted) {
          scheduleChecks(() => (state.get('jobs') || []).filter(j => j.id !== '_meta'), getApi('ntfyTopic'));
          notifBtn.textContent = 'Notifications On';
          notifBtn.disabled = true;
          if (notifStatus) notifStatus.innerHTML = '<span style="color:var(--color-success)">Enabled</span>';
        }
      };
    }
  }
}

export default { renderDashboard };
