/* ============================================================
   views/profile-setup.js — JobLand-style onboarding wizard
   Clean white cards, one question per step, auto-advance on
   card selection, tag inputs, large typography.
   ============================================================ */

import { escapeHtml } from '../utils.js';
import { STORAGE_KEYS } from '../config.js';
import { navigate } from '../router.js';
import { getCurrentUser } from '../firebase/auth.js';
import { provisionUser, isProvisioned } from '../firebase/provisioning.js';
import { toast } from '../components/toast.js';

const STEPS = [
  { id: 'country', question: 'Are you based in the United States?', type: 'choice' },
  { id: 'status', question: "What's your current employment status?", type: 'choice' },
  { id: 'roles', question: 'What roles are you looking for?', type: 'tags' },
  { id: 'location', question: 'Where do you want to work?', type: 'input' },
  { id: 'experience', question: "What's your experience level?", type: 'choice' },
  { id: 'skills', question: 'What are your top skills?', type: 'tags' },
  { id: 'name', question: "What's your name?", type: 'input' },
];

export function renderProfileSetup(container, state, onComplete) {
  const authUser = getCurrentUser();
  const defaultName = authUser?.displayName || (authUser?.email ? authUser.email.split('@')[0] : '');

  const profile = {
    country: 'us',
    status: '',
    targetRoles: [],
    location: '',
    remote: false,
    experienceLevel: '',
    skills: [],
    name: defaultName,
    theme: 'tron',
  };

  let step = 0;

  // Expose advance function for auto-advancing choice steps
  container._onbAdvance = () => { step++; if (step >= STEPS.length) finish(); else render(); };
  container._onbBack = () => { if (step > 0) { step--; render(); } };

  function render() {
    const s = STEPS[step];
    const pct = Math.round(((step + 1) / STEPS.length) * 100);

    container.innerHTML = `
      <div class="onb-wrapper">
        <!-- Progress -->
        <div class="onb-progress">
          <div class="onb-progress-bar" style="width:${pct}%"></div>
        </div>
        <div class="onb-step-label">Step ${step + 1} of ${STEPS.length}</div>

        <!-- Question -->
        <div class="onb-card" style="animation:fadeIn 0.2s ease-out;">
          <h1 class="onb-question">${s.question}</h1>
          <div class="onb-content">${renderStepContent(s, profile)}</div>
        </div>

        <!-- Navigation -->
        <div class="onb-nav">
          ${step > 0 ? '<button class="onb-back" id="onbBack">← Back</button>' : '<div></div>'}
          ${s.type === 'tags' || s.type === 'input' ? '<button class="onb-continue" id="onbNext">Continue →</button>' : '<div></div>'}
        </div>
      </div>

      <style>
        .onb-wrapper { max-width: 560px; margin: 0 auto; padding: 24px 16px; }
        .onb-progress { height: 4px; background: var(--color-surface-border); border-radius: 99px; margin-bottom: 8px; overflow: hidden; }
        .onb-progress-bar { height: 100%; background: var(--color-accent, #2D8B5F); border-radius: 99px; transition: width 0.4s cubic-bezier(0.16,1,0.3,1); }
        .onb-step-label { font-size: 13px; color: var(--color-muted); margin-bottom: 32px; }
        .onb-card { background: var(--color-surface); border: 1px solid var(--color-surface-border); border-radius: 16px; padding: 36px 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
        .onb-question { font-family: var(--font-display); font-size: 26px; font-weight: 700; color: var(--color-text-heading); line-height: 1.3; margin-bottom: 28px; }
        .onb-content { }

        /* Choice cards */
        .onb-choices { display: grid; gap: 10px; }
        .onb-choice {
          display: flex; align-items: center; gap: 14px;
          padding: 16px 20px; border: 2px solid var(--color-surface-border);
          border-radius: 12px; background: var(--color-surface);
          cursor: pointer; transition: all 0.15s; font-size: 16px;
          font-weight: 500; color: var(--color-text); text-align: left; width: 100%;
          font-family: var(--font-body);
        }
        .onb-choice:hover { border-color: var(--color-primary); background: var(--color-primary-subtle); }
        .onb-choice.selected { border-color: var(--color-primary); background: var(--color-primary-dim); }
        .onb-choice-icon { font-size: 24px; flex-shrink: 0; }
        .onb-choice-text { flex: 1; }
        .onb-choice-sub { font-size: 13px; color: var(--color-muted); margin-top: 2px; font-weight: 400; }

        /* Tag input */
        .onb-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; min-height: 20px; }
        .onb-tag {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 14px; background: var(--color-primary-dim); border: 1px solid var(--color-primary);
          border-radius: 99px; font-size: 14px; font-weight: 500; color: var(--color-primary);
        }
        .onb-tag button { background: none; border: none; color: var(--color-primary); cursor: pointer; font-size: 16px; padding: 0; }
        .onb-input {
          width: 100%; padding: 14px 18px; border: 2px solid var(--color-surface-border);
          border-radius: 12px; font-size: 16px; font-family: var(--font-body);
          color: var(--color-text); background: var(--color-bg);
          transition: border-color 0.15s;
        }
        .onb-input:focus { outline: none; border-color: var(--color-primary); }
        .onb-input::placeholder { color: var(--color-muted); }

        /* Suggestions */
        .onb-suggestions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
        .onb-suggest {
          padding: 6px 14px; border: 1px solid var(--color-surface-border);
          border-radius: 99px; font-size: 13px; color: var(--color-text-dim);
          cursor: pointer; background: var(--color-bg); transition: all 0.15s;
          font-family: var(--font-body);
        }
        .onb-suggest:hover { border-color: var(--color-primary); color: var(--color-primary); }

        /* Remote toggle */
        .onb-toggle {
          display: flex; align-items: center; gap: 12px; margin-top: 14px;
          padding: 14px 18px; border: 2px solid var(--color-surface-border);
          border-radius: 12px; cursor: pointer; transition: border-color 0.15s;
        }
        .onb-toggle:hover { border-color: var(--color-accent); }
        .onb-toggle input { width: 20px; height: 20px; accent-color: var(--color-accent); }
        .onb-toggle-label { font-size: 15px; font-weight: 500; color: var(--color-text); }
        .onb-toggle-sub { font-size: 12px; color: var(--color-muted); }

        /* Navigation */
        .onb-nav { display: flex; justify-content: space-between; margin-top: 20px; }
        .onb-back {
          background: none; border: none; color: var(--color-muted);
          font-size: 15px; cursor: pointer; font-family: var(--font-body);
          font-weight: 500; padding: 10px 0;
        }
        .onb-back:hover { color: var(--color-text); }
        .onb-continue {
          background: var(--color-primary); color: #fff; border: none;
          padding: 14px 32px; border-radius: 12px; font-size: 16px;
          font-weight: 600; cursor: pointer; font-family: var(--font-body);
          transition: background 0.15s;
        }
        .onb-continue:hover { background: var(--color-primary-bright); }

        @media (max-width: 600px) {
          .onb-card { padding: 24px 20px; }
          .onb-question { font-size: 22px; }
        }
      </style>
    `;

    bindEvents(s, profile, container);
    container.querySelector('#onbNext')?.addEventListener('click', () => container._onbAdvance());
  }

  function finish() {
    container.innerHTML = `
      <div class="onb-wrapper" style="text-align:center;padding-top:60px;">
        <div class="spinner" style="width:28px;height:28px;margin:0 auto 20px;border-width:3px;"></div>
        <h2 style="font-family:var(--font-display);margin-bottom:8px;">Setting up your profile...</h2>
        <p class="muted" id="onbStatus">Creating your career profile</p>
      </div>
    `;
    const el = container.querySelector('#onbStatus');
    const msgs = ['Creating your career profile', 'Configuring job search', 'Personalizing your dashboard', 'Almost ready...'];
    let i = 0;
    const iv = setInterval(() => { i++; if (el && i < msgs.length) el.textContent = msgs[i]; }, 700);
    setTimeout(async () => {
      clearInterval(iv);
      const settings = state.get('settings') || {};
      settings.name = profile.name;
      settings.role = 'Candidate';
      settings.targetRoles = profile.targetRoles;
      settings.searchKeywords = profile.targetRoles.join(', ');
      settings.searchLocation = profile.location;
      settings.remote = profile.remote;
      settings.experienceLevel = profile.experienceLevel;
      settings.skills = profile.skills;
      state.set('settings', settings);
      state.set('role', 'Candidate');
      try { const u = getCurrentUser(); if (u && profile.name) u.updateProfile({ displayName: profile.name }); } catch {}
      try { if (!(await isProvisioned())) await provisionUser({ name: profile.name, role: 'Candidate', theme: profile.theme }, true); } catch {}
      localStorage.setItem(STORAGE_KEYS.onboarded, 'true');
      localStorage.setItem('tron_checklist', JSON.stringify({ accountCreated: true, profileSetup: true, firstJobAdded: false, firstSearch: false, apiKeyConnected: false, resumeUploaded: false, dismissed: false }));
      if (onComplete) onComplete();
      navigate('dashboard');
    }, 3000);
  }

  render();
}

function renderStepContent(s, p) {
  switch (s.id) {
    case 'country': return `
      <div class="onb-choices">
        <button class="onb-choice ${p.country === 'us' ? 'selected' : ''}" data-value="us">
          <span class="onb-choice-icon">🇺🇸</span>
          <span class="onb-choice-text">Yes, I'm in the US</span>
        </button>
        <button class="onb-choice ${p.country === 'other' ? 'selected' : ''}" data-value="other">
          <span class="onb-choice-icon">🌍</span>
          <span class="onb-choice-text">No, I'm outside the US</span>
        </button>
      </div>`;

    case 'status': return `
      <div class="onb-choices">
        ${[
          { v: 'unemployed', icon: '🔍', label: 'Actively looking', sub: 'Currently unemployed' },
          { v: 'employed-looking', icon: '👀', label: 'Employed, looking', sub: 'Open to new opportunities' },
          { v: 'employed-passive', icon: '💼', label: 'Employed, not looking', sub: 'Just exploring' },
          { v: 'student', icon: '🎓', label: 'Student / New grad', sub: 'Entering the job market' },
        ].map(o => `
          <button class="onb-choice ${p.status === o.v ? 'selected' : ''}" data-value="${o.v}">
            <span class="onb-choice-icon">${o.icon}</span>
            <div class="onb-choice-text">${o.label}<div class="onb-choice-sub">${o.sub}</div></div>
          </button>
        `).join('')}
      </div>`;

    case 'roles': return `
      <div class="onb-tags" id="onbRoleTags">${p.targetRoles.map(r => `<span class="onb-tag">${escapeHtml(r)}<button data-rm="${escapeHtml(r)}">&times;</button></span>`).join('')}</div>
      <input class="onb-input" id="onbRoleInput" placeholder="Type a job title and press Enter" autofocus>
      <div class="onb-suggestions" id="onbRoleSuggestions">
        ${['Security Analyst', 'Data Analyst', 'Software Engineer', 'Network Engineer', 'DevOps Engineer', 'Project Manager', 'Product Manager', 'UX Designer'].filter(r => !p.targetRoles.includes(r)).map(r => `<button class="onb-suggest" data-s="${r}">${r}</button>`).join('')}
      </div>`;

    case 'location': return `
      <input class="onb-input" id="onbLocation" placeholder="City, state, or country" value="${escapeHtml(p.location)}">
      <label class="onb-toggle" id="onbRemoteToggle">
        <input type="checkbox" id="onbRemote" ${p.remote ? 'checked' : ''}>
        <div>
          <div class="onb-toggle-label">Open to remote work</div>
          <div class="onb-toggle-sub">Include remote positions in your search</div>
        </div>
      </label>`;

    case 'experience': return `
      <div class="onb-choices">
        ${[
          { v: 'entry', icon: '🌱', label: 'Entry Level', sub: '0–2 years' },
          { v: 'mid', icon: '📈', label: 'Mid Level', sub: '3–5 years' },
          { v: 'senior', icon: '⭐', label: 'Senior', sub: '6–10 years' },
          { v: 'lead', icon: '🏆', label: 'Lead / Manager', sub: '10+ years' },
        ].map(o => `
          <button class="onb-choice ${p.experienceLevel === o.v ? 'selected' : ''}" data-value="${o.v}">
            <span class="onb-choice-icon">${o.icon}</span>
            <div class="onb-choice-text">${o.label}<div class="onb-choice-sub">${o.sub}</div></div>
          </button>
        `).join('')}
      </div>`;

    case 'skills': return `
      <div class="onb-tags" id="onbSkillTags">${p.skills.map(s => `<span class="onb-tag">${escapeHtml(s)}<button data-rm="${escapeHtml(s)}">&times;</button></span>`).join('')}</div>
      <input class="onb-input" id="onbSkillInput" placeholder="Type a skill and press Enter" autofocus>
      <div class="onb-suggestions" id="onbSkillSuggestions">
        ${['SQL', 'Python', 'Excel', 'AWS', 'JavaScript', 'Docker', 'Linux', 'PowerShell', 'Tableau', 'Agile', 'Firewall', 'Cisco'].filter(s => !p.skills.includes(s.toLowerCase())).map(s => `<button class="onb-suggest" data-s="${s.toLowerCase()}">${s}</button>`).join('')}
      </div>`;

    case 'name':
      return `<input class="onb-input" id="onbName" placeholder="Your full name" value="${escapeHtml(p.name)}" autofocus>`;

    default: return '';
  }
}

function bindEvents(s, p, container) {
  // Choice cards — click to select + auto-advance after 300ms
  if (s.type === 'choice') {
    container.querySelectorAll('.onb-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        if (s.id === 'country') p.country = btn.dataset.value;
        if (s.id === 'status') p.status = btn.dataset.value;
        if (s.id === 'experience') p.experienceLevel = btn.dataset.value;
        container.querySelectorAll('.onb-choice').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        setTimeout(() => container._onbAdvance(), 300);
      });
    });
  }

  // Tag inputs
  if (s.id === 'roles') {
    const input = container.querySelector('#onbRoleInput');
    input?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && input.value.trim()) {
        const val = input.value.trim();
        if (!p.targetRoles.includes(val)) p.targetRoles.push(val);
        input.value = '';
        refreshTags(container, '#onbRoleTags', p.targetRoles);
      }
    });
    container.querySelectorAll('.onb-suggest').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!p.targetRoles.includes(btn.dataset.s)) p.targetRoles.push(btn.dataset.s);
        btn.remove();
        refreshTags(container, '#onbRoleTags', p.targetRoles);
      });
    });
    bindTagRemoval(container, '#onbRoleTags', p.targetRoles);
  }

  if (s.id === 'skills') {
    const input = container.querySelector('#onbSkillInput');
    input?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && input.value.trim()) {
        const val = input.value.trim().toLowerCase();
        if (!p.skills.includes(val)) p.skills.push(val);
        input.value = '';
        refreshTags(container, '#onbSkillTags', p.skills);
      }
    });
    container.querySelectorAll('.onb-suggest').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!p.skills.includes(btn.dataset.s)) p.skills.push(btn.dataset.s);
        btn.remove();
        refreshTags(container, '#onbSkillTags', p.skills);
      });
    });
    bindTagRemoval(container, '#onbSkillTags', p.skills);
  }

  // Input fields
  if (s.id === 'location') {
    container.querySelector('#onbLocation')?.addEventListener('input', e => { p.location = e.target.value; });
    container.querySelector('#onbRemote')?.addEventListener('change', e => { p.remote = e.target.checked; });
  }
  if (s.id === 'name') {
    container.querySelector('#onbName')?.addEventListener('input', e => { p.name = e.target.value; });
  }

  // Back button also uses the exposed function
  container.querySelector('#onbBack')?.addEventListener('click', () => container._onbBack());
}

function refreshTags(container, selector, items) {
  const el = container.querySelector(selector);
  if (!el) return;
  el.innerHTML = items.map(item => `<span class="onb-tag">${escapeHtml(item)}<button data-rm="${escapeHtml(item)}">&times;</button></span>`).join('');
  bindTagRemoval(container, selector, items);
}

function bindTagRemoval(container, selector, items) {
  container.querySelector(selector)?.querySelectorAll('[data-rm]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = items.indexOf(btn.dataset.rm);
      if (idx >= 0) items.splice(idx, 1);
      refreshTags(container, selector, items);
    });
  });
}

export default { renderProfileSetup };
