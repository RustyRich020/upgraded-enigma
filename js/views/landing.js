/* ============================================================
   views/landing.js — Landing / hero page with auth entry points
   ============================================================ */

import { navigate } from '../router.js';
import { signInAnonymously } from '../firebase/auth.js';
import { STORAGE_KEYS } from '../config.js';

/**
 * Render the landing page with hero section and auth entry points.
 * @param {HTMLElement} container — the section element to render into
 */
export function renderLanding(container) {
  container.innerHTML = `
    <div class="landing-hero">
      <div class="landing-logo"><div class="logo-text">T</div></div>
      <h1 class="landing-title">JOBGRID PRO</h1>
      <p class="landing-subtitle">Track. Analyze. Land the Role.</p>

      <div class="landing-features">
        <div class="feature-card">
          <div class="feature-icon">&#9670;</div>
          <h3>SMART TRACKING</h3>
          <p>Kanban board, pipeline analytics, follow-up reminders, and CSV import/export.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">&#9670;</div>
          <h3>AI-POWERED ANALYSIS</h3>
          <p>Resume-to-JD matching via Google Gemini, AI cover letter generation, and skill gap detection.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">&#9670;</div>
          <h3>REAL-TIME JOB SEARCH</h3>
          <p>Search Remotive and Adzuna APIs, auto-add listings to your tracker with one click.</p>
        </div>
      </div>

      <div class="landing-actions">
        <button class="btn brand large" id="landingSignUp">CREATE ACCOUNT</button>
        <button class="btn ghost large" id="landingSignIn">SIGN IN</button>
      </div>

      <button class="landing-skip" id="landingGuest">Continue as guest — no account needed</button>
    </div>
  `;

  container.querySelector('#landingSignUp')?.addEventListener('click', () => {
    sessionStorage.setItem('authMode', 'signup');
    navigate('auth');
  });

  container.querySelector('#landingSignIn')?.addEventListener('click', () => {
    sessionStorage.setItem('authMode', 'signin');
    navigate('auth');
  });

  container.querySelector('#landingGuest')?.addEventListener('click', async () => {
    const user = await signInAnonymously();
    if (user) {
      localStorage.setItem(STORAGE_KEYS.onboarded, 'true');
      navigate('dashboard');
    }
  });
}

export default { renderLanding };
