// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock a11y functions before importing router
vi.mock('../js/ui/a11y.js', () => ({
  manageFocusOnViewChange: vi.fn(),
  announceToScreenReader: vi.fn(),
}));

import { init, navigate, getCurrentView, registerView, setAuthGuard } from '../js/router.js';

/**
 * Helper: build a minimal DOM that the router expects.
 * Creates a <main> with <section> elements for each view.
 */
function buildDOM(viewNames) {
  const main = document.createElement('main');
  main.id = 'main-content';
  for (const name of viewNames) {
    const section = document.createElement('section');
    section.id = `view-${name}`;
    section.classList.add('hidden');
    main.appendChild(section);
  }
  document.body.appendChild(main);
}

/**
 * Navigate and synchronously trigger the hashchange handler.
 * In jsdom, hashchange fires asynchronously; we force it.
 */
function navigateSync(view) {
  navigate(view);
  window.dispatchEvent(new Event('hashchange'));
}

describe('Router', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    document.title = '';
    window.location.hash = '';

    // Reset auth guard
    setAuthGuard(null);
  });

  // ── navigate ────────────────────────────────────────────────

  describe('navigate', () => {
    it('sets window.location.hash correctly', () => {
      buildDOM(['dashboard', 'settings']);
      init();

      navigate('settings');
      expect(window.location.hash).toBe('#settings');
    });

    it('getCurrentView returns the navigated view', () => {
      buildDOM(['dashboard', 'settings']);
      init();

      navigateSync('settings');
      expect(getCurrentView()).toBe('settings');
    });

    it('defaults to dashboard for unknown hash values', () => {
      buildDOM(['dashboard']);
      window.location.hash = '#nonexistent';
      init();

      expect(getCurrentView()).toBe('dashboard');
    });
  });

  // ── Auth guard ──────────────────────────────────────────────

  describe('Auth guard', () => {
    it('without guard set, all views are accessible', () => {
      buildDOM(['dashboard', 'settings', 'landing']);
      init();

      navigateSync('settings');
      expect(getCurrentView()).toBe('settings');

      navigateSync('dashboard');
      expect(getCurrentView()).toBe('dashboard');
    });

    it('with guard returning true, protected views are accessible', () => {
      buildDOM(['dashboard', 'settings']);
      setAuthGuard(() => true);
      init();

      navigateSync('settings');
      expect(getCurrentView()).toBe('settings');
    });

    it('with guard returning false, redirects to landing', () => {
      buildDOM(['dashboard', 'landing', 'settings']);
      setAuthGuard(() => false);
      init();

      navigateSync('settings');
      // Guard redirects to #landing, fire hashchange again for the redirect
      window.dispatchEvent(new Event('hashchange'));
      expect(window.location.hash).toBe('#landing');
      expect(getCurrentView()).toBe('landing');
    });

    it('PUBLIC_ROUTES (landing, auth) bypass guard', () => {
      buildDOM(['landing', 'auth', 'dashboard']);
      setAuthGuard(() => false);
      init();

      navigateSync('landing');
      expect(getCurrentView()).toBe('landing');

      navigateSync('auth');
      expect(getCurrentView()).toBe('auth');
    });

    it('setAuthGuard accepts a function', () => {
      const guardFn = vi.fn(() => true);
      setAuthGuard(guardFn);

      buildDOM(['dashboard', 'settings']);
      init();

      navigateSync('settings');
      expect(guardFn).toHaveBeenCalled();
    });
  });

  // ── View registration ──────────────────────────────────────

  describe('View registration', () => {
    it('registerView stores a render function that gets called', () => {
      buildDOM(['dashboard']);
      const renderFn = vi.fn();
      registerView('dashboard', renderFn);
      init();

      // init calls handleRoute which renders dashboard
      expect(renderFn).toHaveBeenCalled();
    });

    it('multiple views can be registered', () => {
      buildDOM(['dashboard', 'settings', 'landing']);
      const renderDashboard = vi.fn();
      const renderSettings = vi.fn();
      registerView('dashboard', renderDashboard);
      registerView('settings', renderSettings);
      init();

      navigateSync('settings');
      expect(renderSettings).toHaveBeenCalled();
    });

    it('getCurrentView returns the current view name after navigation', () => {
      buildDOM(['dashboard', 'find-jobs']);
      init();

      navigateSync('find-jobs');
      expect(getCurrentView()).toBe('find-jobs');
    });

    it('renderer errors are caught and do not break routing', () => {
      buildDOM(['dashboard', 'settings']);
      const badRenderer = vi.fn(() => { throw new Error('render failed'); });
      registerView('settings', badRenderer);
      init();

      // Should not throw
      navigateSync('settings');
      expect(getCurrentView()).toBe('settings');
      expect(badRenderer).toHaveBeenCalled();
    });
  });

  // ── DOM updates ────────────────────────────────────────────

  describe('DOM updates', () => {
    it('shows the target section and hides others', () => {
      buildDOM(['dashboard', 'settings', 'landing']);
      init();

      // After init, default view (dashboard) should be visible
      const dashboard = document.getElementById('view-dashboard');
      const settings = document.getElementById('view-settings');

      expect(dashboard.classList.contains('hidden')).toBe(false);
      expect(settings.classList.contains('hidden')).toBe(true);
    });

    it('document.title updates on navigation', () => {
      buildDOM(['dashboard', 'settings']);
      init();

      expect(document.title).toBe('JobSynk - Dashboard');

      navigateSync('settings');
      expect(document.title).toBe('JobSynk - Settings');
    });

    it('dispatches a routechange custom event', () => {
      buildDOM(['dashboard', 'settings']);
      init();

      const handler = vi.fn();
      window.addEventListener('routechange', handler);

      navigateSync('settings');
      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].detail.view).toBe('settings');

      window.removeEventListener('routechange', handler);
    });
  });
});
