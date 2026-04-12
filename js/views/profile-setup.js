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

/* Role-to-skill suggestion map for smarter skill step */
const ROLE_SKILL_MAP = {
  'Software Engineer': ['javascript', 'python', 'react', 'aws', 'docker', 'sql', 'git'],
  'Data Analyst': ['sql', 'python', 'excel', 'tableau', 'power bi', 'statistics'],
  'Security Analyst': ['firewall', 'siem', 'linux', 'python', 'networking', 'incident response'],
  'Network Engineer': ['cisco', 'firewall', 'tcp/ip', 'linux', 'aws', 'vpn'],
  'DevOps Engineer': ['docker', 'kubernetes', 'aws', 'terraform', 'ci/cd', 'linux', 'python'],
  'Project Manager': ['agile', 'scrum', 'jira', 'stakeholder management', 'risk management'],
  'Product Manager': ['roadmapping', 'agile', 'sql', 'analytics', 'user research', 'a/b testing'],
  'UX Designer': ['figma', 'user research', 'prototyping', 'wireframing', 'accessibility', 'css'],
};

function getSkillSuggestionsForRoles(roles) {
  const suggestions = new Set();
  roles.forEach(role => {
    const key = Object.keys(ROLE_SKILL_MAP).find(k => role.toLowerCase().includes(k.toLowerCase()));
    if (key) ROLE_SKILL_MAP[key].forEach(s => suggestions.add(s));
  });
  // Fallback generic suggestions if no match
  if (suggestions.size === 0) {
    ['sql', 'python', 'excel', 'aws', 'javascript', 'docker', 'linux', 'agile'].forEach(s => suggestions.add(s));
  }
  return [...suggestions];
}

const STEPS = [
  { id: 'roles-experience', question: 'What are you looking for?', type: 'composite' },
  { id: 'location-salary', question: 'Where do you want to work?', type: 'composite' },
  { id: 'skills', question: 'What are your top skills?', type: 'tags' },
  { id: 'confirm', question: 'Almost there!', type: 'confirm' },
];

export function renderProfileSetup(container, state, onComplete) {
  const authUser = getCurrentUser();
  const defaultName = authUser?.displayName || (authUser?.email ? authUser.email.split('@')[0] : '');

  const profile = {
    country: 'us',
    targetRoles: [],
    location: '',
    remote: false,
    experienceLevel: '',
    skills: [],
    minSalary: '',
    name: defaultName || 'there',
    theme: 'default',
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
          ${s.type !== 'confirm' ? '<button class="onb-continue" id="onbNext">Continue →</button>' : '<div></div>'}
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

        /* Experience inline selector */
        .onb-exp-selector { display: flex; gap: 8px; }
        .onb-exp-card {
          flex: 1; padding: 12px 8px; border: 2px solid var(--color-surface-border);
          border-radius: 12px; background: var(--color-surface); cursor: pointer;
          transition: all 0.15s; text-align: center; font-family: var(--font-body);
        }
        .onb-exp-card:hover { border-color: var(--color-primary); background: var(--color-primary-subtle); }
        .onb-exp-card.selected { border-color: var(--color-primary); background: var(--color-primary-dim); }
        .onb-exp-label { display: block; font-size: 14px; font-weight: 600; color: var(--color-text); }
        .onb-exp-sub { display: block; font-size: 11px; color: var(--color-muted); margin-top: 2px; }

        /* Confirm summary */
        .onb-confirm-summary {
          background: var(--color-bg-secondary); border: 1px solid var(--color-surface-border);
          border-radius: 12px; padding: 24px; margin-bottom: 8px;
        }

        @media (max-width: 600px) {
          .onb-card { padding: 24px 20px; }
          .onb-question { font-size: 22px; }
          .onb-exp-selector { flex-wrap: wrap; }
          .onb-exp-card { min-width: calc(50% - 4px); }
        }
      </style>
    `;

    bindEvents(s, profile, container);
    container.querySelector('#onbNext')?.addEventListener('click', () => {
      // Validate: require at least one role before advancing past the roles+experience step
      if (s.id === 'roles-experience' && profile.targetRoles.length === 0) {
        const input = container.querySelector('#onbRoleInput');
        if (input) {
          input.style.borderColor = 'var(--color-danger)';
          input.setAttribute('placeholder', 'Please add at least one role');
          input.focus();
        }
        toast('Please add at least one target role before continuing.', 'error');
        return;
      }
      container._onbAdvance();
    });
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
      localStorage.setItem('jobsynk_checklist', JSON.stringify({ accountCreated: true, profileSetup: true, firstJobAdded: false, firstSearch: false, apiKeyConnected: false, resumeUploaded: false, dismissed: false }));
      // Auto-search: store query so first dashboard load redirects to find-jobs
      const searchQuery = profile.targetRoles.slice(0, 2).join(' ');
      localStorage.setItem('jobsynk_auto_search', searchQuery);
      if (onComplete) onComplete();
      navigate('dashboard');
    }, 3000);
  }

  render();
}

function renderStepContent(s, p) {
  switch (s.id) {
    case 'roles-experience': return `
      <div class="onb-tags" id="onbRoleTags">${p.targetRoles.map(r => `<span class="onb-tag">${escapeHtml(r)}<button data-rm="${escapeHtml(r)}">&times;</button></span>`).join('')}</div>
      <input class="onb-input" id="onbRoleInput" placeholder="Type a job title and press Enter" autofocus>
      <div class="onb-suggestions" id="onbRoleSuggestions">
        ${['Security Analyst', 'Data Analyst', 'Software Engineer', 'Network Engineer', 'DevOps Engineer', 'Project Manager', 'Product Manager', 'UX Designer'].filter(r => !p.targetRoles.includes(r)).map(r => `<button class="onb-suggest" data-s="${r}">${r}</button>`).join('')}
      </div>
      <div style="margin-top:20px;">
        <div style="font-size:14px;font-weight:600;color:var(--color-text-dim);margin-bottom:10px;">Experience level</div>
        <div class="onb-exp-selector">
          ${[
            { v: 'entry', label: 'Entry', sub: '0-2 yr' },
            { v: 'mid', label: 'Mid', sub: '3-5 yr' },
            { v: 'senior', label: 'Senior', sub: '6-10 yr' },
            { v: 'lead', label: 'Lead', sub: '10+ yr' },
          ].map(o => `
            <button class="onb-exp-card ${p.experienceLevel === o.v ? 'selected' : ''}" data-exp="${o.v}">
              <span class="onb-exp-label">${o.label}</span>
              <span class="onb-exp-sub">${o.sub}</span>
            </button>
          `).join('')}
        </div>
      </div>`;

    case 'location-salary': return `
      <input class="onb-input" id="onbLocation" placeholder="City, state, or country" value="${escapeHtml(p.location)}">
      <label class="onb-toggle" id="onbRemoteToggle">
        <input type="checkbox" id="onbRemote" ${p.remote ? 'checked' : ''}>
        <div>
          <div class="onb-toggle-label">Open to remote work</div>
          <div class="onb-toggle-sub">Include remote positions in your search</div>
        </div>
      </label>
      <div style="margin-top:14px;">
        <label style="font-size:14px;font-weight:600;color:var(--color-text-dim);display:block;margin-bottom:8px;">Minimum salary (optional)</label>
        <input class="onb-input" id="onbMinSalary" type="number" placeholder="e.g. 80000" value="${p.minSalary || ''}">
      </div>`;

    case 'skills': {
      const smartSuggestions = getSkillSuggestionsForRoles(p.targetRoles);
      return `
      <div class="onb-tags" id="onbSkillTags">${p.skills.map(sk => `<span class="onb-tag">${escapeHtml(sk)}<button data-rm="${escapeHtml(sk)}">&times;</button></span>`).join('')}</div>
      <input class="onb-input" id="onbSkillInput" placeholder="Type a skill and press Enter" autofocus>
      <div class="onb-suggestions" id="onbSkillSuggestions">
        ${smartSuggestions.filter(sk => !p.skills.includes(sk)).map(sk => `<button class="onb-suggest" data-s="${sk}">${sk}</button>`).join('')}
      </div>`;
    }

    case 'confirm': {
      const rolesList = p.targetRoles.length ? p.targetRoles.join(', ') : 'any role';
      const loc = p.location || 'anywhere';
      const skillsList = p.skills.length ? p.skills.join(', ') : 'all skills';
      return `
      <div class="onb-confirm-summary">
        <p style="font-size:17px;line-height:1.6;color:var(--color-text);">
          We'll search for <strong>${escapeHtml(rolesList)}</strong>
          in <strong>${escapeHtml(loc)}</strong>${p.remote ? ' + remote' : ''}
          matching <strong>${escapeHtml(skillsList)}</strong>${p.experienceLevel ? ` at <strong>${escapeHtml(p.experienceLevel)}</strong> level` : ''}${p.minSalary ? ` from <strong>$${Number(p.minSalary).toLocaleString()}</strong>+` : ''}.
        </p>
      </div>
      <button class="onb-continue" id="onbLaunchSearch" style="width:100%;margin-top:20px;font-size:18px;padding:18px 32px;">
        Start searching →
      </button>`;
    }

    default: return '';
  }
}

function bindEvents(s, p, container) {
  // Step 1: Roles + Experience combined
  if (s.id === 'roles-experience') {
    // Role tag input
    const input = container.querySelector('#onbRoleInput');
    input?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && input.value.trim()) {
        const val = input.value.trim();
        if (!p.targetRoles.includes(val)) p.targetRoles.push(val);
        input.value = '';
        refreshTags(container, '#onbRoleTags', p.targetRoles);
      }
    });
    container.querySelectorAll('#onbRoleSuggestions .onb-suggest').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!p.targetRoles.includes(btn.dataset.s)) p.targetRoles.push(btn.dataset.s);
        btn.remove();
        refreshTags(container, '#onbRoleTags', p.targetRoles);
      });
    });
    bindTagRemoval(container, '#onbRoleTags', p.targetRoles);

    // Experience level inline selector
    container.querySelectorAll('.onb-exp-card').forEach(btn => {
      btn.addEventListener('click', () => {
        p.experienceLevel = btn.dataset.exp;
        container.querySelectorAll('.onb-exp-card').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });
  }

  // Step 2: Location + Remote + Salary
  if (s.id === 'location-salary') {
    container.querySelector('#onbLocation')?.addEventListener('input', e => { p.location = e.target.value; });
    container.querySelector('#onbRemote')?.addEventListener('change', e => { p.remote = e.target.checked; });
    container.querySelector('#onbMinSalary')?.addEventListener('input', e => { p.minSalary = e.target.value; });
  }

  // Step 3: Skills
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
    container.querySelectorAll('#onbSkillSuggestions .onb-suggest').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!p.skills.includes(btn.dataset.s)) p.skills.push(btn.dataset.s);
        btn.remove();
        refreshTags(container, '#onbSkillTags', p.skills);
      });
    });
    bindTagRemoval(container, '#onbSkillTags', p.skills);
  }

  // Step 4: Confirm — launch search button triggers finish
  if (s.id === 'confirm') {
    container.querySelector('#onbLaunchSearch')?.addEventListener('click', () => {
      container._onbAdvance();
    });
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
