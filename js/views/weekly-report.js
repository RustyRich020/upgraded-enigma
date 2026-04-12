/* ============================================================
   views/weekly-report.js — Weekly Report Generator
   ============================================================ */

import { escapeHtml, fmtDate, today, download } from '../utils.js';
import { toast } from '../components/toast.js';
import { buildCareerProfile, summarizeLearningGaps } from '../services/career-ops-lite.js';
import { EmptyState } from '../ui/empty-state.js';

/**
 * Render the weekly report generator view.
 * @param {HTMLElement} container — section element
 * @param {object} state — state store
 */
export function renderWeeklyReport(container, state) {
  const todayStr = today();

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:16px">
      <h2 style="margin:0">Weekly Report</h2>
    </div>

    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px">
      <label class="label" style="margin:0">Date Range:</label>
      <select class="input" id="reportRange" style="width:auto">
        <option value="thisWeek">This Week</option>
        <option value="lastWeek">Last Week</option>
        <option value="custom">Custom</option>
      </select>
      <input type="date" class="input" id="reportStart" style="width:auto;display:none">
      <span id="reportDash" style="display:none">to</span>
      <input type="date" class="input" id="reportEnd" style="width:auto;display:none">
      <button class="btn" id="generateReport">GENERATE REPORT</button>
    </div>

    <div id="reportActions" style="display:none;margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn" id="copyReport">COPY TO CLIPBOARD</button>
      <button class="btn" id="downloadReport">DOWNLOAD AS TEXT</button>
    </div>

    <div id="reportPreview" style="padding:20px;border:1px solid var(--border);border-radius:8px;background:var(--surface);min-height:200px">
      ${EmptyState({ icon: '\u{1F4CA}', title: 'No report generated yet', description: 'Select a date range and click "Generate Report"' })}
    </div>
  `;

  /* --- Custom date toggle --- */
  const rangeSelect = container.querySelector('#reportRange');
  const startInput = container.querySelector('#reportStart');
  const endInput = container.querySelector('#reportEnd');
  const dashSpan = container.querySelector('#reportDash');

  rangeSelect.onchange = () => {
    const isCustom = rangeSelect.value === 'custom';
    startInput.style.display = isCustom ? 'inline-block' : 'none';
    endInput.style.display = isCustom ? 'inline-block' : 'none';
    dashSpan.style.display = isCustom ? 'inline' : 'none';
  };

  /* --- Generate report --- */
  let reportText = '';

  container.querySelector('#generateReport').onclick = () => {
    const range = getDateRange(rangeSelect.value, startInput.value, endInput.value);
    reportText = buildReport(state, range.start, range.end);
    const preview = container.querySelector('#reportPreview');
    preview.innerHTML = `<pre style="white-space:pre-wrap;font-family:inherit;margin:0;font-size:13px;line-height:1.6">${escapeHtml(reportText)}</pre>`;

    const actions = container.querySelector('#reportActions');
    actions.style.display = 'flex';

    toast('Report generated', 'success');
  };

  /* --- Copy --- */
  container.querySelector('#copyReport').onclick = () => {
    if (!reportText) {
      toast('Generate a report first', 'error');
      return;
    }
    navigator.clipboard.writeText(reportText).then(() => {
      toast('Copied to clipboard', 'success');
    }).catch(() => {
      toast('Copy failed — try manually', 'error');
    });
  };

  /* --- Download --- */
  container.querySelector('#downloadReport').onclick = () => {
    if (!reportText) {
      toast('Generate a report first', 'error');
      return;
    }
    const range = getDateRange(rangeSelect.value, startInput.value, endInput.value);
    download(`weekly-report-${range.start}-to-${range.end}.txt`, reportText);
    toast('Download started', 'success');
  };
}

/**
 * Calculate start/end dates for a given range selection.
 */
function getDateRange(rangeValue, customStart, customEnd) {
  const now = new Date();
  let start, end;

  if (rangeValue === 'thisWeek') {
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1; // Monday start
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    start = fmtDate(monday);
    end = today();
  } else if (rangeValue === 'lastWeek') {
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() - diff);
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);
    const lastSunday = new Date(thisMonday);
    lastSunday.setDate(thisMonday.getDate() - 1);
    start = fmtDate(lastMonday);
    end = fmtDate(lastSunday);
  } else {
    start = customStart || today(-7);
    end = customEnd || today();
  }

  return { start, end };
}

/**
 * Build the text report from state data within a date range.
 */
function buildReport(state, startDate, endDate) {
  const jobs = state.get('jobs') || [];
  const interviews = state.get('interviews') || [];
  const networking = state.get('networking') || [];
  const profile = buildCareerProfile({
    resumes: state.get('resumes') || [],
    jobs,
    offers: state.get('offers') || [],
    settings: state.get('settings') || {}
  });

  /* Filter jobs added in range */
  const jobsThisWeek = jobs.filter(j => {
    const d = fmtDate(j._added || j.createdAt);
    return d >= startDate && d <= endDate;
  });

  /* Status counts */
  const statusCounts = {};
  jobs.forEach(j => {
    statusCounts[j.status] = (statusCounts[j.status] || 0) + 1;
  });

  /* Interviews in range */
  const upcomingInterviews = interviews.filter(iv => {
    return iv.date >= startDate && iv.date <= endDate;
  });

  /* Follow-ups due within 7 days from end date */
  const followEnd = new Date(endDate + 'T00:00:00');
  followEnd.setDate(followEnd.getDate() + 7);
  const followEndStr = fmtDate(followEnd);
  const followUpsDue = jobs.filter(j => {
    return j.follow && j.follow >= startDate && j.follow <= followEndStr;
  });

  /* Companies contacted */
  const companiesSet = new Set();
  jobsThisWeek.forEach(j => { if (j.company) companiesSet.add(j.company); });
  networking.filter(a => {
    const d = fmtDate(a.date);
    return d >= startDate && d <= endDate;
  }).forEach(a => { if (a.company) companiesSet.add(a.company); });

  /* Skills from job titles/notes */
  const skillSet = new Set();
  jobs.forEach(j => {
    const text = (j.title || '') + ' ' + (j.skills || '') + ' ' + (j.notes || '');
    const matches = text.match(/\b(JavaScript|TypeScript|React|Python|Node\.?js|SQL|AWS|Docker|Java|Go|Rust|C\+\+|Kubernetes|GraphQL|REST|Git)\b/gi);
    if (matches) matches.forEach(s => skillSet.add(s));
  });
  const learningGaps = summarizeLearningGaps(jobs, profile, 5);

  /* Build text */
  const lines = [];
  lines.push('========================================');
  lines.push('   JOB SEARCH WEEKLY REPORT');
  lines.push(`   ${startDate} to ${endDate}`);
  lines.push('========================================');
  lines.push('');

  /* Summary Stats */
  lines.push('-- SUMMARY STATS --');
  lines.push(`Total Jobs Tracked:       ${jobs.length}`);
  lines.push(`New Applications (range): ${jobsThisWeek.length}`);
  lines.push(`Interviews Scheduled:     ${upcomingInterviews.length}`);
  lines.push(`Follow-ups Due:           ${followUpsDue.length}`);
  lines.push(`Companies Contacted:      ${companiesSet.size}`);
  lines.push('');
  lines.push('Status Breakdown:');
  Object.keys(statusCounts).forEach(s => {
    lines.push(`  ${s}: ${statusCounts[s]}`);
  });
  lines.push('');

  /* Applications This Week */
  lines.push('-- APPLICATIONS THIS PERIOD --');
  if (jobsThisWeek.length === 0) {
    lines.push('  (none)');
  } else {
    jobsThisWeek.forEach(j => {
      lines.push(`  - ${j.title || 'Untitled'} at ${j.company || 'Unknown'} [${j.status || '?'}]`);
    });
  }
  lines.push('');

  /* Interviews */
  lines.push('-- INTERVIEWS SCHEDULED --');
  if (upcomingInterviews.length === 0) {
    lines.push('  (none)');
  } else {
    upcomingInterviews.forEach(iv => {
      lines.push(`  - ${iv.date}${iv.time ? ' ' + iv.time : ''} — ${iv.company} (${iv.type || 'General'}) [${iv.status}]`);
    });
  }
  lines.push('');

  /* Follow-ups */
  lines.push('-- FOLLOW-UPS DUE --');
  if (followUpsDue.length === 0) {
    lines.push('  (none)');
  } else {
    followUpsDue.forEach(j => {
      lines.push(`  - ${j.follow} — ${j.title || 'Untitled'} at ${j.company || 'Unknown'}`);
    });
  }
  lines.push('');

  /* Companies */
  lines.push('-- COMPANIES CONTACTED --');
  if (companiesSet.size === 0) {
    lines.push('  (none)');
  } else {
    [...companiesSet].sort().forEach(c => lines.push(`  - ${c}`));
  }
  lines.push('');

  /* Skills */
  lines.push('-- SKILLS MATCHED --');
  if (skillSet.size === 0) {
    lines.push('  (none detected)');
  } else {
    lines.push(`  ${[...skillSet].join(', ')}`);
  }
  lines.push('');

  lines.push('-- TOP LEARNING GAPS --');
  if (!learningGaps.length) {
    lines.push('  (no major repeated gaps detected)');
  } else {
    learningGaps.forEach(item => {
      lines.push(`  - ${item.skill} (${item.count} roles)`);
    });
  }
  lines.push('');
  lines.push('========================================');
  lines.push('  Generated by JobSynk | support@qq-studios.com');
  lines.push('========================================');

  return lines.join('\n');
}

export default { renderWeeklyReport };
