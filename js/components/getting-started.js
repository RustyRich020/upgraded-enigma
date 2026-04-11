/* ============================================================
   components/getting-started.js — Dashboard checklist
   Progressive onboarding that guides users to first value.
   ============================================================ */

import { navigate } from '../router.js';

const STORAGE_KEY = 'tron_checklist';

const STEPS = [
  { key: 'accountCreated', label: 'Create your account', done: true, view: null },
  { key: 'profileSetup', label: 'Set up your profile', done: true, view: null },
  { key: 'firstJobAdded', label: 'Add your first job', cta: 'ADD JOB →', view: 'my-jobs', action: 'addJob' },
  { key: 'firstSearch', label: 'Try a job search', cta: 'SEARCH →', view: 'find-jobs' },
  { key: 'apiKeyConnected', label: 'Connect an AI key', cta: 'SETTINGS →', view: 'settings' },
  { key: 'resumeUploaded', label: 'Upload a resume', cta: 'UPLOAD →', view: 'my-profile' },
];

/**
 * Get checklist state from localStorage.
 */
export function getChecklist() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}

/**
 * Update a checklist item.
 */
export function completeChecklistItem(key) {
  const cl = getChecklist();
  cl[key] = true;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cl));
}

/**
 * Check if the checklist has been dismissed.
 */
export function isChecklistDismissed() {
  return getChecklist().dismissed === true;
}

/**
 * Dismiss the checklist.
 */
export function dismissChecklist() {
  const cl = getChecklist();
  cl.dismissed = true;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cl));
}

/**
 * Get completion percentage.
 */
export function getCompletionPercent() {
  const cl = getChecklist();
  const completed = STEPS.filter(s => cl[s.key] === true).length;
  return Math.round((completed / STEPS.length) * 100);
}

/**
 * Render the Getting Started checklist into a container element.
 * Returns the HTML string. Call this from dashboard.js.
 * @param {string} userName
 */
export function renderChecklistHTML(userName) {
  const cl = getChecklist();
  if (cl.dismissed) return '';

  const completed = STEPS.filter(s => cl[s.key] === true).length;
  const total = STEPS.length;
  const pct = Math.round((completed / total) * 100);

  if (completed === total) return ''; // All done, don't show

  return `
    <div class="checklist-card" id="gettingStarted">
      <div class="checklist-header">
        <div>
          <h3 style="margin-bottom:2px;font-size:var(--text-base);letter-spacing:0;">Getting Started</h3>
          <span class="muted">Welcome${userName ? ', ' + userName : ''}! Complete these to unlock JobSync.</span>
        </div>
        <button class="btn small ghost" id="checklistDismiss" style="flex-shrink:0;">DISMISS</button>
      </div>

      <div class="checklist-progress">
        <div class="checklist-progress-bar">
          <div class="checklist-progress-fill" style="width:${pct}%"></div>
        </div>
        <span class="checklist-progress-label">${completed}/${total} complete</span>
      </div>

      <div class="checklist-items">
        ${STEPS.map(step => {
          const done = cl[step.key] === true;
          return `
            <div class="checklist-item ${done ? 'done' : ''}">
              <div class="checklist-check">${done ? '✓' : ''}</div>
              <span class="checklist-label">${step.label}</span>
              ${!done && step.cta ? `<button class="btn small checklist-cta" data-view="${step.view}" data-action="${step.action || ''}">${step.cta}</button>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

/**
 * Bind event listeners on the rendered checklist.
 * Call this after inserting the HTML into the DOM.
 * @param {HTMLElement} container
 * @param {Function} onDismiss — callback when dismissed
 */
export function bindChecklistEvents(container, onDismiss) {
  // Dismiss button
  container.querySelector('#checklistDismiss')?.addEventListener('click', () => {
    dismissChecklist();
    const el = container.querySelector('#gettingStarted');
    if (el) el.style.display = 'none';
    if (onDismiss) onDismiss();
  });

  // CTA buttons
  container.querySelectorAll('.checklist-cta').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      const action = btn.dataset.action;
      if (view) navigate(view);
      if (action === 'addJob') {
        // Trigger the add job modal after navigation
        setTimeout(() => {
          const addBtn = document.getElementById('addJobBtn') || document.getElementById('addJobBtn2');
          if (addBtn) addBtn.click();
        }, 300);
      }
    });
  });
}

export default {
  getChecklist, completeChecklistItem, isChecklistDismissed,
  dismissChecklist, getCompletionPercent,
  renderChecklistHTML, bindChecklistEvents,
};
