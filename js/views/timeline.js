/* ============================================================
   views/timeline.js — Application Timeline
   ============================================================ */

import { escapeHtml, fmtDate, today } from '../utils.js';

/**
 * Render a visual vertical timeline of all job activity.
 * @param {HTMLElement} container — section element
 * @param {object} state — state store
 */
export function renderTimeline(container, state) {
  const jobs = state.get('jobs') || [];
  const interviews = state.get('interviews') || [];

  /* --- Build events from jobs --- */
  const events = [];

  jobs.forEach(j => {
    const company = j.company || 'Unknown';
    const title = j.title || 'Untitled';

    /* Applied / added date */
    if (j._added || j.createdAt) {
      events.push({
        date: fmtDate(j._added || j.createdAt),
        type: 'Saved',
        title: 'Job Saved',
        company,
        description: `Added "${title}" to tracker`
      });
    }

    /* Status-based events */
    if (j.status === 'Applied') {
      events.push({
        date: fmtDate(j._applied || j._added || j.createdAt),
        type: 'Applied',
        title: 'Application Submitted',
        company,
        description: `Applied for "${title}"`
      });
    }
    if (j.status === 'Interview') {
      events.push({
        date: fmtDate(j._interview || j._added || j.createdAt),
        type: 'Interview',
        title: 'Interview Stage',
        company,
        description: `Moved to interview stage for "${title}"`
      });
    }
    if (j.status === 'Offer') {
      events.push({
        date: fmtDate(j._offer || j._added || j.createdAt),
        type: 'Offer',
        title: 'Offer Received',
        company,
        description: `Received offer for "${title}"${j.salary ? ' — $' + Number(j.salary).toLocaleString() : ''}`
      });
    }
    if (j.status === 'Closed') {
      events.push({
        date: fmtDate(j._closed || j._added || j.createdAt),
        type: 'Closed',
        title: 'Position Closed',
        company,
        description: `"${title}" marked as closed`
      });
    }

    /* Follow-up events */
    if (j.follow) {
      events.push({
        date: fmtDate(j.follow),
        type: 'Applied',
        title: 'Follow-up Due',
        company,
        description: `Follow up on "${title}"`
      });
    }
  });

  /* Interview events */
  interviews.forEach(iv => {
    events.push({
      date: fmtDate(iv.date),
      type: 'Interview',
      title: `${iv.type || ''} Interview`,
      company: iv.company || 'Unknown',
      description: `${iv.role ? iv.role + ' — ' : ''}${iv.status || 'Scheduled'}${iv.time ? ' at ' + iv.time : ''}`
    });
  });

  /* Sort descending (newest first) */
  events.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  /* --- Filter --- */
  const todayStr = today();
  const weekAgo = today(-7);
  const monthAgo = today(-30);

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:16px">
      <h2 style="margin:0">Application Timeline</h2>
      <div style="display:flex;gap:6px">
        <button class="btn small" data-filter="all" id="filterAll">All</button>
        <button class="btn small" data-filter="week" id="filterWeek">This Week</button>
        <button class="btn small" data-filter="month" id="filterMonth">This Month</button>
      </div>
    </div>

    <div id="timelineWrap"></div>

    <style>
      .tl-line{position:relative;padding:0 0 0 44px;margin-left:16px}
      .tl-line::before{content:'';position:absolute;left:19px;top:0;bottom:0;width:2px;background:var(--color-surface-border)}
      .tl-event{position:relative;margin-bottom:20px;animation:fadeIn 0.2s ease-out backwards;animation-delay:calc(var(--i, 0) * 50ms)}
      .tl-dot{position:absolute;left:-33px;top:6px;width:12px;height:12px;border-radius:50%;border:2px solid var(--color-bg);z-index:1}
      .tl-card{padding:14px 18px;border:1px solid var(--color-surface-border);border-radius:var(--radius-lg);background:var(--color-surface);transition:border-color 0.15s}
      .tl-card:hover{border-color:rgba(212,135,77,0.2)}
      .tl-date{font-size:12px;color:var(--color-muted);margin-bottom:4px;font-weight:500}
      .tl-title{font-weight:600;font-size:15px;color:var(--color-text-heading)}
      .tl-company{font-size:13px;color:var(--color-primary);font-weight:500}
      .tl-desc{font-size:13px;color:var(--color-text-dim);margin-top:4px;line-height:1.5}
    </style>
  `;

  const wrap = container.querySelector('#timelineWrap');

  function renderEvents(filter) {
    let filtered = events;
    if (filter === 'week') {
      filtered = events.filter(e => e.date >= weekAgo && e.date <= todayStr);
    } else if (filter === 'month') {
      filtered = events.filter(e => e.date >= monthAgo && e.date <= todayStr);
    }

    if (filtered.length === 0) {
      wrap.innerHTML = `<div class="empty-state"><div class="empty-state-icon">&#128337;</div><h3>No activity found</h3><p>Add jobs to your tracker to see timeline events</p></div>`;
      return;
    }

    const dotColors = {
      Saved: 'var(--color-primary)',
      Applied: 'var(--color-warning)',
      Interview: 'var(--color-accent)',
      Offer: 'var(--color-success)',
      Closed: 'var(--color-muted)'
    };

    wrap.innerHTML = `
      <div class="tl-line">
        ${filtered.map((ev, i) => {
          const dotColor = dotColors[ev.type] || 'var(--color-muted)';
          const dateLabel = ev.date ? new Date(ev.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown';
          return `
            <div class="tl-event" style="--i:${i}">
              <div class="tl-dot" style="background:${dotColor}"></div>
              <div class="tl-card">
                <div class="tl-date">${escapeHtml(dateLabel)}</div>
                <div class="tl-title">${escapeHtml(ev.title)}</div>
                <div class="tl-company">${escapeHtml(ev.company)}</div>
                ${ev.description ? `<div class="tl-desc">${escapeHtml(ev.description)}</div>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  renderEvents('all');

  /* --- Filter buttons --- */
  container.querySelectorAll('[data-filter]').forEach(btn => {
    btn.onclick = () => {
      container.querySelectorAll('[data-filter]').forEach(b => b.style.opacity = '0.6');
      btn.style.opacity = '1';
      renderEvents(btn.dataset.filter);
    };
  });
  container.querySelector('#filterAll').style.opacity = '1';
  container.querySelector('#filterWeek').style.opacity = '0.6';
  container.querySelector('#filterMonth').style.opacity = '0.6';
}

export default { renderTimeline };
