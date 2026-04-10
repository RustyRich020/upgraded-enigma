/* ============================================================
   router.js — Hash-based SPA router with auth guard
   ============================================================ */

const views = [
  'landing', 'auth', 'profile', 'dashboard', 'tracker', 'search', 'agent',
  'ai', 'ats', 'resume', 'companies', 'contacts', 'insights',
  'interviews', 'timeline', 'networking', 'salary', 'report',
  'settings'
];

const PUBLIC_ROUTES = new Set(['landing', 'auth']);
const viewRenderers = {};
let currentView = 'dashboard';
let authGuardFn = null;

/**
 * Set an auth guard function. Returns true if user is authenticated.
 */
export function setAuthGuard(fn) {
  authGuardFn = fn;
}

/**
 * Register a render function for a view.
 */
export function registerView(name, renderFn) {
  viewRenderers[name] = renderFn;
}

/**
 * Navigate to a specific view by setting the hash.
 */
export function navigate(view) {
  window.location.hash = '#' + view;
}

/**
 * Get the currently active view name.
 */
export function getCurrentView() {
  return currentView;
}

/**
 * Handle hash change: auth guard, hide all sections, show target, update nav.
 */
function handleRoute() {
  const hash = window.location.hash.replace('#', '') || 'dashboard';
  const view = views.includes(hash) ? hash : 'dashboard';

  // Auth guard: redirect unauthenticated users to landing
  if (!PUBLIC_ROUTES.has(view) && authGuardFn && !authGuardFn()) {
    window.location.hash = '#landing';
    return;
  }

  currentView = view;

  // Toggle auth-mode class on body (hides header actions on public pages)
  document.body.classList.toggle('auth-mode', PUBLIC_ROUTES.has(view));

  // Hide all view sections
  document.querySelectorAll('main > section').forEach(s => {
    s.classList.add('hidden');
  });

  // Show the target section with fade-in animation
  const target = document.getElementById('view-' + view);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('view-enter');
    target.addEventListener('animationend', () => target.classList.remove('view-enter'), { once: true });
    // Accessibility: focus the view heading
    requestAnimationFrame(() => {
      const heading = target.querySelector('h2');
      if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
    });
  }

  // Update nav active state
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  // Hide sidebar on public routes
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.toggle('hidden', PUBLIC_ROUTES.has(view));

  // Call the view's render function if registered
  if (viewRenderers[view]) {
    try {
      viewRenderers[view]();
    } catch (e) {
      console.error(`Error rendering view "${view}":`, e);
    }
  }
}

/**
 * Initialize the router. Sets up hash change listeners and nav button clicks.
 */
export function init() {
  window.addEventListener('hashchange', handleRoute);

  // Bind nav buttons
  document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view) navigate(view);
    });
  });

  // Initial route
  handleRoute();
}

export default { registerView, navigate, getCurrentView, setAuthGuard, init };
