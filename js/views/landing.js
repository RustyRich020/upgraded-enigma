/* ============================================================
   views/landing.js — Premium landing page
   Clean, competitive SaaS landing with social proof
   ============================================================ */

import { navigate } from '../router.js';
import { signInAnonymously } from '../firebase/auth.js';
import { STORAGE_KEYS } from '../config.js';

export function renderLanding(container) {
  container.innerHTML = `
    <div class="landing-hero">
      <div class="landing-shell">
        <div class="landing-logo">
          <svg width="44" height="44" viewBox="0 0 40 40" fill="none">
            <path d="M20 6c-1.5 0-2.5 1-2.5 2.5v4c0 .8-.4 1.5-1 2l-1 .8c-.8.5-1.5 1.5-1.5 2.7v2h12v-2c0-1.2-.7-2.2-1.5-2.7l-1-.8c-.6-.5-1-1.2-1-2v-4C22.5 7 21.5 6 20 6z" fill="var(--color-primary)"/>
            <path d="M12 22h16v3c0 1.7-1.3 3-3 3h-2v4h-6v-4h-2c-1.7 0-3-1.3-3-3v-3z" fill="var(--color-primary)" opacity="0.6"/>
            <circle cx="17" cy="18.5" r="0.8" fill="var(--color-bg)"/>
            <circle cx="20" cy="19.5" r="0.8" fill="var(--color-bg)"/>
            <circle cx="23" cy="18.5" r="0.8" fill="var(--color-bg)"/>
          </svg>
        </div>

        <div class="landing-badges">
          <span class="tag">Job Search</span>
          <span class="tag green">ATS Ready</span>
          <span class="tag cyan">AI Assisted</span>
        </div>

        <div class="section-title-row">
          <h1 class="landing-title">Land your next role with less chaos and better follow-through</h1>
          <p class="landing-subtitle">Search across multiple sources, capture applications fast, optimize resumes, and keep follow-ups organized in one focused workspace.</p>
        </div>

        <div class="landing-actions">
          <button class="btn brand large" id="landingSignUp" type="button" style="min-width:200px;">Get Started Free</button>
          <button class="btn large" id="landingSignIn" type="button" style="min-width:140px;">Sign In</button>
        </div>

        <p class="muted">No credit card required. Start with guest mode if you just want to explore.</p>

        <div class="landing-stats">
          <div class="landing-stat">
            <strong>4</strong>
            <span>search sources in one pass</span>
          </div>
          <div class="landing-stat">
            <strong>3</strong>
            <span>core workspaces for search, jobs, and profile</span>
          </div>
          <div class="landing-stat">
            <strong>1</strong>
            <span>clean system for reminders and follow-ups</span>
          </div>
        </div>

        <div class="landing-features">
          <div class="feature-card">
            <div class="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <h3>Search 4 sources at once</h3>
            <p>Remotive, Arbeitnow, Adzuna, and JSearch work together so you can search once and review deduplicated openings.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-linecap="round"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <h3>Track the whole pipeline</h3>
            <p>Move from saved to offer, surface next actions, and keep follow-up dates from slipping through the cracks.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <h3>Use AI where it helps</h3>
            <p>Compare resume and job descriptions, generate tailored cover letters, and sharpen ATS keyword coverage without leaving the app.</p>
          </div>
        </div>

        <div class="landing-proof">
          <span>Powered by Google Gemini</span>
          <span>Firebase sync</span>
          <span>Groq AI</span>
        </div>

        <button class="landing-skip" id="landingGuest" type="button">Continue as guest</button>
      </div>
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
