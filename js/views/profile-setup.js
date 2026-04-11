/* ============================================================
   views/profile-setup.js — Conversational onboarding wizard
   JobLand-inspired: one question per step, progressive profile
   building, tag inputs, personalized results at the end.
   ============================================================ */

import { escapeHtml } from '../utils.js';
import { ROLES, STORAGE_KEYS } from '../config.js';
import { navigate } from '../router.js';
import { getCurrentUser } from '../firebase/auth.js';
import { provisionUser, isProvisioned } from '../firebase/provisioning.js';
import { toast } from '../components/toast.js';

const TOTAL_STEPS = 7;

export function renderProfileSetup(container, state, onComplete) {
  const authUser = getCurrentUser();
  const defaultName = authUser?.displayName || (authUser?.email ? authUser.email.split('@')[0] : '');

  // Profile data accumulated across steps
  const profile = {
    name: defaultName,
    targetRoles: [],
    location: '',
    remote: false,
    experienceLevel: 'mid',
    skills: [],
    theme: document.body.getAttribute('data-theme') || 'tron',
    loadDemoData: false,
  };

  let step = 1;

  function render() {
    const pct = Math.round((step / TOTAL_STEPS) * 100);

    container.innerHTML = `
      <div style="max-width:520px;margin:0 auto;padding:20px 16px;">
        <!-- Progress bar -->
        <div style="margin-bottom:28px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-size:12px;color:var(--color-muted);font-weight:600;">Step ${step} of ${TOTAL_STEPS}</span>
            <span style="font-size:12px;color:var(--color-muted);">${pct}%</span>
          </div>
          <div style="height:4px;background:var(--color-surface-border);border-radius:var(--radius-full);overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:var(--color-primary);border-radius:var(--radius-full);transition:width 0.4s cubic-bezier(0.16,1,0.3,1);"></div>
          </div>
        </div>

        <!-- Step content -->
        <div style="animation:fadeIn 0.25s ease-out;">
          ${renderStep(step, profile)}
        </div>

        <!-- Navigation -->
        <div style="display:flex;justify-content:space-between;margin-top:24px;">
          ${step > 1 ? '<button class="btn" id="wizBack" style="padding:10px 20px;">← Back</button>' : '<div></div>'}
          ${step < TOTAL_STEPS
            ? '<button class="btn brand" id="wizNext" style="padding:10px 24px;font-size:15px;">Continue →</button>'
            : '<button class="btn brand" id="wizFinish" style="padding:10px 24px;font-size:15px;">Get Started →</button>'
          }
        </div>

        ${step === 1 ? '<p class="muted" style="text-align:center;margin-top:16px;font-size:12px;">Takes about 1 minute</p>' : ''}
      </div>
    `;

    bindStepEvents(step, profile, container);

    container.querySelector('#wizBack')?.addEventListener('click', () => { step--; render(); });
    container.querySelector('#wizNext')?.addEventListener('click', () => {
      if (validateStep(step, profile, container)) { step++; render(); }
    });
    container.querySelector('#wizFinish')?.addEventListener('click', async () => {
      await finishOnboarding(profile, state, onComplete, container);
    });
  }

  render();
}

// ============================================================
// Step renderers — one question per step
// ============================================================

function renderStep(step, p) {
  switch (step) {
    case 1: return `
      <div style="text-align:center;margin-bottom:24px;">
        <div style="width:56px;height:56px;margin:0 auto 16px;border-radius:var(--radius-lg);background:var(--color-primary-dim);display:flex;align-items:center;justify-content:center;">
          <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
            <path d="M20 6c-1.5 0-2.5 1-2.5 2.5v4c0 .8-.4 1.5-1 2l-1 .8c-.8.5-1.5 1.5-1.5 2.7v2h12v-2c0-1.2-.7-2.2-1.5-2.7l-1-.8c-.6-.5-1-1.2-1-2v-4C22.5 7 21.5 6 20 6z" fill="var(--color-primary)"/>
            <path d="M12 22h16v3c0 1.7-1.3 3-3 3h-2v4h-6v-4h-2c-1.7 0-3-1.3-3-3v-3z" fill="var(--color-primary)" opacity="0.6"/>
          </svg>
        </div>
        <h2 style="margin-bottom:6px;">Welcome to JobSync</h2>
        <p class="muted">Let's build your career profile</p>
      </div>
      <div class="panel" style="padding:20px;">
        <label style="display:block;">
          <h4>What's your name?</h4>
          <input id="wizName" class="input" placeholder="e.g., James DeBruhl" value="${escapeHtml(p.name)}" style="font-size:16px;padding:12px;" autofocus>
        </label>
      </div>
    `;

    case 2: return `
      <div style="margin-bottom:20px;">
        <h2 style="margin-bottom:6px;">What roles are you targeting?</h2>
        <p class="muted">Type a job title and press Enter. Add as many as you like.</p>
      </div>
      <div class="panel" style="padding:20px;">
        <div id="wizRoleTags" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">
          ${p.targetRoles.map(r => `<span class="chip" style="font-size:14px;padding:6px 12px;">${escapeHtml(r)} <button data-remove-role="${escapeHtml(r)}" style="background:none;border:none;color:var(--color-muted);cursor:pointer;font-size:16px;padding:0 4px;">&times;</button></span>`).join('')}
        </div>
        <input id="wizRoleInput" class="input" placeholder="e.g., Security Analyst, Network Engineer" style="font-size:16px;padding:12px;">
        <p class="muted" style="margin-top:8px;font-size:12px;">Popular: Security Analyst, Data Analyst, Software Engineer, DevOps Engineer, Project Manager</p>
      </div>
    `;

    case 3: return `
      <div style="margin-bottom:20px;">
        <h2 style="margin-bottom:6px;">Where do you want to work?</h2>
        <p class="muted">Enter a city, state, or select remote.</p>
      </div>
      <div class="panel" style="padding:20px;">
        <label style="display:block;margin-bottom:16px;">
          <h4>Location</h4>
          <input id="wizLocation" class="input" placeholder="e.g., Jacksonville FL, New York, US" value="${escapeHtml(p.location)}" style="font-size:16px;padding:12px;">
        </label>
        <label style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--color-primary-subtle);border:1px solid var(--color-surface-border);border-radius:var(--radius-md);cursor:pointer;">
          <input type="checkbox" id="wizRemote" ${p.remote ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--color-primary);">
          <div>
            <strong style="font-size:15px;">Open to remote work</strong>
            <div class="muted" style="font-size:12px;">Include remote positions in job search</div>
          </div>
        </label>
      </div>
    `;

    case 4: return `
      <div style="margin-bottom:20px;">
        <h2 style="margin-bottom:6px;">What's your experience level?</h2>
        <p class="muted">This helps us find the right roles for you.</p>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        ${[
          { key: 'entry', label: 'Entry Level', desc: '0-2 years', icon: '🌱' },
          { key: 'mid', label: 'Mid Level', desc: '3-5 years', icon: '📈' },
          { key: 'senior', label: 'Senior', desc: '6-10 years', icon: '⭐' },
          { key: 'lead', label: 'Lead / Manager', desc: '10+ years', icon: '🏆' },
        ].map(lvl => `
          <button class="panel wiz-level-card" data-level="${lvl.key}" style="cursor:pointer;text-align:center;padding:20px;border-color:${p.experienceLevel === lvl.key ? 'var(--color-primary)' : 'var(--color-surface-border)'};${p.experienceLevel === lvl.key ? 'box-shadow:0 0 0 2px var(--color-primary-dim);' : ''}transition:all 0.15s;">
            <div style="font-size:28px;margin-bottom:8px;">${lvl.icon}</div>
            <div style="font-size:15px;font-weight:600;color:var(--color-text-heading);">${lvl.label}</div>
            <div class="muted" style="font-size:12px;">${lvl.desc}</div>
          </button>
        `).join('')}
      </div>
    `;

    case 5: return `
      <div style="margin-bottom:20px;">
        <h2 style="margin-bottom:6px;">What are your top skills?</h2>
        <p class="muted">Type a skill and press Enter. These will be used for ATS matching.</p>
      </div>
      <div class="panel" style="padding:20px;">
        <div id="wizSkillTags" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">
          ${p.skills.map(s => `<span class="chip" style="font-size:14px;padding:6px 12px;">${escapeHtml(s)} <button data-remove-skill="${escapeHtml(s)}" style="background:none;border:none;color:var(--color-muted);cursor:pointer;font-size:16px;padding:0 4px;">&times;</button></span>`).join('')}
        </div>
        <input id="wizSkillInput" class="input" placeholder="e.g., SQL, Python, Firewall, Palo Alto" style="font-size:16px;padding:12px;">
        <div style="margin-top:12px;">
          <p class="muted" style="font-size:12px;margin-bottom:6px;">Quick add:</p>
          <div style="display:flex;flex-wrap:wrap;gap:4px;" id="wizSkillSuggestions">
            ${['SQL', 'Python', 'Excel', 'AWS', 'JavaScript', 'Docker', 'Linux', 'Agile', 'PowerShell', 'Tableau'].filter(s => !p.skills.includes(s.toLowerCase())).map(s => `<button class="chip wiz-suggest" data-suggest="${s.toLowerCase()}" style="cursor:pointer;font-size:12px;">${s}</button>`).join('')}
          </div>
        </div>
      </div>
    `;

    case 6: return `
      <div style="margin-bottom:20px;">
        <h2 style="margin-bottom:6px;">Choose your theme</h2>
        <p class="muted">You can change this anytime in Settings.</p>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <button class="panel wiz-theme-card" data-theme="tron" style="cursor:pointer;text-align:center;padding:24px;border-color:${p.theme === 'tron' ? 'var(--color-primary)' : 'var(--color-surface-border)'};${p.theme === 'tron' ? 'box-shadow:0 0 0 2px var(--color-primary-dim);' : ''}">
          <div style="width:48px;height:32px;margin:0 auto 10px;border-radius:6px;background:#1a1a1e;border:1px solid #333;"></div>
          <div style="font-size:15px;font-weight:600;">Dark</div>
          <div class="muted" style="font-size:12px;">Easy on the eyes</div>
        </button>
        <button class="panel wiz-theme-card" data-theme="light" style="cursor:pointer;text-align:center;padding:24px;border-color:${p.theme === 'light' ? 'var(--color-primary)' : 'var(--color-surface-border)'};${p.theme === 'light' ? 'box-shadow:0 0 0 2px var(--color-primary-dim);' : ''}">
          <div style="width:48px;height:32px;margin:0 auto 10px;border-radius:6px;background:#FAFAF9;border:1px solid #E4E4E7;"></div>
          <div style="font-size:15px;font-weight:600;">Light</div>
          <div class="muted" style="font-size:12px;">Clean and bright</div>
        </button>
      </div>
    `;

    case 7: return `
      <div style="text-align:center;margin-bottom:20px;">
        <h2 style="margin-bottom:6px;">You're all set, ${escapeHtml(p.name || 'there')}!</h2>
        <p class="muted">Here's a summary of your career profile.</p>
      </div>
      <div class="panel" style="padding:20px;">
        <div style="display:grid;gap:12px;">
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--color-surface-border);">
            <span class="muted">Target Roles</span>
            <strong>${p.targetRoles.length > 0 ? p.targetRoles.map(r => escapeHtml(r)).join(', ') : '<span class="muted">Not set</span>'}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--color-surface-border);">
            <span class="muted">Location</span>
            <strong>${escapeHtml(p.location || 'Not set')}${p.remote ? ' + Remote' : ''}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--color-surface-border);">
            <span class="muted">Experience</span>
            <strong>${{ entry: 'Entry Level', mid: 'Mid Level', senior: 'Senior', lead: 'Lead / Manager' }[p.experienceLevel] || p.experienceLevel}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--color-surface-border);">
            <span class="muted">Skills</span>
            <strong>${p.skills.length > 0 ? p.skills.length + ' skills' : '<span class="muted">None added</span>'}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:8px 0;">
            <span class="muted">Theme</span>
            <strong>${p.theme === 'light' ? 'Light' : 'Dark'}</strong>
          </div>
        </div>
      </div>
      <label style="display:flex;align-items:center;gap:10px;padding:12px;margin-top:12px;background:var(--color-primary-subtle);border:1px solid var(--color-surface-border);border-radius:var(--radius-md);cursor:pointer;">
        <input type="checkbox" id="wizDemoData" ${p.loadDemoData ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--color-primary);">
        <div>
          <strong style="font-size:14px;">Load sample data</strong>
          <div class="muted" style="font-size:12px;">Pre-populate with demo jobs to explore</div>
        </div>
      </label>
    `;

    default: return '';
  }
}

// ============================================================
// Step event binding
// ============================================================

function bindStepEvents(step, p, container) {
  switch (step) {
    case 1:
      container.querySelector('#wizName')?.addEventListener('input', (e) => { p.name = e.target.value; });
      break;

    case 2:
      const roleInput = container.querySelector('#wizRoleInput');
      if (roleInput) {
        roleInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && roleInput.value.trim()) {
            const role = roleInput.value.trim();
            if (!p.targetRoles.includes(role)) {
              p.targetRoles.push(role);
              roleInput.value = '';
              refreshTags(container, '#wizRoleTags', p.targetRoles, 'role');
            }
          }
        });
        roleInput.focus();
      }
      container.querySelectorAll('[data-remove-role]').forEach(btn => {
        btn.addEventListener('click', () => {
          p.targetRoles = p.targetRoles.filter(r => r !== btn.dataset.removeRole);
          refreshTags(container, '#wizRoleTags', p.targetRoles, 'role');
        });
      });
      break;

    case 3:
      container.querySelector('#wizLocation')?.addEventListener('input', (e) => { p.location = e.target.value; });
      container.querySelector('#wizRemote')?.addEventListener('change', (e) => { p.remote = e.target.checked; });
      break;

    case 4:
      container.querySelectorAll('.wiz-level-card').forEach(card => {
        card.addEventListener('click', () => {
          p.experienceLevel = card.dataset.level;
          container.querySelectorAll('.wiz-level-card').forEach(c => {
            c.style.borderColor = c.dataset.level === p.experienceLevel ? 'var(--color-primary)' : 'var(--color-surface-border)';
            c.style.boxShadow = c.dataset.level === p.experienceLevel ? '0 0 0 2px var(--color-primary-dim)' : 'none';
          });
        });
      });
      break;

    case 5:
      const skillInput = container.querySelector('#wizSkillInput');
      if (skillInput) {
        skillInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && skillInput.value.trim()) {
            const skill = skillInput.value.trim().toLowerCase();
            if (!p.skills.includes(skill)) {
              p.skills.push(skill);
              skillInput.value = '';
              refreshTags(container, '#wizSkillTags', p.skills, 'skill');
              // Remove from suggestions
              container.querySelector(`[data-suggest="${skill}"]`)?.remove();
            }
          }
        });
        skillInput.focus();
      }
      container.querySelectorAll('[data-remove-skill]').forEach(btn => {
        btn.addEventListener('click', () => {
          p.skills = p.skills.filter(s => s !== btn.dataset.removeSkill);
          refreshTags(container, '#wizSkillTags', p.skills, 'skill');
        });
      });
      container.querySelectorAll('.wiz-suggest').forEach(btn => {
        btn.addEventListener('click', () => {
          const skill = btn.dataset.suggest;
          if (!p.skills.includes(skill)) {
            p.skills.push(skill);
            refreshTags(container, '#wizSkillTags', p.skills, 'skill');
            btn.remove();
          }
        });
      });
      break;

    case 6:
      container.querySelectorAll('.wiz-theme-card').forEach(card => {
        card.addEventListener('click', () => {
          p.theme = card.dataset.theme;
          document.body.setAttribute('data-theme', p.theme);
          localStorage.setItem(STORAGE_KEYS.theme, p.theme);
          container.querySelectorAll('.wiz-theme-card').forEach(c => {
            c.style.borderColor = c.dataset.theme === p.theme ? 'var(--color-primary)' : 'var(--color-surface-border)';
            c.style.boxShadow = c.dataset.theme === p.theme ? '0 0 0 2px var(--color-primary-dim)' : 'none';
          });
        });
      });
      break;

    case 7:
      container.querySelector('#wizDemoData')?.addEventListener('change', (e) => { p.loadDemoData = e.target.checked; });
      break;
  }
}

function refreshTags(container, selector, items, type) {
  const el = container.querySelector(selector);
  if (!el) return;
  el.innerHTML = items.map(item => `
    <span class="chip" style="font-size:14px;padding:6px 12px;">${escapeHtml(item)}
      <button data-remove-${type}="${escapeHtml(item)}" style="background:none;border:none;color:var(--color-muted);cursor:pointer;font-size:16px;padding:0 4px;">&times;</button>
    </span>
  `).join('');
  // Re-bind remove buttons
  el.querySelectorAll(`[data-remove-${type}]`).forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute(`data-remove-${type}`);
      const idx = items.indexOf(val);
      if (idx >= 0) items.splice(idx, 1);
      refreshTags(container, selector, items, type);
    });
  });
}

function validateStep(step, p, container) {
  if (step === 1 && !p.name.trim()) {
    toast('Please enter your name', 'error');
    container.querySelector('#wizName')?.focus();
    return false;
  }
  return true;
}

// ============================================================
// Finish — save profile, provision user, navigate to dashboard
// ============================================================

async function finishOnboarding(profile, state, onComplete, container) {
  // Show analyzing state
  container.innerHTML = `
    <div style="max-width:400px;margin:60px auto;text-align:center;">
      <div class="spinner" style="width:32px;height:32px;margin:0 auto 20px;border-width:3px;"></div>
      <h2 style="margin-bottom:8px;">Setting up your profile...</h2>
      <p class="muted" id="analyzingText">Creating your career profile</p>
    </div>
  `;

  const textEl = container.querySelector('#analyzingText');
  const messages = [
    'Creating your career profile',
    'Configuring job search preferences',
    'Setting up your dashboard',
    'Almost ready...',
  ];
  let msgIdx = 0;
  const msgInterval = setInterval(() => {
    msgIdx++;
    if (textEl && msgIdx < messages.length) textEl.textContent = messages[msgIdx];
  }, 800);

  // Save to state
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

  // Sync display name to Firebase Auth
  try {
    const user = getCurrentUser();
    if (user && profile.name) user.updateProfile({ displayName: profile.name });
  } catch (e) { /* silent */ }

  // Provision in Firestore
  try {
    const alreadyProvisioned = await isProvisioned();
    if (!alreadyProvisioned) {
      await provisionUser({ name: profile.name, role: 'Candidate', theme: profile.theme }, profile.loadDemoData);
    }
  } catch (e) { console.warn('Provisioning failed:', e); }

  // Save checklist + onboarded flag
  const checklist = { accountCreated: true, profileSetup: true, firstJobAdded: false, firstSearch: false, apiKeyConnected: false, resumeUploaded: false, dismissed: false };
  localStorage.setItem(STORAGE_KEYS.onboarded, 'true');
  localStorage.setItem('tron_checklist', JSON.stringify(checklist));

  clearInterval(msgInterval);

  // Brief pause then navigate
  await new Promise(r => setTimeout(r, 1200));

  if (onComplete) onComplete();
  navigate('dashboard');
}

export default { renderProfileSetup };
