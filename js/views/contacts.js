/* ============================================================
   views/contacts.js — Contact management with email verification
   ============================================================ */

import { escapeHtml, uid } from '../utils.js';
import { verifyEmail as hunterVerify } from '../services/hunter-service.js';
import { sendEmail } from '../services/email-service.js';
import { getApi, hasApi } from '../services/api-keys.js';
import { toast } from '../components/toast.js';
import { EmptyState } from '../ui/empty-state.js';

/**
 * Render the contacts view.
 * @param {HTMLElement} container — section element
 * @param {object} state — state store
 */
export function renderContacts(container, state) {
  const contacts = state.get('contacts') || [];

  const tbody = container.querySelector('#contactsTable tbody');
  if (tbody) {
    if (contacts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6">${EmptyState({ icon: '\u{1F465}', title: 'No contacts yet', description: 'Track recruiters and hiring managers - verify emails with Hunter.io' })}</td></tr>`;
    } else {
      tbody.innerHTML = contacts.map(c => `
        <tr>
          <td contenteditable data-k="name" data-id="${c.id}">${escapeHtml(c.name || '')}</td>
          <td contenteditable data-k="email" data-id="${c.id}">${escapeHtml(c.email || '')}</td>
          <td>${c.verified === true
            ? '<span class="tag green" style="font-size:10px">Verified</span>'
            : c.verified === false
              ? '<span class="tag" style="font-size:10px;border-color:#ff0000;color:#ff3333">Invalid</span>'
              : '<span class="muted" style="font-size:10px">---</span>'
          }</td>
          <td contenteditable data-k="company" data-id="${c.id}">${escapeHtml(c.company || '')}</td>
          <td contenteditable data-k="notes" data-id="${c.id}" style="min-width:150px">${escapeHtml(c.notes || '')}</td>
          <td style="white-space:nowrap">
            <button class="btn small blue" data-id="${c.id}" data-act="email" title="Send email">EMAIL</button>
            <button class="btn small" data-id="${c.id}" data-act="verify" title="Verify email">VERIFY</button>
            <button class="btn danger small" data-id="${c.id}" data-act="del">DEL</button>
          </td>
        </tr>
      `).join('');
    }
  }

  // Add contact button
  const addBtn = container.querySelector('#addContact');
  if (addBtn) {
    addBtn.onclick = () => {
      const nameEl = container.querySelector('#contactName');
      const emailEl = container.querySelector('#contactEmail');
      const n = (nameEl?.value || '').trim();
      const e = (emailEl?.value || '').trim();
      if (!n && !e) return;
      const list = state.get('contacts') || [];
      list.push({ id: uid(), name: n, email: e, company: '', notes: '', verified: null });
      state.set('contacts', list);
      if (nameEl) nameEl.value = '';
      if (emailEl) emailEl.value = '';
      renderContacts(container, state);
    };
  }

  // Table event delegation
  const table = container.querySelector('#contactsTable');
  if (table) {
    table.onclick = async (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      const act = btn.getAttribute('data-act');
      const list = state.get('contacts') || [];

      if (act === 'del') {
        state.set('contacts', list.filter(x => x.id !== id));
        renderContacts(container, state);
      }

      if (act === 'verify') {
        const contact = list.find(c => c.id === id);
        if (!contact?.email) { toast('No email to verify', 'error'); return; }
        if (!hasApi('hunterKey')) { toast('Configure Hunter.io API key in Settings', 'error'); return; }
        toast('Verifying email...', 'info');
        try {
          const result = await hunterVerify(contact.email, getApi('hunterKey'));
          contact.verified = result.isDeliverable;
          state.set('contacts', list);
          renderContacts(container, state);
          toast(`Email ${contact.email}: ${result.result}`, result.isDeliverable ? 'success' : 'error');
        } catch (err) {
          toast('Verification failed: ' + err.message, 'error');
        }
      }

      if (act === 'email') {
        const contact = list.find(c => c.id === id);
        if (!contact?.email) { toast('No email address', 'error'); return; }
        if (!hasApi('emailjsPublic') || !hasApi('emailjsService') || !hasApi('emailjsTemplate')) {
          toast('Configure EmailJS in Settings first', 'error');
          return;
        }
        const subject = prompt('Email subject:', 'Following up on our conversation');
        if (!subject) return;
        const message = prompt('Email message:', `Hi ${contact.name || 'there'},\n\nI wanted to follow up on...`);
        if (!message) return;
        try {
          await sendEmail(getApi('emailjsService'), getApi('emailjsTemplate'), {
            to_email: contact.email,
            to_name: contact.name || '',
            subject,
            message
          }, getApi('emailjsPublic'));
          toast(`Email sent to ${contact.email}`, 'success');
        } catch (err) {
          toast('Email failed: ' + (err.text || err.message || err), 'error');
        }
      }
    };

    // Contenteditable blur saves
    table.addEventListener('blur', (e) => {
      if (e.target.hasAttribute('contenteditable')) {
        const id = e.target.getAttribute('data-id');
        const k = e.target.getAttribute('data-k');
        const list = state.get('contacts') || [];
        const rec = list.find(x => x.id === id);
        if (rec) {
          rec[k] = e.target.innerText.trim();
          state.set('contacts', list);
        }
      }
    }, true);
  }

  // Bulk verify button
  const verifyAllBtn = container.querySelector('#verifyEmailBtn');
  if (verifyAllBtn) {
    verifyAllBtn.onclick = async () => {
      if (!hasApi('hunterKey')) { toast('Configure Hunter.io key first', 'error'); return; }
      const list = state.get('contacts') || [];
      const unverified = list.filter(c => c.email && c.verified === null);
      if (unverified.length === 0) { toast('No unverified emails', 'info'); return; }
      toast(`Verifying ${unverified.length} emails...`, 'info');
      for (const c of unverified) {
        try {
          const result = await hunterVerify(c.email, getApi('hunterKey'));
          c.verified = result.isDeliverable;
          state.set('contacts', list);
          renderContacts(container, state);
        } catch (err) {
          toast(`Failed: ${c.email} - ${err.message}`, 'error');
        }
        await new Promise(r => setTimeout(r, 1500)); // rate limit
      }
    };
  }
}

export default { renderContacts };
