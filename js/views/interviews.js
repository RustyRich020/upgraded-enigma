/* ============================================================
   views/interviews.js — Interview scheduler + story bank
   ============================================================ */

import { escapeHtml, uid, today } from '../utils.js';
import { toast } from '../components/toast.js';
import { buildCareerProfile, buildInterviewPrep } from '../services/career-ops-lite.js';

function sortInterviews(list) {
  return (list || []).slice().sort((a, b) => {
    const da = `${a.date || ''}T${a.time || '00:00'}`;
    const db = `${b.date || ''}T${b.time || '00:00'}`;
    return da.localeCompare(db);
  });
}

function parseStorySkills(value) {
  return String(value || '')
    .split(',')
    .map(skill => skill.trim().toLowerCase())
    .filter(Boolean);
}

export function renderInterviews(container, state) {
  const interviews = sortInterviews(state.get('interviews') || []);
  const jobs = (state.get('jobs') || []).filter(job => job.id && job.id !== '_meta');
  const stories = state.get('stories') || [];
  const profile = buildCareerProfile({
    resumes: state.get('resumes') || [],
    jobs,
    offers: state.get('offers') || [],
    settings: state.get('settings') || {}
  });
  const todayStr = today();
  const weekAhead = today(7);
  const scheduledCount = interviews.filter(item => item.status === 'Scheduled').length;
  const soonCount = interviews.filter(item => item.status === 'Scheduled' && item.date >= todayStr && item.date <= weekAhead).length;
  const completedCount = interviews.filter(item => item.status === 'Completed').length;
  const jobMap = new Map(jobs.map(job => [job.id, job]));

  container.innerHTML = `
    <div class="section-shell">
      <div class="section-intro">
        <div class="section-title-row">
          <p class="eyebrow">Interview Prep</p>
          <h2>Interviews</h2>
          <p class="section-copy">Schedule interviews, prepare with a structured fit brief, and keep a reusable story bank ready for behavioral rounds.</p>
        </div>
        <div class="action-cluster">
          <button class="btn" id="toggleInterviewForm" type="button">+ Interview</button>
          <button class="btn ghost" id="toggleStoryForm" type="button">+ Story</button>
        </div>
      </div>

      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-value">${scheduledCount}</div>
          <div class="metric-label">Scheduled</div>
          <div class="metric-detail">Active interview loops in progress.</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${soonCount}</div>
          <div class="metric-label">Next 7 Days</div>
          <div class="metric-detail">Upcoming conversations that need prep now.</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${completedCount}</div>
          <div class="metric-label">Completed</div>
          <div class="metric-detail">Rounds already behind you.</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${stories.length}</div>
          <div class="metric-label">Story Bank</div>
          <div class="metric-detail">Reusable proof points for behavioral questions.</div>
        </div>
      </div>

      <div class="grid cols-2">
        <div class="panel stack-md">
          <div id="interviewFormWrap" class="surface-inline hidden">
            <div class="section-title-row">
              <h3>Add Interview</h3>
              <p class="section-copy">Link it to an existing job so the prep brief can use fit scoring and resume overlap.</p>
            </div>
            <div class="inline-form">
              <label class="field-group compact">
                <span class="muted">Date</span>
                <input type="date" class="input" id="intDate" value="${todayStr}">
              </label>
              <label class="field-group compact">
                <span class="muted">Time</span>
                <input type="time" class="input" id="intTime" value="09:00">
              </label>
              <label class="field-group">
                <span class="muted">Job / Company</span>
                ${jobs.length > 0 ? `
                  <select class="input" id="intJob">
                    <option value="">Select a tracked job</option>
                    ${jobs.map(job => `<option value="${job.id}" data-company="${escapeHtml(job.company || '')}" data-role="${escapeHtml(job.title || '')}">${escapeHtml(job.company || 'Unknown')} — ${escapeHtml(job.title || 'No title')}</option>`).join('')}
                    <option value="__custom">Other</option>
                  </select>
                ` : `<input type="text" class="input" id="intCompanyCustom" placeholder="Company name">`}
              </label>
              <label class="field-group compact">
                <span class="muted">Type</span>
                <select class="input" id="intType">
                  <option>Phone</option>
                  <option>Video</option>
                  <option>Onsite</option>
                  <option>Technical</option>
                  <option>Panel</option>
                </select>
              </label>
            </div>
            ${jobs.length > 0 ? `
              <div id="intCustomWrap" class="inline-form hidden">
                <label class="field-group">
                  <span class="muted">Company</span>
                  <input type="text" class="input" id="intCompanyCustom" placeholder="Company name">
                </label>
                <label class="field-group">
                  <span class="muted">Role</span>
                  <input type="text" class="input" id="intRoleCustom" placeholder="Role title">
                </label>
              </div>
            ` : `
              <div class="inline-form">
                <label class="field-group">
                  <span class="muted">Role</span>
                  <input type="text" class="input" id="intRoleCustom" placeholder="Role title">
                </label>
              </div>
            `}
            <label class="field-group">
              <span class="muted">Prep Notes</span>
              <textarea class="input" id="intNotes" rows="3" placeholder="Research topics, people to ask about, or gaps to prepare for..."></textarea>
            </label>
            <div class="action-cluster">
              <button class="btn brand" id="saveInterview" type="button">Save Interview</button>
              <button class="btn ghost" id="cancelInterview" type="button">Cancel</button>
            </div>
          </div>

          <div class="section-title-row">
            <h3>Interview Queue</h3>
            <p class="section-copy">Each entry now includes a quick prep brief driven by fit score and your story bank.</p>
          </div>
          <div class="stack-md" id="interviewList">
            ${interviews.length
              ? interviews.map(interview => renderInterviewCard(interview, jobMap.get(interview.jobId), stories, profile)).join('')
              : '<div class="empty-inline">No interviews scheduled yet. Add one to generate a prep brief automatically.</div>'
            }
          </div>
        </div>

        <div class="panel stack-md">
          <div id="storyFormWrap" class="surface-inline hidden">
            <div class="section-title-row">
              <h3>Add Story</h3>
              <p class="section-copy">Capture one strong STAR-style example with the skills it proves.</p>
            </div>
            <div class="inline-form">
              <label class="field-group">
                <span class="muted">Story Title</span>
                <input class="input" id="storyTitle" placeholder="Scaled a workflow, launched a migration, improved a metric..." />
              </label>
              <label class="field-group">
                <span class="muted">Skills (comma-separated)</span>
                <input class="input" id="storySkills" placeholder="python, leadership, experimentation" />
              </label>
            </div>
            <label class="field-group">
              <span class="muted">Situation / Task</span>
              <textarea class="input" id="storySituation" rows="3" placeholder="What was the challenge or context?"></textarea>
            </label>
            <label class="field-group">
              <span class="muted">Action / Result</span>
              <textarea class="input" id="storyAction" rows="3" placeholder="What did you do, and what changed because of it?"></textarea>
            </label>
            <div class="action-cluster">
              <button class="btn brand" id="saveStory" type="button">Save Story</button>
              <button class="btn ghost" id="cancelStory" type="button">Cancel</button>
            </div>
          </div>

          <div class="section-title-row">
            <h3>Story Bank</h3>
            <p class="section-copy">Keep concise proof points ready so interview prep becomes selection, not reinvention.</p>
          </div>
          <div class="stack-md" id="storyList">
            ${stories.length
              ? stories.map(story => renderStoryCard(story)).join('')
              : '<div class="empty-inline">No stories yet. Add 3 to 5 great examples and your interview prep gets much faster.</div>'
            }
          </div>
        </div>
      </div>
    </div>
  `;

  const interviewFormWrap = container.querySelector('#interviewFormWrap');
  const storyFormWrap = container.querySelector('#storyFormWrap');
  const customWrap = container.querySelector('#intCustomWrap');
  const jobSelect = container.querySelector('#intJob');

  container.querySelector('#toggleInterviewForm')?.addEventListener('click', () => {
    interviewFormWrap?.classList.toggle('hidden');
  });
  container.querySelector('#cancelInterview')?.addEventListener('click', () => {
    interviewFormWrap?.classList.add('hidden');
  });
  container.querySelector('#toggleStoryForm')?.addEventListener('click', () => {
    storyFormWrap?.classList.toggle('hidden');
  });
  container.querySelector('#cancelStory')?.addEventListener('click', () => {
    storyFormWrap?.classList.add('hidden');
  });

  if (jobSelect && customWrap) {
    jobSelect.addEventListener('change', () => {
      customWrap.classList.toggle('hidden', jobSelect.value !== '__custom');
    });
  }

  container.querySelector('#saveInterview')?.addEventListener('click', () => {
    const date = container.querySelector('#intDate')?.value;
    const time = container.querySelector('#intTime')?.value || '';
    const type = container.querySelector('#intType')?.value || 'Phone';
    const notes = container.querySelector('#intNotes')?.value || '';
    let company = '';
    let role = '';
    let jobId = '';

    if (jobSelect && jobSelect.value && jobSelect.value !== '__custom') {
      jobId = jobSelect.value;
      const selected = jobSelect.selectedOptions[0];
      company = selected?.dataset.company || '';
      role = selected?.dataset.role || '';
    } else {
      company = (container.querySelector('#intCompanyCustom')?.value || '').trim();
      role = (container.querySelector('#intRoleCustom')?.value || '').trim();
    }

    if (!date || !company) {
      toast('Date and company are required', 'error');
      return;
    }

    const nextInterviews = state.get('interviews') || [];
    nextInterviews.push({
      id: uid(),
      jobId,
      company,
      role,
      date,
      time,
      type,
      notes,
      status: 'Scheduled',
      createdAt: new Date().toISOString()
    });
    state.set('interviews', nextInterviews);
    toast('Interview added', 'success');
    renderInterviews(container, state);
  });

  container.querySelector('#saveStory')?.addEventListener('click', () => {
    const title = (container.querySelector('#storyTitle')?.value || '').trim();
    const skills = parseStorySkills(container.querySelector('#storySkills')?.value || '');
    const situation = (container.querySelector('#storySituation')?.value || '').trim();
    const action = (container.querySelector('#storyAction')?.value || '').trim();

    if (!title || !action) {
      toast('Story title and action/result are required', 'error');
      return;
    }

    const nextStories = state.get('stories') || [];
    nextStories.push({
      id: uid(),
      title,
      skills,
      situation,
      action,
      createdAt: new Date().toISOString()
    });
    state.set('stories', nextStories);
    toast('Story saved', 'success');
    renderInterviews(container, state);
  });

  container.querySelector('#interviewList')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-act]');
    if (!button) return;
    const id = button.dataset.id;
    const action = button.dataset.act;
    const list = state.get('interviews') || [];
    const current = list.find(item => item.id === id);
    if (!current) return;

    if (action === 'complete') current.status = 'Completed';
    if (action === 'cancel') current.status = 'Cancelled';
    if (action === 'toggle-notes') current.showNotes = !current.showNotes;
    state.set('interviews', [...list]);
    toast(action === 'toggle-notes' ? 'Notes toggled' : 'Interview updated', action === 'cancel' ? 'info' : 'success');
    renderInterviews(container, state);
  });

  container.querySelector('#storyList')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-act="delete-story"]');
    if (!button) return;
    const nextStories = (state.get('stories') || []).filter(story => story.id !== button.dataset.id);
    state.set('stories', nextStories);
    toast('Story removed', 'info');
    renderInterviews(container, state);
  });
}

function renderInterviewCard(interview, job, stories, profile) {
  const prep = buildInterviewPrep(interview, job || interview, stories, profile);
  const isScheduled = interview.status === 'Scheduled';
  const storyPreview = prep.storyMatches.length
    ? prep.storyMatches.map(story => `<span class="chip">${escapeHtml(story.title)}</span>`).join('')
    : '<span class="muted">No strong story match yet</span>';

  return `
    <div class="prep-card">
      <div class="section-intro">
        <div class="section-title-row">
          <h3>${escapeHtml(interview.company)}</h3>
          <p class="section-copy">${escapeHtml(interview.role || job?.title || '')}</p>
        </div>
        <div class="action-cluster">
          <span class="fit-grade fit-grade-${prep.evaluation.grade.toLowerCase()}">${escapeHtml(prep.evaluation.grade)} · ${prep.evaluation.score}%</span>
          <span class="chip">${escapeHtml(interview.type || 'Interview')}</span>
          <span class="chip">${escapeHtml(interview.status || 'Scheduled')}</span>
        </div>
      </div>
      <div class="story-meta">
        <span class="chip">Date: ${escapeHtml(interview.date || '')}</span>
        ${interview.time ? `<span class="chip">Time: ${escapeHtml(interview.time)}</span>` : ''}
        ${job?.fitGrade ? `<span class="chip">Saved Fit: ${escapeHtml(job.fitGrade)}</span>` : ''}
      </div>
      <div class="story-grid">
        <div>
          <strong>Prep focus</strong>
          <div class="fit-chip-row" style="margin-top:6px;">
            ${prep.focusAreas.map(area => `<span class="chip chip-risk">${escapeHtml(area)}</span>`).join('')}
          </div>
        </div>
        <div>
          <strong>Likely questions</strong>
          <ul class="prep-list">
            ${prep.likelyQuestions.map(question => `<li>${escapeHtml(question)}</li>`).join('')}
          </ul>
        </div>
        <div>
          <strong>Story matches</strong>
          <div class="fit-chip-row" style="margin-top:6px;">${storyPreview}</div>
        </div>
        <div>
          <strong>Talking points</strong>
          <ul class="prep-list">
            ${prep.talkingPoints.map(point => `<li>${escapeHtml(point)}</li>`).join('')}
          </ul>
        </div>
        ${interview.notes ? `
          <div>
            <strong>Notes</strong>
            <p class="muted" style="margin-top:6px;">${escapeHtml(interview.notes)}</p>
          </div>
        ` : ''}
      </div>
      <div class="action-cluster">
        ${isScheduled ? `<button class="btn small" data-act="complete" data-id="${interview.id}" type="button">Complete</button>` : ''}
        ${isScheduled ? `<button class="btn small ghost" data-act="cancel" data-id="${interview.id}" type="button">Cancel</button>` : ''}
      </div>
    </div>
  `;
}

function renderStoryCard(story) {
  return `
    <div class="story-card">
      <div class="section-intro">
        <div class="section-title-row">
          <h3>${escapeHtml(story.title || 'Untitled story')}</h3>
        </div>
        <button class="btn danger small" data-act="delete-story" data-id="${story.id}" type="button">Delete</button>
      </div>
      ${story.skills?.length ? `
        <div class="fit-chip-row">
          ${story.skills.map(skill => `<span class="chip chip-strong">${escapeHtml(skill)}</span>`).join('')}
        </div>
      ` : ''}
      ${story.situation ? `
        <div>
          <strong>Situation</strong>
          <p class="muted" style="margin-top:6px;">${escapeHtml(story.situation)}</p>
        </div>
      ` : ''}
      <div>
        <strong>Action / Result</strong>
        <p class="muted" style="margin-top:6px;">${escapeHtml(story.action || '')}</p>
      </div>
    </div>
  `;
}

export default { renderInterviews };
