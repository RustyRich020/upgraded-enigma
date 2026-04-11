/* ============================================================
   components/sidebar.js — Mobile sidebar / hamburger toggle
   ============================================================ */

/**
 * Initialize sidebar behavior: hamburger toggle for mobile, nav click handling, overlay.
 */
export function initSidebar() {
  const nav = document.getElementById('sidebar');
  const hamburger = document.getElementById('hamburgerBtn');
  const overlay = document.getElementById('sidebarOverlay');
  if (!nav || !hamburger || !overlay) return;

  function isMobile() {
    return window.innerWidth <= 768;
  }

  function setOpen(open) {
    const shouldShow = isMobile() && open;
    nav.classList.toggle('open', shouldShow);
    overlay.classList.toggle('show', shouldShow);
    document.body.classList.toggle('nav-open', shouldShow);
    document.body.style.overflow = shouldShow ? 'hidden' : '';
    hamburger.setAttribute('aria-expanded', shouldShow ? 'true' : 'false');
    overlay.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
  }

  function syncForViewport() {
    if (!isMobile()) {
      setOpen(false);
    }
  }

  hamburger.setAttribute('aria-controls', 'sidebar');
  hamburger.setAttribute('aria-expanded', 'false');
  overlay.setAttribute('aria-hidden', 'true');

  hamburger.addEventListener('click', () => {
    setOpen(!nav.classList.contains('open'));
  });

  overlay.addEventListener('click', () => setOpen(false));

  nav.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (isMobile()) setOpen(false);
    });
  });

  window.addEventListener('resize', syncForViewport);
  window.addEventListener('routechange', () => setOpen(false));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });

  syncForViewport();
}

export default { initSidebar };
