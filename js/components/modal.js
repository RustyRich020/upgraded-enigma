/* ============================================================
   components/modal.js — Modal show/hide helpers
   ============================================================ */

/**
 * Show a modal by its element ID.
 * @param {string} id — the modal element's ID
 */
export function showModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('show');
}

/**
 * Hide a modal by its element ID.
 * @param {string} id — the modal element's ID
 */
export function hideModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('show');
}

export default { showModal, hideModal };
