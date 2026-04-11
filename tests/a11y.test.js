// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { enableTabKeyboardNavigation, setActiveTab } from '../js/ui/a11y.js';

describe('setActiveTab', () => {
  it('updates active tab state and tabindex values', () => {
    document.body.innerHTML = `
      <div id="tabs" role="tablist">
        <button role="tab" data-tab="one">One</button>
        <button role="tab" data-tab="two">Two</button>
      </div>
    `;

    const tabBar = document.getElementById('tabs');
    setActiveTab(tabBar, 'two');

    const [one, two] = tabBar.querySelectorAll('[role="tab"]');
    expect(one.getAttribute('aria-selected')).toBe('false');
    expect(one.getAttribute('tabindex')).toBe('-1');
    expect(two.getAttribute('aria-selected')).toBe('true');
    expect(two.getAttribute('tabindex')).toBe('0');
  });
});

describe('enableTabKeyboardNavigation', () => {
  it('activates the next tab with arrow keys', () => {
    document.body.innerHTML = `
      <div id="tabs" role="tablist">
        <button role="tab" data-tab="one" aria-selected="true" tabindex="0">One</button>
        <button role="tab" data-tab="two" aria-selected="false" tabindex="-1">Two</button>
      </div>
    `;

    const tabBar = document.getElementById('tabs');
    const onSelect = vi.fn();
    enableTabKeyboardNavigation(tabBar, onSelect);

    tabBar.querySelector('[data-tab="one"]').focus();
    tabBar.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

    expect(onSelect).toHaveBeenCalledWith('two');
  });
});
