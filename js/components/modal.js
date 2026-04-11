/* ============================================================
   components/modal.js — Modal show/hide helpers
   ============================================================ */

import { trapFocus } from '../ui/a11y.js';

let activeModalId = null;
let releaseFocus = null;
let previousFocus = null;
let escapeHandler = null;

/**
 * Show a modal by its element ID.
 * @param {string} id — the modal element's ID
 */
export function showModal(id) {
  const el = document.getElementById(id);
  if (!el) return;

  if (activeModalId && activeModalId !== id) hideModal(activeModalId);

  const content = el.querySelector('.content');
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  el.classList.add('show');
  el.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');

  if (content) {
    content.setAttribute('role', 'dialog');
    content.setAttribute('aria-modal', 'true');
    releaseFocus = trapFocus(content);
  }

  escapeHandler = (event) => {
    if (event.key === 'Escape') hideModal(id);
  };
  document.addEventListener('keydown', escapeHandler);
  activeModalId = id;
}

/**
 * Hide a modal by its element ID.
 * @param {string} id — the modal element's ID
 */
export function hideModal(id) {
  const el = document.getElementById(id);
  if (!el) return;

  el.classList.remove('show');
  el.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');

  if (releaseFocus) {
    releaseFocus();
    releaseFocus = null;
  }

  if (escapeHandler) {
    document.removeEventListener('keydown', escapeHandler);
    escapeHandler = null;
  }

  if (previousFocus) previousFocus.focus();
  previousFocus = null;
  activeModalId = null;
}

export default { showModal, hideModal };
