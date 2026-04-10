/* ============================================================
   views/profile-setup.js — Single-step quick setup
   Collapsed from 3 steps to 1 for faster time-to-value.
   API keys are configured later via contextual prompts.
   ============================================================ */

import { escapeHtml } from '../utils.js';
import { ROLES, STORAGE_KEYS } from '../config.js';
import { navigate } from '../router.js';
import { getCurrentUser } from '../firebase/auth.js';
import { provisionUser, isProvisioned } from '../firebase/provisioning.js';

/**
 * Render the single-step profile setup.
 * @param {HTMLElement} container
 * @param {object} state — state store
 * @param {Function} onComplete — called when setup is finished
 */
export function renderProfileSetup(container, state, onComplete) {
  const authUser = getCurrentUser();
  const defaultName = authUser?.displayName || (authUser?.email ? authUser.email.split('@')[0] : '');
  const currentTheme = document.body.getAttribute('data-theme') || 'tron';

  container.innerHTML = `
    <div style="max-width:500px;margin:0 auto;padding:24px 16px;">
      <div style="text-align:center;margin-bottom:28px;">
        <div style="width:60px;height:60px;margin:0 auto 16px;border:2px solid var(--color-primary);border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--color-primary-dim);box-shadow:var(--shadow-glow);">
          <span style="font-family:var(--font-display);font-weight:900;font-size:24px;color:var(--color-primary);">T</span>
        </div>
        <h2 style="margin-bottom:4px;">WELCOME</h2>
        <p class="muted">Let's get you set up in 30 seconds</p>
      </div>

      <div class="panel" style="padding:24px;">
        <label style="display:block;margin-bottom:16px;">
          <h4>YOUR NAME</h4>
          <input id="setupName" class="input" placeholder="e.g., Kevin Flynn" value="${escapeHtml(defaultName)}">
        </label>

        <label style="display:block;margin-bottom:16px;">
          <h4>YOUR ROLE</h4>
          <select id="setupRole" class="input">
            ${ROLES.map(r => `<option>${r}</option>`).join('')}
          </select>
        </label>

        <div style="margin-bottom:16px;">
          <h4>THEME</h4>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <button class="panel setup-theme" data-theme="tron" style="cursor:pointer;text-align:center;padding:14px;border-color:${currentTheme === 'tron' ? 'var(--color-primary)' : 'var(--color-surface-border)'};${currentTheme === 'tron' ? 'box-shadow:var(--shadow-glow);' : ''}">
              <div style="font-size:18px;margin-bottom:4px;">&#9670;</div>
              <div style="font-family:var(--font-display);font-size:var(--text-xs);font-weight:700;letter-spacing:1px;">TRON</div>
            </button>
            <button class="panel setup-theme" data-theme="light" style="cursor:pointer;text-align:center;padding:14px;border-color:${currentTheme === 'light' ? 'var(--color-primary)' : 'var(--color-surface-border)'};${currentTheme === 'light' ? 'box-shadow:var(--shadow-glow);' : ''}">
              <div style="font-size:18px;margin-bottom:4px;">&#9672;</div>
              <div style="font-family:var(--font-display);font-size:var(--text-xs);font-weight:700;letter-spacing:1px;">LIGHT</div>
            </button>
          </div>
        </div>

        <div style="border-top:1px solid var(--color-surface-border);padding-top:14px;margin-bottom:14px;">
          <h4>JOB SEARCH PREFERENCES</h4>
          <div class="grid cols-2" style="gap:10px;margin-top:6px;">
            <input id="setupSearchKeywords" class="input" placeholder="Keywords (e.g., Security Analyst, SQL)" style="font-size:14px;">
            <input id="setupSearchLocation" class="input" placeholder="Location (e.g., Jacksonville FL)" style="font-size:14px;">
          </div>
        </div>

        <label style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--color-primary-subtle);border:1px solid var(--color-surface-border);border-radius:var(--radius-md);cursor:pointer;margin-bottom:8px;">
          <input type="checkbox" id="setupDemoData" checked style="width:18px;height:18px;accent-color:var(--color-primary);flex-shrink:0;">
          <div>
            <strong style="font-size:var(--text-sm);">Load sample data</strong>
            <div class="muted" style="font-size:var(--text-xs)">Pre-populate jobs, a company, and an interview to explore</div>
          </div>
        </label>
      </div>

      <button class="btn brand large" id="setupLaunch" style="width:100%;margin-top:20px;padding:16px;">
        LAUNCH DASHBOARD
      </button>

      <p class="muted" style="text-align:center;margin-top:12px;font-size:var(--text-xs)">
        You can configure API keys later in Settings
      </p>
    </div>
  `;

  // Theme selection
  container.querySelectorAll('.setup-theme').forEach(btn => {
    btn.addEventListener('click', () => {
      document.body.setAttribute('data-theme', btn.dataset.theme);
      localStorage.setItem(STORAGE_KEYS.theme, btn.dataset.theme);
      container.querySelectorAll('.setup-theme').forEach(b => {
        const active = b.dataset.theme === btn.dataset.theme;
        b.style.borderColor = active ? 'var(--color-primary)' : 'var(--color-surface-border)';
        b.style.boxShadow = active ? 'var(--shadow-glow)' : 'none';
      });
    });
  });

  // Launch
  container.querySelector('#setupLaunch')?.addEventListener('click', async () => {
    const name = container.querySelector('#setupName')?.value?.trim() || 'User';
    const role = container.querySelector('#setupRole')?.value || 'Candidate';
    const loadDemo = container.querySelector('#setupDemoData')?.checked ?? true;
    const theme = document.body.getAttribute('data-theme') || 'tron';
    const searchKeywords = container.querySelector('#setupSearchKeywords')?.value?.trim() || '';
    const searchLocation = container.querySelector('#setupSearchLocation')?.value?.trim() || '';

    // Save to state
    const settings = state.get('settings') || {};
    settings.name = name;
    settings.role = role;
    settings.searchKeywords = searchKeywords;
    settings.searchLocation = searchLocation;
    state.set('settings', settings);
    state.set('role', role);

    // Sync display name to Firebase Auth
    try {
      const user = getCurrentUser();
      if (user && name) user.updateProfile({ displayName: name });
    } catch (e) { /* silent */ }

    // Provision user in Firestore
    try {
      const alreadyProvisioned = await isProvisioned();
      if (!alreadyProvisioned) {
        await provisionUser({ name, role, theme }, loadDemo);
      }
    } catch (e) { console.warn('Provisioning failed:', e); }

    // Initialize checklist
    const checklist = { accountCreated: true, profileSetup: true, firstJobAdded: false, firstSearch: false, apiKeyConnected: false, resumeUploaded: false, dismissed: false };
    localStorage.setItem(STORAGE_KEYS.onboarded, 'true');
    localStorage.setItem('tron_checklist', JSON.stringify(checklist));

    if (onComplete) onComplete();
    navigate('dashboard');
  });
}

export default { renderProfileSetup };
