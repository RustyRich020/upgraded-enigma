/* ============================================================
   components/onboarding-tour.js — 6-step onboarding tour
   Styled for JobSync copper/professional theme
   ============================================================ */

import { STORAGE_KEYS } from '../config.js';

const STEPS = [
  {
    title: 'Navigation Sidebar',
    description: 'Use the sidebar to switch between Dashboard, Tracker, Job Search, AI Tools, and more.',
    target: 'nav'
  },
  {
    title: 'Dashboard Overview',
    description: 'Your dashboard shows pipeline status, source distribution, upcoming follow-ups, and salary benchmarks.',
    target: '#view-dashboard'
  },
  {
    title: 'Add a Job',
    description: 'Click the "+ JOB" button to add a new job to your tracker. Fill in the details and save.',
    target: '#addJobBtn'
  },
  {
    title: 'Job Search',
    description: 'Search all job boards at once with one click. Results are saved and can be filtered and sorted.',
    target: '[data-view="search"]'
  },
  {
    title: 'ATS Optimizer',
    description: 'Analyze your resume against job postings. See your ATS score, keyword gaps, and get AI suggestions.',
    target: '[data-view="ats"]'
  },
  {
    title: 'Settings',
    description: 'Configure API keys, manage your subscription tier, and view usage analytics.',
    target: '[data-view="settings"]'
  }
];

let currentStep = 0;
let spotlightOverlay = null;
let tourPopup = null;

/**
 * Check if the tour has already been completed.
 */
export function isTourCompleted() {
  return localStorage.getItem(STORAGE_KEYS.tourDone) === 'true';
}

/**
 * Start the onboarding tour.
 */
export function startTour() {
  currentStep = 0;
  createOverlay();
  showStep(0);
}

function createOverlay() {
  cleanup();

  spotlightOverlay = document.createElement('div');
  spotlightOverlay.id = 'tourOverlay';
  spotlightOverlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9998;transition:all 0.25s ease;';
  document.body.appendChild(spotlightOverlay);

  tourPopup = document.createElement('div');
  tourPopup.id = 'tourPopup';
  tourPopup.style.cssText = `
    position:fixed;z-index:10000;
    background:var(--color-surface, #242428);
    border:1px solid var(--color-surface-border, #333338);
    border-radius:12px;padding:20px;max-width:320px;
    color:var(--color-text, #E4E4E7);
    font-family:var(--font-body, 'DM Sans', sans-serif);
    box-shadow:0 8px 32px rgba(0,0,0,0.4);
  `;
  document.body.appendChild(tourPopup);

  spotlightOverlay.addEventListener('click', nextStep);
}

function showStep(index) {
  if (index >= STEPS.length) {
    completeTour();
    return;
  }

  const step = STEPS[index];
  currentStep = index;

  const target = document.querySelector(step.target);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const rect = target.getBoundingClientRect();

    spotlightOverlay.style.background = 'none';
    spotlightOverlay.style.boxShadow = '0 0 0 9999px rgba(0,0,0,0.6)';
    spotlightOverlay.style.position = 'fixed';
    spotlightOverlay.style.left = rect.left - 4 + 'px';
    spotlightOverlay.style.top = rect.top - 4 + 'px';
    spotlightOverlay.style.width = rect.width + 8 + 'px';
    spotlightOverlay.style.height = rect.height + 8 + 'px';
    spotlightOverlay.style.borderRadius = '12px';
    spotlightOverlay.style.border = '2px solid var(--color-primary, #D4874D)';

    const popupTop = rect.bottom + 12;
    const popupLeft = Math.min(rect.left, window.innerWidth - 340);
    tourPopup.style.top = (popupTop > window.innerHeight - 200 ? rect.top - 200 : popupTop) + 'px';
    tourPopup.style.left = Math.max(10, popupLeft) + 'px';
  }

  const progress = Math.round(((index + 1) / STEPS.length) * 100);

  tourPopup.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <span style="font-size:11px;color:var(--color-primary, #D4874D);font-weight:600;text-transform:uppercase;letter-spacing:1px;">
        Step ${index + 1} of ${STEPS.length}
      </span>
      <span style="font-size:11px;color:var(--color-text-dim, #A1A1AA);">${progress}%</span>
    </div>
    <div style="height:3px;background:var(--color-surface-border, #333);border-radius:4px;margin-bottom:14px;overflow:hidden;">
      <div style="width:${progress}%;height:100%;background:var(--color-primary, #D4874D);border-radius:4px;transition:width 0.3s;"></div>
    </div>
    <h4 style="color:var(--color-text-heading, #FAFAFA);margin-bottom:6px;font-size:15px;font-weight:600;font-family:var(--font-display, 'Instrument Sans', sans-serif);">${step.title}</h4>
    <p style="color:var(--color-text-dim, #A1A1AA);font-size:13px;line-height:1.6;margin-bottom:16px;">${step.description}</p>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button id="tourSkip" style="
        background:transparent;border:1px solid var(--color-surface-border, #333);
        color:var(--color-text-dim, #A1A1AA);padding:7px 14px;border-radius:8px;
        cursor:pointer;font-family:var(--font-body, 'DM Sans', sans-serif);font-size:12px;font-weight:600;
      ">Skip</button>
      <button id="tourNext" style="
        background:var(--color-primary, #D4874D);border:none;
        color:#1a1a1e;padding:7px 18px;border-radius:8px;
        cursor:pointer;font-family:var(--font-body, 'DM Sans', sans-serif);font-size:12px;font-weight:700;
      ">${index === STEPS.length - 1 ? 'Finish' : 'Next'}</button>
    </div>
  `;

  document.getElementById('tourSkip').addEventListener('click', completeTour);
  document.getElementById('tourNext').addEventListener('click', nextStep);
}

function nextStep() {
  showStep(currentStep + 1);
}

function completeTour() {
  localStorage.setItem(STORAGE_KEYS.tourDone, 'true');
  cleanup();
}

function cleanup() {
  if (spotlightOverlay) { spotlightOverlay.remove(); spotlightOverlay = null; }
  if (tourPopup) { tourPopup.remove(); tourPopup = null; }
}

export default { startTour, isTourCompleted };
