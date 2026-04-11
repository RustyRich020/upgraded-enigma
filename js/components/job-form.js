/* ============================================================
   components/job-form.js — Add/Edit job modal form
   ============================================================ */

import { showModal, hideModal } from './modal.js';
import { today } from '../utils.js';

/**
 * Initialize the job form modal with event listeners.
 * @param {Function} onSave — callback receiving the new job data object
 */
export function initJobForm(onSave) {
  const saveBtn = document.getElementById('saveJob');
  const closeBtn = document.getElementById('closeModal');
  const addBtn = document.getElementById('addJobBtn');
  const addBtn2 = document.getElementById('addJobBtn2');
  const errorEl = document.getElementById('jobFormError');
  const fieldIds = ['jobTitle', 'jobCompany', 'jobSalary', 'jobSource', 'jobFollow', 'jobUrl'];

  function clearError() {
    if (errorEl) errorEl.textContent = '';
  }

  function resetFields() {
    fieldIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const statusEl = document.getElementById('jobStatus');
    if (statusEl) statusEl.value = 'Saved';
    const followEl = document.getElementById('jobFollow');
    if (followEl) followEl.value = today(3);
    clearError();
  }

  function openForm() {
    resetFields();
    showModal('jobModal');
  }

  function closeForm() {
    hideModal('jobModal');
    clearError();
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
      if (!job.title || !job.company) {
        if (errorEl) errorEl.textContent = 'Add both a job title and company before saving.';
        const firstMissing = !job.title ? document.getElementById('jobTitle') : document.getElementById('jobCompany');
        firstMissing?.focus();
        return;
      }
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

  fieldIds.forEach(id => {
    document.getElementById(id)?.addEventListener('input', clearError);
  });
}

export default { initJobForm };
