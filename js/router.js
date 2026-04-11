/* ============================================================
   router.js — Hash-based SPA router with auth guard
   ============================================================ */

import { manageFocusOnViewChange } from './ui/a11y.js';

const views = [
  'landing', 'auth', 'profile', 'dashboard',
  'find-jobs', 'my-jobs', 'my-profile',
  'tracker', 'search', 'agent', 'ai', 'ats', 'resume', 'companies',
  'contacts', 'insights', 'interviews', 'timeline', 'networking',
  'salary', 'report', 'settings'
];

const PUBLIC_ROUTES = new Set(['landing', 'auth']);
const viewRenderers = {};
let currentView = 'dashboard';
let authGuardFn = null;
const TITLES = {
  landing: 'Welcome',
  auth: 'Sign In',
  profile: 'Profile Setup',
  dashboard: 'Dashboard',
  'find-jobs': 'Find Jobs',
  'my-jobs': 'My Jobs',
  'my-profile': 'My Profile',
  settings: 'Settings'
};

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
  if (window.location.hash === '#' + view) {
    handleRoute();
    return;
  }
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

  // Toggle landing-specific chrome hiding
  document.body.classList.toggle('lp-active', view === 'landing');

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
    requestAnimationFrame(() => {
      manageFocusOnViewChange(target);
    });
  }

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
    if (btn.dataset.view === view) {
      btn.setAttribute('aria-current', 'page');
    } else {
      btn.removeAttribute('aria-current');
    }
  });

  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.toggle('hidden', PUBLIC_ROUTES.has(view));

  const main = document.getElementById('main-content');
  if (main) main.scrollTop = 0;

  document.title = `JobSink - ${TITLES[view] || view}`;
  window.dispatchEvent(new CustomEvent('routechange', { detail: { view } }));

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
