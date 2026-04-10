/* ============================================================
   views/profile-setup.js — 3-step onboarding wizard
   ============================================================ */

import { escapeHtml } from '../utils.js';
import { ROLES, STORAGE_KEYS } from '../config.js';
import { navigate } from '../router.js';
import { getCurrentUser } from '../firebase/auth.js';
import { provisionUser, isProvisioned } from '../firebase/provisioning.js';

/**
 * Render the profile setup wizard.
 * @param {HTMLElement} container — the section element
 * @param {object} state — state store (get/set)
 * @param {Function} onComplete — called when setup is finished
 */
export function renderProfileSetup(container, state, onComplete) {
  let step = 1;
  // Pre-fill from Firebase Auth user if available
  const authUser = getCurrentUser();
  const defaultName = authUser?.displayName || (authUser?.email ? authUser.email.split('@')[0] : '');
  const wizard = { name: defaultName, role: 'Candidate', theme: 'tron', apiKeys: {}, loadDemoData: true };

  function render() {
    container.innerHTML = `
      <div style="max-width:600px;margin:0 auto;padding:20px;">
        <div style="text-align:center;margin-bottom:24px;">
          <h2>&#10216; PROFILE SETUP &#10217;</h2>
          <div style="display:flex;justify-content:center;gap:8px;margin-top:12px;">
            ${[1, 2, 3].map(s => `
              <div style="width:40px;height:4px;border-radius:2px;background:${s <= step ? 'var(--orange)' : 'var(--grid)'};transition:all 0.3s;"></div>
            `).join('')}
          </div>
          <div class="muted" style="margin-top:8px;font-size:11px;">Step ${step} of 3</div>
        </div>

        <div class="panel" style="padding:24px;">
          ${step === 1 ? renderStep1() : step === 2 ? renderStep2() : renderStep3()}
        </div>

        <div style="display:flex;justify-content:space-between;margin-top:16px;">
          ${step > 1 ? '<button class="btn" id="wizardBack">BACK</button>' : '<div></div>'}
          ${step < 3
            ? '<button class="btn brand" id="wizardNext">NEXT</button>'
            : '<button class="btn brand" id="wizardFinish">LAUNCH DASHBOARD</button>'
          }
        </div>
      </div>
    `;

    // Event listeners
    if (step === 1) {
      const nameEl = container.querySelector('#wizardName');
      if (nameEl) nameEl.value = wizard.name;
      nameEl?.addEventListener('input', e => { wizard.name = e.target.value; });

      const roleEl = container.querySelector('#wizardRole');
      if (roleEl) roleEl.value = wizard.role;
      roleEl?.addEventListener('change', e => { wizard.role = e.target.value; });

      const demoEl = container.querySelector('#wizardDemoData');
      if (demoEl) demoEl.addEventListener('change', e => { wizard.loadDemoData = e.target.checked; });
    }

    if (step === 2) {
      container.querySelectorAll('.theme-option').forEach(btn => {
        btn.addEventListener('click', () => {
          wizard.theme = btn.dataset.theme;
          document.body.setAttribute('data-theme', wizard.theme);
          container.querySelectorAll('.theme-option').forEach(b => {
            b.style.borderColor = b.dataset.theme === wizard.theme ? 'var(--orange)' : 'var(--grid)';
            b.style.boxShadow = b.dataset.theme === wizard.theme ? '0 0 20px var(--orange-glow)' : 'none';
          });
        });
      });
    }

    if (step === 3) {
      ['geminiKey', 'groqKey', 'adzunaId', 'adzunaKey', 'jsearchKey', 'hunterKey', 'emailjsPublic', 'abstractKey', 'ntfyTopic'].forEach(id => {
        const el = container.querySelector('#wizard_' + id);
        if (el) el.addEventListener('input', e => { wizard.apiKeys[id] = e.target.value.trim(); });
      });
    }

    container.querySelector('#wizardBack')?.addEventListener('click', () => { step--; render(); });
    container.querySelector('#wizardNext')?.addEventListener('click', () => { step++; render(); });
    container.querySelector('#wizardFinish')?.addEventListener('click', () => {
      // Save wizard data to state
      const settings = state.get('settings') || {};
      settings.name = wizard.name;
      settings.role = wizard.role;
      state.set('settings', settings);
      state.set('role', wizard.role);

      // Save API keys if provided
      if (Object.keys(wizard.apiKeys).some(k => wizard.apiKeys[k])) {
        const existing = JSON.parse(localStorage.getItem(STORAGE_KEYS.apiKeys) || '{}');
        const merged = { ...existing, ...wizard.apiKeys };
        localStorage.setItem(STORAGE_KEYS.apiKeys, JSON.stringify(merged));
      }

      // Sync display name to Firebase Auth
      try {
        const user = getCurrentUser();
        if (user && wizard.name) {
          user.updateProfile({ displayName: wizard.name });
        }
      } catch (e) { console.warn('Profile sync failed:', e); }

      // Provision user in Firestore (create isolated collections, API vault, etc.)
      try {
        const alreadyProvisioned = await isProvisioned();
        if (!alreadyProvisioned) {
          await provisionUser(
            { name: wizard.name, role: wizard.role, theme: wizard.theme },
            wizard.loadDemoData
          );
        }
      } catch (e) { console.warn('Provisioning failed (will use localStorage):', e); }

      localStorage.setItem(STORAGE_KEYS.onboarded, 'true');
      if (onComplete) onComplete();
      navigate('dashboard');
    });
  }

  function renderStep1() {
    return `
      <h3>Welcome to JobGrid Pro</h3>
      <p class="muted" style="margin-bottom:16px;font-size:12px;">Let's set up your profile.</p>
      <label style="display:block;margin:12px 0;">
        <h4>YOUR NAME</h4>
        <input id="wizardName" class="input" placeholder="e.g., Kevin Flynn" value="${escapeHtml(wizard.name)}">
      </label>
      <label style="display:block;margin:12px 0;">
        <h4>YOUR ROLE</h4>
        <select id="wizardRole" class="input">
          ${ROLES.map(r => `<option ${r === wizard.role ? 'selected' : ''}>${r}</option>`).join('')}
        </select>
      </label>
      <label style="display:flex;align-items:center;gap:10px;margin:16px 0;padding:12px;background:var(--color-primary-dim);border:1px solid var(--color-primary);border-radius:var(--radius-md);cursor:pointer;">
        <input type="checkbox" id="wizardDemoData" ${wizard.loadDemoData ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--color-primary)">
        <div>
          <h4 style="margin:0">Load sample data to explore?</h4>
          <div class="muted" style="font-size:11px">Pre-populate jobs, companies, an interview, and a resume so you can see the dashboard in action</div>
        </div>
      </label>
    `;
  }

  function renderStep2() {
    return `
      <h3>Choose Your Theme</h3>
      <p class="muted" style="margin-bottom:16px;font-size:12px;">Select a visual theme. You can change this later in settings.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="panel theme-option" data-theme="tron" style="cursor:pointer;text-align:center;padding:20px;border-color:${wizard.theme === 'tron' ? 'var(--orange)' : 'var(--grid)'};${wizard.theme === 'tron' ? 'box-shadow:0 0 20px var(--orange-glow);' : ''}">
          <div style="font-size:24px;margin-bottom:8px;">&#9670;</div>
          <h4>TRON</h4>
          <p class="muted" style="font-size:11px;">Dark cyberpunk grid</p>
        </div>
        <div class="panel theme-option" data-theme="light" style="cursor:pointer;text-align:center;padding:20px;border-color:${wizard.theme === 'light' ? 'var(--orange)' : 'var(--grid)'};${wizard.theme === 'light' ? 'box-shadow:0 0 20px var(--orange-glow);' : ''}">
          <div style="font-size:24px;margin-bottom:8px;">&#9672;</div>
          <h4>LIGHT</h4>
          <p class="muted" style="font-size:11px;">Clean and minimal</p>
        </div>
      </div>
    `;
  }

  function renderStep3() {
    return `
      <h3>API Keys (Optional)</h3>
      <p class="muted" style="margin-bottom:16px;font-size:12px;">Add keys now or configure later in Settings. All APIs have free tiers.</p>

      <div style="border-bottom:1px solid var(--grid);padding-bottom:8px;margin-bottom:12px">
        <h4 style="color:var(--orange-bright);font-size:11px;text-transform:uppercase;letter-spacing:1px">AI / NLP</h4>
      </div>
      <label style="display:block;margin:8px 0;">
        <h4>GOOGLE GEMINI</h4>
        <input id="wizard_geminiKey" class="input" placeholder="API Key — Free: 15 req/min">
        <div class="muted" style="font-size:10px;margin-top:2px"><a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--color-info)">Get key</a></div>
      </label>
      <label style="display:block;margin:8px 0;">
        <h4>GROQ (Fast LLM)</h4>
        <input id="wizard_groqKey" class="input" placeholder="API Key — Free tier, Llama 3.3 70B">
        <div class="muted" style="font-size:10px;margin-top:2px"><a href="https://console.groq.com/keys" target="_blank" style="color:var(--color-info)">Get key</a></div>
      </label>

      <div style="border-bottom:1px solid var(--grid);padding-bottom:8px;margin:16px 0 12px">
        <h4 style="color:var(--orange-bright);font-size:11px;text-transform:uppercase;letter-spacing:1px">Job Search</h4>
      </div>
      <label style="display:block;margin:8px 0;">
        <h4>ADZUNA APP ID</h4>
        <input id="wizard_adzunaId" class="input" placeholder="Free: 250 req/day">
      </label>
      <label style="display:block;margin:8px 0;">
        <h4>ADZUNA APP KEY</h4>
        <input id="wizard_adzunaKey" class="input" placeholder="App Key">
        <div class="muted" style="font-size:10px;margin-top:2px"><a href="https://developer.adzuna.com/" target="_blank" style="color:var(--color-info)">Get keys</a></div>
      </label>
      <label style="display:block;margin:8px 0;">
        <h4>JSEARCH (RapidAPI)</h4>
        <input id="wizard_jsearchKey" class="input" placeholder="Free: 500 req/mo — LinkedIn, Indeed aggregator">
        <div class="muted" style="font-size:10px;margin-top:2px"><a href="https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch" target="_blank" style="color:var(--color-info)">Get key</a></div>
      </label>

      <div style="border-bottom:1px solid var(--grid);padding-bottom:8px;margin:16px 0 12px">
        <h4 style="color:var(--orange-bright);font-size:11px;text-transform:uppercase;letter-spacing:1px">Email / Contacts</h4>
      </div>
      <label style="display:block;margin:8px 0;">
        <h4>HUNTER.IO</h4>
        <input id="wizard_hunterKey" class="input" placeholder="Free: 25 verifications/mo">
        <div class="muted" style="font-size:10px;margin-top:2px"><a href="https://hunter.io/api" target="_blank" style="color:var(--color-info)">Get key</a></div>
      </label>
      <label style="display:block;margin:8px 0;">
        <h4>EMAILJS PUBLIC KEY</h4>
        <input id="wizard_emailjsPublic" class="input" placeholder="Free: 200 emails/mo">
        <div class="muted" style="font-size:10px;margin-top:2px"><a href="https://www.emailjs.com/" target="_blank" style="color:var(--color-info)">Setup</a> — also configure Service ID and Template ID in Settings</div>
      </label>

      <div style="border-bottom:1px solid var(--grid);padding-bottom:8px;margin:16px 0 12px">
        <h4 style="color:var(--orange-bright);font-size:11px;text-transform:uppercase;letter-spacing:1px">Company / Salary Data</h4>
      </div>
      <label style="display:block;margin:8px 0;">
        <h4>ABSTRACT COMPANY ENRICHMENT</h4>
        <input id="wizard_abstractKey" class="input" placeholder="Free: 100 req/mo — industry, size, HQ">
        <div class="muted" style="font-size:10px;margin-top:2px"><a href="https://www.abstractapi.com/api/company-enrichment" target="_blank" style="color:var(--color-info)">Get key</a></div>
      </label>

      <div style="border-bottom:1px solid var(--grid);padding-bottom:8px;margin:16px 0 12px">
        <h4 style="color:var(--orange-bright);font-size:11px;text-transform:uppercase;letter-spacing:1px">Notifications</h4>
      </div>
      <label style="display:block;margin:8px 0;">
        <h4>NTFY.SH TOPIC</h4>
        <input id="wizard_ntfyTopic" class="input" placeholder="e.g., jobgrid-alerts — Free, no account">
        <div class="muted" style="font-size:10px;margin-top:2px"><a href="https://ntfy.sh/" target="_blank" style="color:var(--color-info)">Learn more</a></div>
      </label>
    `;
  }

  render();
}

export default { renderProfileSetup };
