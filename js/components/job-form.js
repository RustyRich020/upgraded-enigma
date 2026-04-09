/* ============================================================
   components/job-form.js — Add/Edit job modal form
   ============================================================ */

import { showModal, hideModal } from './modal.js';

/**
 * Initialize the job form modal with event listeners.
 * @param {Function} onSave — callback receiving the new job data object
 */
export function initJobForm(onSave) {
  const saveBtn = document.getElementById('saveJob');
  const closeBtn = document.getElementById('closeModal');
  const addBtn = document.getElementById('addJobBtn');
  const addBtn2 = document.getElementById('addJobBtn2');

  function openForm() {
    showModal('jobModal');
  }

  function closeForm() {
    hideModal('jobModal');
    // Clear all fields
    const fields = ['jobTitle', 'jobCompany', 'jobSalary', 'jobSource', 'jobFollow', 'jobUrl'];
    fields.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const statusEl = document.getElementById('jobStatus');
    if (statusEl) statusEl.value = 'Saved';
  }

  if (addBtn) addBtn.addEventListener('click', openForm);
  if (addBtn2) addBtn2.addEventListener('click', openForm);
  if (closeBtn) closeBtn.addEventListener('click', closeForm);

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const job = {
        title: (document.getElementById('jobTitle')?.value || '').trim(),
        company: (document.getElementById('jobCompany')?.value || '').trim(),
        status: document.getElementById('jobStatus')?.value || 'Saved',
        salary: (document.getElementById('jobSalary')?.value || '').trim(),
        source: (document.getElementById('jobSource')?.value || '').trim(),
        follow: (document.getElementById('jobFollow')?.value || '').trim(),
        url: (document.getElementById('jobUrl')?.value || '').trim()
      };
      if (onSave) onSave(job);
      closeForm();
    });
  }

  // Close on backdrop click
  const modal = document.getElementById('jobModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeForm();
    });
  }
}

export default { initJobForm };
