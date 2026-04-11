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
          <svg width="52" height="52" viewBox="0 0 48 48" fill="none">
            <!-- Rounded square frame -->
            <rect x="4" y="6" width="40" height="36" rx="4" stroke="var(--color-primary)" stroke-width="2.5" fill="none"/>
            <!-- Faucet -->
            <path d="M28 8v6c0 1.5-1 2.5-2.5 2.5h-1c-1.5 0-2.5 1-2.5 2.5v3" stroke="var(--color-primary)" stroke-width="2.2" stroke-linecap="round" fill="none"/>
            <path d="M30 14h-4" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round"/>
            <!-- Water drops -->
            <circle cx="22" cy="24" r="1" fill="var(--color-primary)" opacity="0.6"/>
            <circle cx="24" cy="26" r="1" fill="var(--color-primary)" opacity="0.4"/>
            <circle cx="20" cy="25.5" r="0.8" fill="var(--color-primary)" opacity="0.5"/>
            <!-- Basin -->
            <path d="M10 30h28v4c0 2.2-1.8 4-4 4H14c-2.2 0-4-1.8-4-4v-4z" fill="var(--color-primary)" opacity="0.7"/>
            <!-- Data elements falling in -->
            <rect x="12" cy="18" width="6" height="5" rx="1" fill="var(--color-primary)" opacity="0.35" transform="rotate(-15 12 18)"/>
            <circle cx="34" cy="20" r="3" stroke="var(--color-primary)" stroke-width="1.5" fill="none" opacity="0.4"/>
            <path d="M34 20v-3" stroke="var(--color-primary)" stroke-width="1.2" stroke-linecap="round" opacity="0.4"/>
          </svg>
        </div>

        <div class="landing-badges">
          <span class="tag">Job Search</span>
          <span class="tag green">ATS Ready</span>
          <span class="tag cyan">AI Assisted</span>
        </div>

        <div class="section-title-row">
          <h1 class="landing-title">Everything flows into one place</h1>
          <p class="landing-subtitle">Search jobs across 4 sources, optimize your resume for ATS, generate cover letters with AI, and track your entire pipeline — all in JobSink.</p>
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
