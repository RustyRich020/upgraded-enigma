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
      <div class="landing-logo">
        <svg width="48" height="48" viewBox="0 0 40 40" fill="none">
          <path d="M20 6c-1.5 0-2.5 1-2.5 2.5v4c0 .8-.4 1.5-1 2l-1 .8c-.8.5-1.5 1.5-1.5 2.7v2h12v-2c0-1.2-.7-2.2-1.5-2.7l-1-.8c-.6-.5-1-1.2-1-2v-4C22.5 7 21.5 6 20 6z" fill="var(--color-primary)"/>
          <path d="M12 22h16v3c0 1.7-1.3 3-3 3h-2v4h-6v-4h-2c-1.7 0-3-1.3-3-3v-3z" fill="var(--color-primary)" opacity="0.6"/>
          <circle cx="17" cy="18.5" r="0.8" fill="var(--color-bg)"/>
          <circle cx="20" cy="19.5" r="0.8" fill="var(--color-bg)"/>
          <circle cx="23" cy="18.5" r="0.8" fill="var(--color-bg)"/>
        </svg>
      </div>
      <h1 class="landing-title">JOBSYNC</h1>
      <p class="landing-subtitle">Your Career, Automated.</p>

      <div class="landing-features">
        <div class="feature-card">
          <div class="feature-icon" style="font-size:28px">📊</div>
          <h3>Smart Tracking</h3>
          <p>Kanban board, pipeline analytics, follow-up reminders, and CSV import/export.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon" style="font-size:28px">🤖</div>
          <h3>AI-Powered Analysis</h3>
          <p>Resume-to-JD matching via Google Gemini, AI cover letter generation, and skill gap detection.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon" style="font-size:28px">🔍</div>
          <h3>Real-Time Job Search</h3>
          <p>Search 4 job board APIs simultaneously. Auto-add results to your tracker with one click.</p>
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
