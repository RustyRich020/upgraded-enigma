/* ============================================================
   views/settings.js — API key configuration
   ============================================================ */

import { getApi, hasApi, saveAllKeys, clearKeys, loadKeys } from '../services/api-keys.js';
import { toast } from '../components/toast.js';
import { requestPermission } from '../services/notifications.js';

/**
 * Render the settings view.
 * @param {HTMLElement} container — section element
 * @param {object} apiKeys — current keys object (unused, we read from service)
 * @param {Function} onSave — called after save
 * @param {Function} onClear — called after clear
 */
export function renderSettings(container, apiKeys, onSave, onClear) {
  // Populate fields from stored keys
  const fields = {
    apiAdzunaId: 'adzunaId',
    apiAdzunaKey: 'adzunaKey',
    apiGeminiKey: 'geminiKey',
    apiEmailjsPublic: 'emailjsPublic',
    apiEmailjsService: 'emailjsService',
    apiEmailjsTemplate: 'emailjsTemplate',
    apiHunterKey: 'hunterKey',
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
}

function updateStatuses() {
  setStatus('adzunaStatus', hasApi('adzunaId') && hasApi('adzunaKey'));
  setStatus('geminiStatus', hasApi('geminiKey'));
  setStatus('emailjsStatus', hasApi('emailjsPublic'));
  setStatus('hunterStatus', hasApi('hunterKey'));
  setStatus('ntfyStatus', !!getApi('ntfyTopic'));
  setStatus('browserNotifStatus', typeof Notification !== 'undefined' && Notification.permission === 'granted');

  // Header API tag
  const activeCount = [
    hasApi('adzunaId'), hasApi('geminiKey'), hasApi('emailjsPublic'),
    hasApi('hunterKey'), !!getApi('ntfyTopic')
  ].filter(Boolean).length;
  const tag = document.getElementById('apiStatusTag');
  if (tag) {
    if (activeCount > 0) {
      tag.style.display = '';
      tag.textContent = `${activeCount + 1} APIs Active`; // +1 for Remotive
    } else {
      tag.style.display = 'none';
    }
  }

  // AI mode indicator
  const aiMode = document.getElementById('aiMode');
  if (aiMode) aiMode.style.display = hasApi('geminiKey') ? '' : 'none';
}

function setStatus(elId, active) {
  const el = document.getElementById(elId);
  if (el) el.className = 'api-status ' + (active ? 'active' : 'inactive');
}

export default { renderSettings };
