/* ============================================================
   components/onboarding-tour.js — 6-step onboarding tour
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
    description: 'Search for remote jobs via Remotive (free) or Adzuna (with API key). Add results directly to your tracker.',
    target: '[data-view="search"]'
  },
  {
    title: 'AI-Powered Tools',
    description: 'Analyze job descriptions against your resume, generate cover letters, and parse JDs — locally or with Gemini AI.',
    target: '[data-view="ai"]'
  },
  {
    title: 'Settings & API Keys',
    description: 'Configure API keys for Adzuna, Gemini, EmailJS, Hunter.io, and notifications to unlock all features.',
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
  // Remove any existing tour elements
  cleanup();

  spotlightOverlay = document.createElement('div');
  spotlightOverlay.id = 'tourOverlay';
  spotlightOverlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9998;transition:all 0.3s;';
  document.body.appendChild(spotlightOverlay);

  tourPopup = document.createElement('div');
  tourPopup.id = 'tourPopup';
  tourPopup.style.cssText = 'position:fixed;z-index:10000;background:#111;border:2px solid #ff0000;border-radius:8px;padding:20px;max-width:340px;color:#fff;font-family:Orbitron,sans-serif;box-shadow:0 0 40px rgba(255,0,0,0.4);';
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

  // Highlight the target element
  const target = document.querySelector(step.target);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const rect = target.getBoundingClientRect();

    // Create a spotlight cutout effect via box-shadow
    spotlightOverlay.style.background = 'none';
    spotlightOverlay.style.boxShadow = `0 0 0 9999px rgba(0,0,0,0.75)`;
    spotlightOverlay.style.position = 'fixed';
    spotlightOverlay.style.left = rect.left - 4 + 'px';
    spotlightOverlay.style.top = rect.top - 4 + 'px';
    spotlightOverlay.style.width = rect.width + 8 + 'px';
    spotlightOverlay.style.height = rect.height + 8 + 'px';
    spotlightOverlay.style.borderRadius = '8px';
    spotlightOverlay.style.border = '2px solid #ff0000';

    // Position the popup
    const popupTop = rect.bottom + 12;
    const popupLeft = Math.min(rect.left, window.innerWidth - 360);
    tourPopup.style.top = (popupTop > window.innerHeight - 200 ? rect.top - 180 : popupTop) + 'px';
    tourPopup.style.left = Math.max(10, popupLeft) + 'px';
  }

  tourPopup.innerHTML = `
    <div style="font-size:10px;color:#ff0000;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">
      Step ${index + 1} of ${STEPS.length}
    </div>
    <h4 style="color:#ff0000;margin-bottom:8px;font-size:14px;">${step.title}</h4>
    <p style="color:#e0e0e0;font-size:12px;line-height:1.5;margin-bottom:16px;">${step.description}</p>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button id="tourSkip" style="background:transparent;border:1px dashed #555;color:#808080;padding:6px 12px;border-radius:4px;cursor:pointer;font-family:Orbitron,sans-serif;font-size:11px;">SKIP</button>
      <button id="tourNext" style="background:#ff0000;border:none;color:#fff;padding:6px 16px;border-radius:4px;cursor:pointer;font-family:Orbitron,sans-serif;font-size:11px;font-weight:700;">
        ${index === STEPS.length - 1 ? 'FINISH' : 'NEXT'}
      </button>
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
