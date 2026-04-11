/**
 * Announces a message to screen readers via an aria-live region.
 *
 * Creates (or reuses) a visually-hidden live region and sets its text content.
 *
 * @param {string} message   - The announcement text.
 * @param {'polite'|'assertive'} [priority='polite'] - aria-live priority.
 */
export function announceToScreenReader(message, priority = 'polite') {
  const id = `__sr-announce-${priority}`;
  let region = document.getElementById(id);

  if (!region) {
    region = document.createElement('div');
    region.id = id;
    region.setAttribute('aria-live', priority);
    region.setAttribute('aria-atomic', 'true');
    region.setAttribute('role', priority === 'assertive' ? 'alert' : 'status');
    Object.assign(region.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0,0,0,0)',
      whiteSpace: 'nowrap',
      border: '0',
    });
    document.body.appendChild(region);
  }

  // Clear then set to ensure the screen reader detects a change.
  region.textContent = '';
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}

/**
 * Traps keyboard focus inside a container element.
 *
 * Returns a cleanup function that removes the event listener.
 *
 * @param {HTMLElement} containerEl - The element to trap focus within.
 * @returns {Function} cleanup - Call to release the focus trap.
 */
export function trapFocus(containerEl) {
  if (!containerEl) return () => {};

  const FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

  function handler(e) {
    if (e.key !== 'Tab') return;

    const focusable = Array.from(containerEl.querySelectorAll(FOCUSABLE));
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  containerEl.addEventListener('keydown', handler);

  // Focus the first focusable element when trapping begins.
  const initial = containerEl.querySelector(FOCUSABLE);
  if (initial) initial.focus();

  return () => containerEl.removeEventListener('keydown', handler);
}

/**
 * Manages focus when switching views in a single-page app.
 *
 * Finds the first `<h2>` in the view element, makes it programmatically
 * focusable, and moves focus to it so screen readers announce the new context.
 *
 * @param {HTMLElement} viewEl - The newly-active view container.
 */
export function manageFocusOnViewChange(viewEl) {
  if (!viewEl) return;

  const heading = viewEl.querySelector('h2');
  if (heading) {
    if (!heading.hasAttribute('tabindex')) {
      heading.setAttribute('tabindex', '-1');
    }
    heading.focus();
  } else {
    // Fallback: focus the view container itself.
    if (!viewEl.hasAttribute('tabindex')) {
      viewEl.setAttribute('tabindex', '-1');
    }
    viewEl.focus();
  }
}

/**
 * Syncs visual and accessibility state for a tablist.
 *
 * @param {HTMLElement} tabBar
 * @param {string} activeTab
 */
export function setActiveTab(tabBar, activeTab) {
  if (!tabBar) return;

  tabBar.querySelectorAll('[role="tab"]').forEach(tab => {
    const isActive = tab.dataset.tab === activeTab;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    tab.setAttribute('tabindex', isActive ? '0' : '-1');
  });
}

/**
 * Adds arrow-key tab navigation to a tablist.
 *
 * @param {HTMLElement} tabBar
 * @param {(tabId: string) => void} onSelect
 * @returns {Function}
 */
export function enableTabKeyboardNavigation(tabBar, onSelect) {
  if (!tabBar) return () => {};

  function handler(event) {
    const tabs = Array.from(tabBar.querySelectorAll('[role="tab"]'));
    if (!tabs.length) return;

    const activeElement = document.activeElement?.closest?.('[role="tab"]');
    const fallbackTab = tabBar.querySelector('[aria-selected="true"]');
    const currentIndex = Math.max(0, tabs.indexOf(activeElement || fallbackTab));
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;
    else if (event.key === 'Enter' || event.key === ' ') {
      const focusedTab = activeElement || tabs[currentIndex];
      if (focusedTab?.dataset.tab) {
        event.preventDefault();
        onSelect(focusedTab.dataset.tab);
      }
      return;
    } else {
      return;
    }

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    if (!nextTab) return;
    nextTab.focus();
    if (nextTab.dataset.tab) {
      onSelect(nextTab.dataset.tab);
      announceToScreenReader(`${nextTab.textContent?.trim() || 'Tab'} selected`);
    }
  }

  tabBar.addEventListener('keydown', handler);
  return () => tabBar.removeEventListener('keydown', handler);
}
