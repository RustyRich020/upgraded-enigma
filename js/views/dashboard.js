/* ============================================================
   views/dashboard.js — Main dashboard with charts and stats
   ============================================================ */

import { makeChart, getThemeColors } from '../components/charts.js';
import { escapeHtml, fmtDate } from '../utils.js';
import { fetchBlsData } from '../services/bls-service.js';
import { toast } from '../components/toast.js';
import { requestPermission, scheduleChecks } from '../services/notifications.js';
import { getApi } from '../services/api-keys.js';

function computeStats(jobs) {
  const byStatus = { Saved: 0, Applied: 0, Interview: 0, Offer: 0, Closed: 0 };
  const bySource = {};
  const upcoming = [];

  (jobs || []).forEach(j => {
    byStatus[j.status] = (byStatus[j.status] || 0) + 1;
    if (j.source) bySource[j.source] = (bySource[j.source] || 0) + 1;
    if (j.follow) {
      const d = new Date(j.follow);
      const now = new Date();
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

/**
 * Render the dashboard view.
 * @param {HTMLElement} container — section element
 * @param {object} state — state store
 */
export function renderDashboard(container, state) {
  // Filter out _meta docs from Firestore
  const jobs = (state.get('jobs') || []).filter(j => j.id && j.id !== '_meta' && j.title);
  const { byStatus, bySource, upcoming } = computeStats(jobs);
  const colors = getThemeColors();
  const p = colors.pipeline;

  // Pipeline donut chart — theme-aware colors
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

  // Source bar chart
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

  // Upcoming actions list
  const upcomingEl = document.getElementById('upcomingList');
  if (upcomingEl) {
    upcomingEl.innerHTML = upcoming.map(j => `
      <div style="display:flex;align-items:center;justify-content:space-between;margin:6px 0;padding:8px 10px;background:var(--color-primary-subtle);border:1px solid var(--color-surface-border);border-radius:var(--radius-md);gap:8px;">
        <div style="min-width:0;">
          <strong style="color:var(--color-text-heading);font-size:var(--text-sm)">${escapeHtml(j.title)}</strong>
          <span class="muted"> @ ${escapeHtml(j.company)}</span>
        </div>
        <span class="chip" style="flex-shrink:0">${fmtDate(j.follow)}</span>
      </div>
    `).join('') || '<div class="muted" style="padding:20px;text-align:center">No upcoming follow-ups</div>';
  }

  // Weekly activity chart
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
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

  // BLS load button
  const blsBtn = document.getElementById('loadBlsBtn');
  if (blsBtn) {
    blsBtn.onclick = async () => {
      blsBtn.disabled = true;
      blsBtn.innerHTML = '<span class="spinner"></span>';
      try {
        const bls = await fetchBlsData();
        const avgSalary = jobs.filter(j => j.salary).reduce((a, j) => a + Number(j.salary), 0)
          / Math.max(1, jobs.filter(j => j.salary).length);

        const benchEl = document.getElementById('blsBenchmarks');
        if (benchEl) {
          benchEl.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div class="panel" style="text-align:center">
                <div class="muted" style="font-size:11px">BLS NATIONAL MEDIAN</div>
                <div style="font-size:24px;font-weight:900;color:var(--blue);margin:8px 0">$${bls.annual.toLocaleString()}</div>
                <div class="muted" style="font-size:10px">${bls.year} ${bls.period} - $${bls.weekly}/week</div>
              </div>
              <div class="panel" style="text-align:center">
                <div class="muted" style="font-size:11px">YOUR AVG TARGET</div>
                <div style="font-size:24px;font-weight:900;color:${avgSalary > bls.annual ? 'var(--green)' : 'var(--orange)'};margin:8px 0">$${avgSalary ? Math.round(avgSalary).toLocaleString() : '---'}</div>
                <div class="muted" style="font-size:10px">${avgSalary > bls.annual ? 'Above' : 'Below'} national median</div>
              </div>
            </div>
            <div style="margin-top:12px">
              <div class="muted" style="font-size:11px;margin-bottom:4px">YOUR TARGET vs MEDIAN</div>
              <div class="salary-bar"><div class="fill" style="width:${Math.min(100, Math.round(avgSalary / bls.annual * 100))}%"></div></div>
              <div class="muted" style="font-size:10px;margin-top:4px">${Math.round(avgSalary / bls.annual * 100)}% of national median</div>
            </div>`;
        }
        toast('BLS salary data loaded', 'success');
      } catch (err) {
        const benchEl = document.getElementById('blsBenchmarks');
        if (benchEl) {
          benchEl.innerHTML = `<div class="muted" style="text-align:center;padding:12px">BLS Error: ${escapeHtml(err.message)}</div>`;
        }
      } finally {
        blsBtn.disabled = false;
        blsBtn.textContent = 'LOAD BLS DATA';
      }
    };
  }

  // Notification enable button
  const notifBtn = document.getElementById('enableNotifBtn');
  if (notifBtn) {
    notifBtn.onclick = async () => {
      const granted = await requestPermission();
      if (granted) {
        toast('Notifications enabled!', 'success');
        scheduleChecks(() => state.get('jobs') || [], getApi('ntfyTopic'));
      } else {
        toast('Notification permission denied', 'error');
      }
    };
  }
}

export default { renderDashboard };
