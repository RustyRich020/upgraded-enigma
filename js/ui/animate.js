/**
 * Animates a numeric counter from `from` to `to` inside the given element.
 *
 * Uses requestAnimationFrame for smooth 60 fps updates.
 *
 * @param {HTMLElement} element  - Target element whose textContent will be updated.
 * @param {number}      from    - Starting number.
 * @param {number}      to      - Ending number.
 * @param {number}      [duration=800] - Animation duration in ms.
 */
export function animateCount(element, from, to, duration = 800) {
  if (!element) return;

  const start = performance.now();
  const diff = to - from;
  const isInteger = Number.isInteger(from) && Number.isInteger(to);

  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic for a smooth deceleration.
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = from + diff * eased;

    element.textContent = isInteger ? Math.round(current).toLocaleString() : current.toFixed(1);

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}

/**
 * Sets a `--i` CSS custom property on each matched child for stagger animations.
 *
 * CSS can then use: `animation-delay: calc(var(--i) * 60ms);`
 *
 * @param {HTMLElement} container - Parent element.
 * @param {string}      selector - CSS selector for child elements.
 * @param {number}      [delayMs=60] - Base delay per item (stored as multiplier via --i).
 */
export function staggerChildren(container, selector, delayMs = 60) {
  if (!container) return;

  const children = container.querySelectorAll(selector);
  children.forEach((child, index) => {
    child.style.setProperty('--i', index);
    child.style.animationDelay = `${index * delayMs}ms`;
  });
}
