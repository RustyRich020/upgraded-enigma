/* ============================================================
   views/settings.js — API key configuration (all 13 APIs)
   ============================================================ */

import { getApi, hasApi, saveAllKeys, clearKeys, loadKeys } from '../services/api-keys.js';
import { toast } from '../components/toast.js';
import { requestPermission } from '../services/notifications.js';
import { getUserTier, setUserTier, resetUsage } from '../services/usage-tracker.js';
import { renderPricingTable, renderUsageDashboard } from '../components/upgrade-banner.js';

/**
 * Render the settings view.
 */
export function renderSettings(container, apiKeys, onSave, onClear) {
  // All API key field mappings: DOM id → storage key
  const fields = {
    apiAdzunaId: 'adzunaId',
    apiAdzunaKey: 'adzunaKey',
    apiJSearchKey: 'jsearchKey',
    apiGeminiKey: 'geminiKey',
    apiGroqKey: 'groqKey',
    apiEmailjsPublic: 'emailjsPublic',
    apiEmailjsService: 'emailjsService',
    apiEmailjsTemplate: 'emailjsTemplate',
    apiHunterKey: 'hunterKey',
    apiAbstractKey: 'abstractKey',
    apiCareerOneStopKey: 'careerOneStopKey',
    apiCareerOneStopUser: 'careerOneStopUser',
    apiNtfyTopic: 'ntfyTopic'
  };

  Object.entries(fields).forEach(([elId, keyName]) => {
    const el = document.getElementById(elId);
    if (el) el.value = getApi(keyName);
  });

  updateStatuses();

  // Save button
  const saveBtn = document.getElementById('saveApiSettings');
  if (saveBtn) {
    saveBtn.onclick = () => {
      const keys = {};
      Object.entries(fields).forEach(([elId, keyName]) => {
        const el = document.getElementById(elId);
        if (el) keys[keyName] = el.value.trim();
      });
      saveAllKeys(keys);
      updateStatuses();
      toast('API settings saved!', 'success');
      if (onSave) onSave(keys);
    };
  }

  // Clear button
  const clearBtn = document.getElementById('clearApiSettings');
  if (clearBtn) {
    clearBtn.onclick = () => {
      if (!confirm('Clear all API keys?')) return;
      clearKeys();
      Object.keys(fields).forEach(elId => {
        const el = document.getElementById(elId);
        if (el) el.value = '';
      });
      updateStatuses();
      toast('All API keys cleared', 'info');
      if (onClear) onClear();
    };
  }

  // Request notification permission button
  const notifBtn = document.getElementById('requestNotifPerm');
  if (notifBtn) {
    notifBtn.onclick = async () => {
      const granted = await requestPermission();
      toast(granted ? 'Notifications enabled!' : 'Notification permission denied', granted ? 'success' : 'error');
      updateStatuses();
    };
  }

  // Render pricing table
  const pricingEl = document.getElementById('pricingSection');
  if (pricingEl) {
    pricingEl.innerHTML = renderPricingTable();
    // Bind tier selection buttons
    pricingEl.querySelectorAll('.pricing-select').forEach(btn => {
      btn.addEventListener('click', () => {
        const tier = btn.dataset.tier;
        setUserTier(tier);
        if (tier !== 'free') resetUsage();
        toast(`Switched to ${tier.toUpperCase()} tier`, 'success');
        pricingEl.innerHTML = renderPricingTable();
        // Re-bind buttons after re-render
        renderSettings(container, apiKeys, onSave, onClear);
      });
    });
  }

  // Render usage dashboard
  const usageEl = document.getElementById('usageDashboard');
  if (usageEl) {
    usageEl.innerHTML = renderUsageDashboard();
  }
}

function updateStatuses() {
  setStatus('adzunaStatus', hasApi('adzunaId') && hasApi('adzunaKey'));
  setStatus('jsearchStatus', hasApi('jsearchKey'));
  setStatus('geminiStatus', hasApi('geminiKey'));
  setStatus('groqStatus', hasApi('groqKey'));
  setStatus('emailjsStatus', hasApi('emailjsPublic'));
  setStatus('hunterStatus', hasApi('hunterKey'));
  setStatus('abstractStatus', hasApi('abstractKey'));
  setStatus('careerOneStopStatus', hasApi('careerOneStopKey'));
  setStatus('ntfyStatus', !!getApi('ntfyTopic'));
  setStatus('browserNotifStatus', typeof Notification !== 'undefined' && Notification.permission === 'granted');

  // Header API tag — count all active keyed APIs + always-free ones
  const keyedActive = [
    hasApi('adzunaId'), hasApi('jsearchKey'), hasApi('geminiKey'), hasApi('groqKey'),
    hasApi('emailjsPublic'), hasApi('hunterKey'), hasApi('abstractKey'),
    hasApi('careerOneStopKey'), !!getApi('ntfyTopic')
  ].filter(Boolean).length;
  const alwaysFree = 3; // Remotive, Arbeitnow, BLS (no key needed)
  const tag = document.getElementById('apiStatusTag');
  if (tag) {
    const total = keyedActive + alwaysFree;
    tag.style.display = '';
    tag.textContent = `${total} APIs Active`;
  }

  // AI mode indicator
  const aiMode = document.getElementById('aiMode');
  if (aiMode) aiMode.style.display = (hasApi('geminiKey') || hasApi('groqKey')) ? '' : 'none';
}

function setStatus(elId, active) {
  const el = document.getElementById(elId);
  if (el) el.className = 'api-status ' + (active ? 'active' : 'inactive');
}

export default { renderSettings };
