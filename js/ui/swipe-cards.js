/**
 * SwipeCards — Responsive carousel for card grids.
 *
 * Activates only below a breakpoint (default 768px). On desktop, cards
 * stay in their normal CSS grid. On mobile, the container becomes a
 * horizontal scroll-snap carousel with dot indicators and keyboard nav.
 *
 * Uses native CSS scroll-snap — no JS animation libraries needed.
 *
 * Accessibility:
 *   - role="region" + aria-roledescription="carousel" on container
 *   - role="group"  + aria-roledescription="slide" on each card
 *   - aria-label on dot nav with "Slide N of M"
 *   - Arrow-key navigation between slides
 *   - IntersectionObserver for active dot tracking
 *
 * @example
 *   import { initSwipeCards } from '../ui/swipe-cards.js';
 *   initSwipeCards(container.querySelector('.glance-grid'), { label: 'Dashboard stats' });
 */

const MOBILE_BP = 768;
const STYLE_ID = 'swipe-cards-css';

/** Inject the shared CSS once */
function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    /* ===== SwipeCards: mobile-only carousel ===== */
    @media (max-width: ${MOBILE_BP}px) {
      .swipe-carousel {
        display: flex !important;
        grid-template-columns: unset !important;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        gap: 12px;
        padding-bottom: 4px;
        scrollbar-width: none;
      }
      .swipe-carousel::-webkit-scrollbar { display: none; }

      .swipe-carousel > * {
        flex: 0 0 85%;
        scroll-snap-align: center;
        min-width: 0;
      }
      /* For wider items like feature cards */
      .swipe-carousel.swipe-wide > * {
        flex: 0 0 90%;
      }

      .swipe-dots {
        display: flex !important;
        justify-content: center;
        align-items: center;
        gap: 6px;
        padding: 12px 0 4px;
        height: auto !important;
        min-height: 0 !important;
        max-height: 40px;
        overflow: visible;
      }
      .swipe-dot {
        width: 8px; height: 8px;
        border-radius: 50%;
        border: none;
        background: var(--color-surface-border);
        cursor: pointer;
        padding: 0;
        transition: all 0.2s;
      }
      .swipe-dot[aria-selected="true"] {
        background: var(--color-primary);
        transform: scale(1.25);
      }
    }

    /* Desktop: hide dots, keep normal grid */
    @media (min-width: ${MOBILE_BP + 1}px) {
      .swipe-dots { display: none; }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Initialize a swipe carousel on a container element.
 *
 * @param {HTMLElement} el - The grid container (e.g., .glance-grid or .lp-features)
 * @param {object} [opts]
 * @param {string} [opts.label='Card carousel'] - Accessible label for the region
 * @param {boolean} [opts.wide=false] - Use wider slides (90% vs 85%)
 * @returns {{ destroy: Function }} Cleanup handle
 */
export function initSwipeCards(el, opts = {}) {
  if (!el) return { destroy() {} };

  const { label = 'Card carousel', wide = false } = opts;
  const children = Array.from(el.children);
  if (children.length < 2) return { destroy() {} };

  ensureStyles();

  // --- ARIA on container ---
  el.classList.add('swipe-carousel');
  if (wide) el.classList.add('swipe-wide');
  el.setAttribute('role', 'region');
  el.setAttribute('aria-roledescription', 'carousel');
  el.setAttribute('aria-label', label);

  // --- ARIA on each card ---
  children.forEach((child, i) => {
    child.setAttribute('role', 'group');
    child.setAttribute('aria-roledescription', 'slide');
    child.setAttribute('aria-label', `Slide ${i + 1} of ${children.length}`);
  });

  // --- Dot indicators ---
  const dotsNav = document.createElement('div');
  dotsNav.className = 'swipe-dots';
  dotsNav.setAttribute('role', 'tablist');
  dotsNav.setAttribute('aria-label', `${label} navigation`);

  children.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'swipe-dot';
    dot.type = 'button';
    dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
    dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    dot.addEventListener('click', () => {
      children[i].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
    dotsNav.appendChild(dot);
  });

  // Insert dots directly after the carousel element
  el.insertAdjacentElement('afterend', dotsNav);
  const dots = Array.from(dotsNav.querySelectorAll('.swipe-dot'));

  // --- Track active slide via IntersectionObserver ---
  let currentIndex = 0;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          const idx = children.indexOf(entry.target);
          if (idx !== -1) {
            currentIndex = idx;
            dots.forEach((d, di) => d.setAttribute('aria-selected', di === idx ? 'true' : 'false'));
          }
        }
      });
    },
    { root: el, threshold: 0.5 }
  );

  children.forEach((child) => observer.observe(child));

  // --- Keyboard navigation ---
  function onKeydown(e) {
    if (window.innerWidth > MOBILE_BP) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(currentIndex + 1, children.length - 1);
      children[next].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = Math.max(currentIndex - 1, 0);
      children[prev].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  el.setAttribute('tabindex', '0');
  el.addEventListener('keydown', onKeydown);

  // --- Cleanup ---
  function destroy() {
    observer.disconnect();
    el.removeEventListener('keydown', onKeydown);
    el.classList.remove('swipe-carousel', 'swipe-wide');
    el.removeAttribute('role');
    el.removeAttribute('aria-roledescription');
    el.removeAttribute('aria-label');
    el.removeAttribute('tabindex');
    children.forEach((child) => {
      child.removeAttribute('role');
      child.removeAttribute('aria-roledescription');
      child.removeAttribute('aria-label');
    });
    dotsNav.remove();
  }

  return { destroy };
}

export default { initSwipeCards };
