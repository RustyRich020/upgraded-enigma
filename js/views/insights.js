/* ============================================================
   views/insights.js — Analytics charts and insights
   ============================================================ */

import { makeChart, getThemeColors } from '../components/charts.js';

/**
 * Render the insights view with 4 Chart.js charts.
 * @param {HTMLElement} container — section element
 * @param {object} state — state store
 */
export function renderInsights(container, state) {
  const jobs = state.get('jobs') || [];
  const colors = getThemeColors();

  const byStatus = { Saved: 0, Applied: 0, Interview: 0, Offer: 0, Closed: 0 };
  const bySource = {};
  jobs.forEach(j => {
    byStatus[j.status] = (byStatus[j.status] || 0) + 1;
    if (j.source) bySource[j.source] = (bySource[j.source] || 0) + 1;
  });

  // Application Funnel (horizontal bar)
  const funnelLabels = ['Saved', 'Applied', 'Interview', 'Offer', 'Closed'];
  const funnelData = funnelLabels.map(k => byStatus[k] || 0);
  makeChart('funnelChart', {
    type: 'bar',
    data: {
      labels: funnelLabels,
      datasets: [{
        label: 'Count',
        data: funnelData,
        backgroundColor: ['#ff0000', '#ff3333', '#ff6600', '#00ff41', '#555'],
        borderWidth: 0
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

  // Source Breakdown (polar area)
  const srcLabels = Object.keys(bySource).slice(0, 10);
  const srcColors = ['#ff0000', '#ff3333', '#ff6600', '#00bfff', '#00ff41', '#bf00ff', '#ffcc00', '#ff00ff', '#00ffff', '#888'];
  makeChart('sourceBars', {
    type: 'polarArea',
    data: {
      labels: srcLabels,
      datasets: [{
        data: srcLabels.map(k => bySource[k]),
        backgroundColor: srcColors.slice(0, srcLabels.length)
      }]
    },
    options: { plugins: { legend: { position: 'right' } } }
  });

  // Salary Distribution (bar)
  const salaries = jobs.filter(j => j.salary && Number(j.salary) > 0).map(j => Number(j.salary));
  if (salaries.length > 0) {
    const buckets = {};
    salaries.forEach(s => {
      const b = Math.floor(s / 25000) * 25000;
      const label = `$${b / 1000}k-${(b + 25000) / 1000}k`;
      buckets[label] = (buckets[label] || 0) + 1;
    });
    makeChart('salaryChart', {
      type: 'bar',
      data: {
        labels: Object.keys(buckets),
        datasets: [{
          label: 'Jobs',
          data: Object.values(buckets),
          backgroundColor: 'rgba(0,191,255,0.6)',
          borderColor: '#00bfff',
          borderWidth: 1
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
  }

  // Status Timeline (line chart by month)
  const months = {};
  jobs.forEach(j => {
    const m = (j.follow || j._added || '').slice(0, 7);
    if (m) months[m] = (months[m] || 0) + 1;
  });
  const mLabels = Object.keys(months).sort();
  if (mLabels.length > 0) {
    makeChart('timelineChart', {
      type: 'line',
      data: {
        labels: mLabels,
        datasets: [{
          label: 'Jobs',
          data: mLabels.map(m => months[m]),
          borderColor: '#ff6600',
          backgroundColor: 'rgba(255,102,0,0.1)',
          fill: true,
          tension: 0.3
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
  }
}

export default { renderInsights };
