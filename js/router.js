/* ============================================================
   router.js — Hash-based SPA router
   ============================================================ */

const views = [
  'landing', 'profile', 'dashboard', 'tracker', 'search',
  'ai', 'resume', 'companies', 'contacts', 'insights', 'settings'
];

const viewRenderers = {};
let currentView = 'dashboard';

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
 * Handle hash change: hide all sections, show target, update nav.
 */
function handleRoute() {
  const hash = window.location.hash.replace('#', '') || 'dashboard';
  const view = views.includes(hash) ? hash : 'dashboard';
  currentView = view;

  // Hide all view sections
  document.querySelectorAll('main > section').forEach(s => {
    s.classList.add('hidden');
  });

  // Show the target section
  const target = document.getElementById('view-' + view);
  if (target) {
    target.classList.remove('hidden');
  }

  // Update nav active state
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

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
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view) navigate(view);
    });
  });

  // Initial route
  handleRoute();
}

export default { registerView, navigate, getCurrentView, init };
