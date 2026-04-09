/* ============================================================
   components/toast.js — Toast notification system
   ============================================================ */

/**
 * Show a toast notification message.
 * @param {string} msg — message text
 * @param {string} type — 'info' | 'success' | 'error'
 * @param {number} duration — ms before auto-removal
 */
export function toast(msg, type = 'info', duration = 4000) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(100%)';
    el.style.transition = 'all 0.3s ease-out';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

export default { toast };
