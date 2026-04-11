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
      <!-- Logo -->
      <div class="landing-logo">
        <svg width="44" height="44" viewBox="0 0 40 40" fill="none">
          <path d="M20 6c-1.5 0-2.5 1-2.5 2.5v4c0 .8-.4 1.5-1 2l-1 .8c-.8.5-1.5 1.5-1.5 2.7v2h12v-2c0-1.2-.7-2.2-1.5-2.7l-1-.8c-.6-.5-1-1.2-1-2v-4C22.5 7 21.5 6 20 6z" fill="var(--color-primary)"/>
          <path d="M12 22h16v3c0 1.7-1.3 3-3 3h-2v4h-6v-4h-2c-1.7 0-3-1.3-3-3v-3z" fill="var(--color-primary)" opacity="0.6"/>
          <circle cx="17" cy="18.5" r="0.8" fill="var(--color-bg)"/>
          <circle cx="20" cy="19.5" r="0.8" fill="var(--color-bg)"/>
          <circle cx="23" cy="18.5" r="0.8" fill="var(--color-bg)"/>
        </svg>
      </div>

      <!-- Hero -->
      <h1 class="landing-title">Land your next role faster</h1>
      <p class="landing-subtitle">AI-powered job search, ATS optimization, and automated tracking — all in one place.</p>

      <!-- CTA -->
      <div class="landing-actions">
        <button class="btn brand large" id="landingSignUp" style="min-width:200px;">Get started free</button>
        <button class="btn large" id="landingSignIn" style="min-width:140px;">Sign in</button>
      </div>

      <p style="font-size:13px;color:var(--color-muted);margin-top:12px;">No credit card required</p>

      <!-- Features -->
      <div class="landing-features">
        <div class="feature-card">
          <div class="feature-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <h3>Search 4 sources at once</h3>
          <p>Remotive, Arbeitnow, Adzuna, and JSearch — one click, all results deduplicated.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-linecap="round"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <h3>ATS keyword optimizer</h3>
          <p>See exactly which keywords you're missing. Click to add them to your resume instantly.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
          <h3>AI cover letters & matching</h3>
          <p>Gemini analyzes your resume against any job posting. Generate tailored cover letters in seconds.</p>
        </div>
      </div>

      <!-- Trust -->
      <div style="margin-top:40px;padding-top:24px;border-top:1px solid var(--color-surface-border);width:100%;max-width:500px;">
        <p style="font-size:12px;color:var(--color-muted);text-align:center;letter-spacing:0.5px;text-transform:uppercase;font-weight:600;">Powered by</p>
        <div style="display:flex;justify-content:center;gap:20px;margin-top:10px;flex-wrap:wrap;opacity:0.5;">
          <span style="font-size:13px;color:var(--color-text-dim);font-weight:500;">Google Gemini</span>
          <span style="font-size:13px;color:var(--color-text-dim);">•</span>
          <span style="font-size:13px;color:var(--color-text-dim);font-weight:500;">Firebase</span>
          <span style="font-size:13px;color:var(--color-text-dim);">•</span>
          <span style="font-size:13px;color:var(--color-text-dim);font-weight:500;">Groq AI</span>
        </div>
      </div>

      <!-- Guest -->
      <button class="landing-skip" id="landingGuest">or continue as guest</button>
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
