/* ============================================================
   views/settings.js — Settings with accordion sections
   ============================================================ */

import { getApi, hasApi, saveAllKeys, clearKeys, loadKeys } from '../services/api-keys.js';
import { toast } from '../components/toast.js';
import { requestPermission } from '../services/notifications.js';
import { getUserTier, setUserTier, resetUsage } from '../services/usage-tracker.js';
import { renderPricingTable, renderUsageDashboard } from '../components/upgrade-banner.js';
import { saveUserApiKeys, setUserTierInFirestore } from '../firebase/provisioning.js';
import { completeChecklistItem } from '../components/getting-started.js';
import { sendSMS } from '../services/notifications.js';

function countConnected() {
  const keyed = [
    hasApi('adzunaId'), hasApi('jsearchKey'), hasApi('geminiKey'), hasApi('groqKey'),
    hasApi('emailjsPublic'), hasApi('hunterKey'), hasApi('abstractKey'),
    hasApi('careerOneStopKey'), !!getApi('ntfyTopic')
  ].filter(Boolean).length;
  return keyed + 3; // +3 always-free: Remotive, Arbeitnow, BLS
}

function apiField(statusId, label, inputs, hint) {
  return `
    <div class="settings-api-row">
      <div class="settings-api-header">
        <span class="api-status" id="${statusId}"></span>
        <span class="settings-api-label">${label}</span>
      </div>
      ${inputs || ''}
      ${hint ? `<div class="settings-api-hint">${hint}</div>` : ''}
    </div>`;
}

function inp(id, placeholder, style) {
  return `<input id="${id}" class="input" placeholder="${placeholder}" ${style || ''}>`;
}

function link(url, text) {
  return `<a href="${url}" target="_blank" rel="noopener" class="settings-link">${text}</a>`;
}

export function renderSettings(container, apiKeys, onSave, onClear) {
  const fields = {
    apiAdzunaId: 'adzunaId', apiAdzunaKey: 'adzunaKey',
    apiJSearchKey: 'jsearchKey', apiGeminiKey: 'geminiKey', apiGroqKey: 'groqKey',
    apiEmailjsPublic: 'emailjsPublic', apiEmailjsService: 'emailjsService', apiEmailjsTemplate: 'emailjsTemplate',
    apiHunterKey: 'hunterKey', apiAbstractKey: 'abstractKey',
    apiCareerOneStopKey: 'careerOneStopKey', apiCareerOneStopUser: 'careerOneStopUser',
    apiNtfyTopic: 'ntfyTopic', apiPhoneNumber: 'phoneNumber'
  };

  const connected = countConnected();
  const tier = getUserTier();

  container.innerHTML = `
    <div class="section-shell">
      <div class="section-intro">
        <div class="section-title-row">
          <p class="eyebrow">Configuration</p>
          <h2>Settings</h2>
          <p class="section-copy">Connect API keys, manage your tier, and configure notifications. Free sources work out of the box. Need help? <a href="mailto:support@qq-studios.com" style="color:var(--color-primary)">support@qq-studios.com</a></p>
        </div>
      </div>

      <div class="section-hero">
        <div class="glance-grid">
          <div class="glance-card">
            <div class="glance-label">APIs Connected</div>
            <div class="glance-value">${connected}</div>
            <div class="glance-copy">${connected > 3 ? 'Premium sources are active and expanding your reach.' : '3 free sources ready. Add API keys to unlock more.'}</div>
          </div>
          <div class="glance-card">
            <div class="glance-label">Current Tier</div>
            <div class="glance-value" style="text-transform:capitalize">${tier}</div>
            <div class="glance-copy">${tier === 'free' ? 'Upgrade for higher daily limits and priority support.' : 'You have expanded daily limits and premium features.'}</div>
          </div>
          <div class="glance-card">
            <div class="glance-label">Quick Actions</div>
            <div class="glance-value" style="font-size:16px;letter-spacing:0">
              <button class="btn brand small" id="saveApiSettings">Save All</button>
              <button class="btn danger small" id="clearApiSettings" style="margin-left:6px">Clear Keys</button>
            </div>
            <div class="glance-copy">Save syncs keys to Firestore for cross-device access.</div>
          </div>
        </div>
      </div>

      <div class="settings-accordions">
        <details class="settings-section" open>
          <summary class="settings-section-header">Job Search <span class="chip">4 sources</span></summary>
          <div class="settings-section-body">
            ${apiField('remotiveStatus', 'Remotive (Free)', '', 'Remote jobs — always active, no key needed')}
            ${apiField('arbeitnowStatus', 'Arbeitnow (Free)', '', `EU + remote jobs — always active — ${link('https://www.arbeitnow.com/blog/job-board-api', 'Docs')}`)}
            ${apiField('adzunaStatus', 'Adzuna', `${inp('apiAdzunaId', 'App ID')}${inp('apiAdzunaKey', 'App Key')}`, `Free: 250 req/day — ${link('https://developer.adzuna.com/', 'Get keys')}`)}
            ${apiField('jsearchStatus', 'JSearch (RapidAPI)', inp('apiJSearchKey', 'RapidAPI Key'), `Free: 500 req/mo — aggregates LinkedIn, Indeed — ${link('https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch', 'Get key')}`)}
          </div>
        </details>

        <details class="settings-section">
          <summary class="settings-section-header">AI & NLP <span class="chip">2 models</span></summary>
          <div class="settings-section-body">
            ${apiField('geminiStatus', 'Google Gemini', inp('apiGeminiKey', 'API Key'), `Free: 15 req/min — ${link('https://aistudio.google.com/app/apikey', 'Get key')}`)}
            ${apiField('groqStatus', 'Groq (Fast LLM)', inp('apiGroqKey', 'API Key'), `Free tier — Llama 3.3 70B — ${link('https://console.groq.com/keys', 'Get key')}`)}
          </div>
        </details>

        <details class="settings-section">
          <summary class="settings-section-header">Company Data <span class="chip">2 sources</span></summary>
          <div class="settings-section-body">
            ${apiField('clearbitStatus', 'Clearbit Logos (Free)', '', 'Company logos by domain — always active, no key')}
            ${apiField('abstractStatus', 'Abstract Company', inp('apiAbstractKey', 'API Key'), `Free: 100 req/mo — ${link('https://www.abstractapi.com/api/company-enrichment', 'Get key')}`)}
          </div>
        </details>

        <details class="settings-section">
          <summary class="settings-section-header">Salary Data <span class="chip">2 sources</span></summary>
          <div class="settings-section-body">
            ${apiField('blsStatus', 'BLS (Free)', '', 'Bureau of Labor Statistics — national salary benchmarks, no key')}
            ${apiField('careerOneStopStatus', 'CareerOneStop', `${inp('apiCareerOneStopKey', 'API Token')}${inp('apiCareerOneStopUser', 'User ID')}`, `Free (gov) — salary by occupation + location — ${link('https://www.careeronestop.org/Developers/WebAPI/registration.aspx', 'Register')}`)}
          </div>
        </details>

        <details class="settings-section">
          <summary class="settings-section-header">Email & Contacts <span class="chip">2 services</span></summary>
          <div class="settings-section-body">
            ${apiField('emailjsStatus', 'EmailJS', `${inp('apiEmailjsPublic', 'Public Key')}${inp('apiEmailjsService', 'Service ID')}${inp('apiEmailjsTemplate', 'Template ID')}`, `Free: 200 emails/mo — ${link('https://www.emailjs.com/', 'Setup')}`)}
            ${apiField('hunterStatus', 'Hunter.io', inp('apiHunterKey', 'API Key'), `Free: 25 verifications/mo — ${link('https://hunter.io/api', 'Get key')}`)}
          </div>
        </details>

        <details class="settings-section">
          <summary class="settings-section-header">Notifications <span class="chip">3 channels</span></summary>
          <div class="settings-section-body">
            ${apiField('ntfyStatus', 'ntfy.sh (Push)', inp('apiNtfyTopic', 'Your topic name (e.g., jobsynk-alerts)'), `Free, no account — ${link('https://ntfy.sh/', 'Learn more')}`)}
            ${apiField('smsStatus', 'SMS (Twilio)', `${inp('apiPhoneNumber', 'Your phone number (e.g., 9046628966)')}<button class="btn small" id="testSmsBtn" style="margin-top:6px">Send Test SMS</button>`, 'Requires Twilio setup in Cloud Functions')}
            ${apiField('browserNotifStatus', 'Browser Notifications', '<button class="btn small green" id="requestNotifPerm">Grant Permission</button>', 'Desktop push notifications for follow-ups and matches')}
          </div>
        </details>

        <details class="settings-section">
          <summary class="settings-section-header">Firebase</summary>
          <div class="settings-section-body">
            <div class="settings-api-hint">Configure in js/config.js to enable cloud sync. Anonymous auth is used by default.</div>
            <div id="firebaseStatus" class="muted" style="margin-top:8px">Not configured</div>
          </div>
        </details>
      </div>

      <div id="pricingSection" style="margin-top:24px"></div>
      <div id="usageDashboard" style="margin-top:16px"></div>
    </div>

    <style>
      .settings-accordions { display: flex; flex-direction: column; gap: 8px; }
      .settings-section {
        border: 1px solid var(--color-surface-border);
        border-radius: var(--radius-lg);
        background: var(--color-surface);
        overflow: hidden;
        transition: box-shadow 0.2s;
      }
      .settings-section[open] { box-shadow: var(--shadow-sm); }
      .settings-section-header {
        padding: 16px 20px;
        font-size: 15px; font-weight: 600;
        color: var(--color-text-heading);
        cursor: pointer;
        display: flex; align-items: center; gap: 10px;
        list-style: none;
        user-select: none;
        transition: background 0.15s;
      }
      .settings-section-header:hover { background: var(--color-bg-secondary); }
      .settings-section-header::-webkit-details-marker { display: none; }
      .settings-section-header::before {
        content: '\\25B8';
        font-size: 12px;
        color: var(--color-muted);
        transition: transform 0.2s;
        flex-shrink: 0;
      }
      .settings-section[open] > .settings-section-header::before { transform: rotate(90deg); }
      .settings-section-header .chip {
        margin-left: auto;
        font-size: 11px;
      }
      .settings-section-body {
        padding: 4px 20px 20px;
        border-top: 1px solid var(--color-surface-border);
      }
      .settings-api-row {
        padding: 12px 0;
        border-bottom: 1px solid var(--color-surface-border);
      }
      .settings-api-row:last-child { border-bottom: none; }
      .settings-api-header {
        display: flex; align-items: center; gap: 8px;
        margin-bottom: 6px;
      }
      .settings-api-label {
        font-size: 14px; font-weight: 600;
        color: var(--color-text-heading);
      }
      .settings-api-row .input {
        margin-top: 4px;
        display: block;
        width: 100%;
      }
      .settings-api-hint {
        font-size: 12px;
        color: var(--color-text-dim);
        margin-top: 6px;
        line-height: 1.5;
      }
      .settings-link { color: var(--color-info); }
      .settings-link:hover { text-decoration: underline; }

      @media (max-width: 768px) {
        .settings-section-body { padding: 4px 14px 14px; }
        .settings-section-header { padding: 14px 14px; }
      }
    </style>
  `;

  // Populate field values
  Object.entries(fields).forEach(([elId, keyName]) => {
    const el = container.querySelector('#' + elId);
    if (el) el.value = getApi(keyName);
  });

  // Set always-active statuses
  ['remotiveStatus', 'arbeitnowStatus', 'clearbitStatus', 'blsStatus'].forEach(id => {
    const el = container.querySelector('#' + id);
    if (el) el.className = 'api-status active';
  });

  updateStatuses(container);

  // Save button
  container.querySelector('#saveApiSettings')?.addEventListener('click', () => {
    const keys = {};
    Object.entries(fields).forEach(([elId, keyName]) => {
      const el = container.querySelector('#' + elId);
      if (el) keys[keyName] = el.value.trim();
    });
    saveAllKeys(keys);
    saveUserApiKeys(keys).catch(() => {});
    if (keys.geminiKey || keys.groqKey) completeChecklistItem('apiKeyConnected');
    updateStatuses(container);
    toast('API settings saved!', 'success');
    if (onSave) onSave(keys);
  });

  // Clear button
  container.querySelector('#clearApiSettings')?.addEventListener('click', () => {
    if (!confirm('Clear all API keys?')) return;
    clearKeys();
    Object.keys(fields).forEach(elId => {
      const el = container.querySelector('#' + elId);
      if (el) el.value = '';
    });
    updateStatuses(container);
    toast('All API keys cleared', 'info');
    if (onClear) onClear();
  });

  // SMS test
  const testSmsBtn = container.querySelector('#testSmsBtn');
  if (testSmsBtn) {
    testSmsBtn.addEventListener('click', async () => {
      const phone = container.querySelector('#apiPhoneNumber')?.value?.trim();
      if (!phone) { toast('Enter a phone number first', 'error'); return; }
      testSmsBtn.disabled = true; testSmsBtn.textContent = 'Sending...';
      await sendSMS(phone, 'JobSynk test: SMS notifications are working! Support: support@qq-studios.com');
      testSmsBtn.disabled = false; testSmsBtn.textContent = 'Send Test SMS';
    });
  }

  // Notification permission
  container.querySelector('#requestNotifPerm')?.addEventListener('click', async () => {
    const granted = await requestPermission();
    toast(granted ? 'Notifications enabled!' : 'Notification permission denied', granted ? 'success' : 'error');
    updateStatuses(container);
  });

  // Pricing table — links open Stripe Checkout directly
  const pricingEl = container.querySelector('#pricingSection');
  if (pricingEl) {
    pricingEl.innerHTML = renderPricingTable();
  }

  // Usage dashboard
  const usageEl = container.querySelector('#usageDashboard');
  if (usageEl) usageEl.innerHTML = renderUsageDashboard();
}

function updateStatuses(root) {
  const doc = root || document;
  const set = (id, active) => {
    const el = doc.querySelector('#' + id);
    if (el) el.className = 'api-status ' + (active ? 'active' : 'inactive');
  };
  set('adzunaStatus', hasApi('adzunaId') && hasApi('adzunaKey'));
  set('jsearchStatus', hasApi('jsearchKey'));
  set('geminiStatus', hasApi('geminiKey'));
  set('groqStatus', hasApi('groqKey'));
  set('emailjsStatus', hasApi('emailjsPublic'));
  set('hunterStatus', hasApi('hunterKey'));
  set('abstractStatus', hasApi('abstractKey'));
  set('careerOneStopStatus', hasApi('careerOneStopKey'));
  set('ntfyStatus', !!getApi('ntfyTopic'));
  set('smsStatus', !!getApi('phoneNumber'));
  set('browserNotifStatus', typeof Notification !== 'undefined' && Notification.permission === 'granted');

  // Header API tag
  const keyedActive = [
    hasApi('adzunaId'), hasApi('jsearchKey'), hasApi('geminiKey'), hasApi('groqKey'),
    hasApi('emailjsPublic'), hasApi('hunterKey'), hasApi('abstractKey'),
    hasApi('careerOneStopKey'), !!getApi('ntfyTopic')
  ].filter(Boolean).length;
  const tag = document.getElementById('apiStatusTag');
  if (tag) {
    tag.style.display = '';
    tag.textContent = `${keyedActive + 3} APIs Active`;
  }

  const aiMode = document.getElementById('aiMode');
  if (aiMode) aiMode.style.display = (hasApi('geminiKey') || hasApi('groqKey')) ? '' : 'none';
}

export default { renderSettings };
