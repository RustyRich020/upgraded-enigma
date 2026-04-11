/* ============================================================
   views/landing.js — Showcase landing page for JobSink
   Professional SaaS landing with sections, animations, and CTAs
   ============================================================ */

import { navigate } from '../router.js';
import { signInAnonymously } from '../firebase/auth.js';
import { STORAGE_KEYS } from '../config.js';

const LOGO_SVG = `<svg width="64" height="64" viewBox="0 0 48 48" fill="none">
  <rect x="4" y="6" width="40" height="36" rx="5" stroke="currentColor" stroke-width="2.5" fill="none"/>
  <path d="M28 8v6c0 1.5-1 2.5-2.5 2.5h-1c-1.5 0-2.5 1-2.5 2.5v3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/>
  <path d="M30 14h-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <circle cx="22" cy="24" r="1" fill="currentColor" opacity="0.5"/>
  <circle cx="24" cy="26" r="1" fill="currentColor" opacity="0.35"/>
  <circle cx="20" cy="25.5" r="0.8" fill="currentColor" opacity="0.4"/>
  <path d="M10 30h28v4c0 2.2-1.8 4-4 4H14c-2.2 0-4-1.8-4-4v-4z" fill="currentColor" opacity="0.6"/>
</svg>`;

export function renderLanding(container) {
  container.innerHTML = `
    <div class="lp">

      <!-- ===== HERO ===== -->
      <section class="lp-hero">
        <div class="lp-hero-inner">
          <div class="lp-logo-mark">${LOGO_SVG}</div>
          <h1 class="lp-headline">Everything flows<br>into one place</h1>
          <p class="lp-subhead">Search jobs across 4 sources. Optimize your resume for ATS. Generate cover letters with AI. Track your entire pipeline. All in one app.</p>
          <div class="lp-cta-row">
            <button class="lp-cta-primary" id="landingSignUp">Get started free</button>
            <button class="lp-cta-secondary" id="landingSignIn">Sign in</button>
          </div>
          <p class="lp-note">No credit card required</p>
        </div>
      </section>

      <!-- ===== HOW IT WORKS ===== -->
      <section class="lp-section">
        <p class="lp-eyebrow">How it works</p>
        <h2 class="lp-section-title">Three steps. Zero chaos.</h2>
        <div class="lp-steps">
          <div class="lp-step">
            <div class="lp-step-num">1</div>
            <h3>Upload your resume</h3>
            <p>Parse a PDF and we extract your skills, experience level, and best-fit roles automatically.</p>
          </div>
          <div class="lp-step-arrow">→</div>
          <div class="lp-step">
            <div class="lp-step-num">2</div>
            <h3>Search & match</h3>
            <p>One click searches Remotive, Arbeitnow, Adzuna, and JSearch. Results are deduplicated and scored.</p>
          </div>
          <div class="lp-step-arrow">→</div>
          <div class="lp-step">
            <div class="lp-step-num">3</div>
            <h3>Track & apply</h3>
            <p>Add jobs to your pipeline. Get ATS scores, AI cover letters, interview prep — and never miss a follow-up.</p>
          </div>
        </div>
      </section>

      <!-- ===== FEATURES ===== -->
      <section class="lp-section lp-section-alt">
        <p class="lp-eyebrow">What's inside</p>
        <h2 class="lp-section-title">Built for the way job search actually works</h2>
        <div class="lp-features">
          <div class="lp-feature">
            <div class="lp-feature-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <h3>Unified job search</h3>
            <p>One search across 4 job boards. Results stored permanently so you can filter, sort, and revisit anytime.</p>
          </div>
          <div class="lp-feature">
            <div class="lp-feature-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-linecap="round"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <h3>ATS keyword optimizer</h3>
            <p>Paste a job description, see your score, and click to add missing keywords directly to your resume.</p>
          </div>
          <div class="lp-feature">
            <div class="lp-feature-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <h3>AI cover letters</h3>
            <p>Select a tracked job and your resume from dropdowns — Gemini generates a tailored cover letter in seconds.</p>
          </div>
          <div class="lp-feature">
            <div class="lp-feature-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            </div>
            <h3>Pipeline tracking</h3>
            <p>Kanban board, table view, follow-up reminders, and a timeline of every application you've submitted.</p>
          </div>
          <div class="lp-feature">
            <div class="lp-feature-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <h3>Automated agent</h3>
            <p>Set your preferences once. The job agent searches on a schedule, deduplicates, and queues matches for review.</p>
          </div>
          <div class="lp-feature">
            <div class="lp-feature-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            </div>
            <h3>Interview prep</h3>
            <p>AI generates 10 tailored questions for any role — behavioral, technical, and questions to ask the interviewer.</p>
          </div>
        </div>
      </section>

      <!-- ===== TRUST ===== -->
      <section class="lp-section">
        <p class="lp-eyebrow">Powered by</p>
        <div class="lp-trust">
          <span>Google Gemini AI</span>
          <span>Firebase</span>
          <span>Groq LLM</span>
          <span>Remotive API</span>
          <span>Adzuna API</span>
        </div>
      </section>

      <!-- ===== FINAL CTA ===== -->
      <section class="lp-final-cta">
        <div class="lp-logo-mark lp-logo-small">${LOGO_SVG}</div>
        <h2>Start your search today</h2>
        <p>Free to use. No credit card. Set up in under a minute.</p>
        <div class="lp-cta-row">
          <button class="lp-cta-primary" id="landingSignUp2">Get started free</button>
        </div>
        <button class="lp-guest-link" id="landingGuest">or continue as guest</button>
      </section>

    </div>

    <style>
      /* ===== Landing page scoped styles ===== */
      .lp { max-width: 100%; overflow-x: hidden; }

      /* Hero */
      .lp-hero {
        min-height: calc(100vh - var(--header-height));
        display: flex; align-items: center; justify-content: center;
        padding: 60px 24px;
        background:
          radial-gradient(ellipse at 50% 0%, rgba(196,123,58,0.08), transparent 50%),
          radial-gradient(ellipse at 80% 100%, rgba(45,139,95,0.05), transparent 40%),
          var(--color-bg);
      }
      .lp-hero-inner { max-width: 640px; text-align: center; }
      .lp-logo-mark {
        width: 80px; height: 80px; margin: 0 auto 24px;
        color: var(--color-primary);
        background: var(--color-primary-dim);
        border-radius: 20px;
        display: flex; align-items: center; justify-content: center;
        animation: fadeIn 0.6s ease-out;
      }
      .lp-logo-small { width: 56px; height: 56px; border-radius: 14px; margin-bottom: 20px; }
      .lp-logo-small svg { width: 36px; height: 36px; }
      .lp-headline {
        font-family: var(--font-display);
        font-size: clamp(32px, 5vw, 48px);
        font-weight: 700;
        line-height: 1.1;
        letter-spacing: -0.02em;
        color: var(--color-text-heading);
        margin-bottom: 16px;
        animation: fadeIn 0.6s ease-out 0.1s backwards;
      }
      .lp-subhead {
        font-size: clamp(15px, 2vw, 18px);
        line-height: 1.6;
        color: var(--color-text-dim);
        max-width: 520px;
        margin: 0 auto 32px;
        animation: fadeIn 0.6s ease-out 0.2s backwards;
      }
      .lp-cta-row {
        display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;
        animation: fadeIn 0.6s ease-out 0.3s backwards;
      }
      .lp-cta-primary {
        background: var(--color-primary); color: #fff; border: none;
        padding: 14px 32px; border-radius: 12px;
        font-family: var(--font-body); font-size: 16px; font-weight: 600;
        cursor: pointer; transition: all 0.15s;
        box-shadow: 0 2px 12px rgba(196,123,58,0.25);
      }
      .lp-cta-primary:hover { background: var(--color-primary-bright); transform: translateY(-1px); box-shadow: 0 4px 20px rgba(196,123,58,0.3); }
      .lp-cta-secondary {
        background: var(--color-surface); color: var(--color-text);
        border: 1px solid var(--color-surface-border);
        padding: 14px 28px; border-radius: 12px;
        font-family: var(--font-body); font-size: 16px; font-weight: 600;
        cursor: pointer; transition: all 0.15s;
      }
      .lp-cta-secondary:hover { border-color: var(--color-primary); }
      .lp-note { font-size: 13px; color: var(--color-muted); margin-top: 16px; animation: fadeIn 0.6s ease-out 0.4s backwards; }

      /* Sections */
      .lp-section { padding: 64px 24px; max-width: 960px; margin: 0 auto; }
      .lp-section-alt { background: var(--color-bg-secondary); max-width: 100%; }
      .lp-section-alt > * { max-width: 960px; margin-left: auto; margin-right: auto; }
      .lp-eyebrow {
        font-size: 12px; font-weight: 700; text-transform: uppercase;
        letter-spacing: 1.5px; color: var(--color-primary);
        margin-bottom: 8px; text-align: center;
      }
      .lp-section-title {
        font-family: var(--font-display);
        font-size: clamp(24px, 3.5vw, 32px);
        font-weight: 700; color: var(--color-text-heading);
        text-align: center; margin-bottom: 40px;
        letter-spacing: -0.01em;
      }

      /* How it works steps */
      .lp-steps {
        display: flex; align-items: flex-start; justify-content: center;
        gap: 12px; flex-wrap: wrap;
      }
      .lp-step {
        flex: 1; min-width: 200px; max-width: 260px;
        background: var(--color-surface);
        border: 1px solid var(--color-surface-border);
        border-radius: 16px; padding: 28px 24px;
        text-align: center;
        box-shadow: var(--shadow-sm);
      }
      .lp-step-num {
        width: 36px; height: 36px; border-radius: 50%;
        background: var(--color-primary); color: #fff;
        font-family: var(--font-display); font-size: 16px; font-weight: 700;
        display: flex; align-items: center; justify-content: center;
        margin: 0 auto 14px;
      }
      .lp-step h3 { font-size: 16px; font-weight: 600; color: var(--color-text-heading); margin-bottom: 8px; letter-spacing: 0; text-transform: none; }
      .lp-step p { font-size: 14px; color: var(--color-text-dim); line-height: 1.6; }
      .lp-step-arrow { font-size: 24px; color: var(--color-muted); padding-top: 40px; }

      /* Features grid */
      .lp-features {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
      }
      .lp-feature {
        background: var(--color-surface);
        border: 1px solid var(--color-surface-border);
        border-radius: 14px; padding: 24px;
        box-shadow: var(--shadow-sm);
        transition: all 0.2s;
      }
      .lp-feature:hover { border-color: var(--color-primary-dim); box-shadow: var(--shadow-md); transform: translateY(-2px); }
      .lp-feature-icon {
        width: 48px; height: 48px; border-radius: 12px;
        background: var(--color-bg-secondary);
        display: flex; align-items: center; justify-content: center;
        margin-bottom: 16px;
      }
      .lp-feature h3 { font-size: 15px; font-weight: 600; color: var(--color-text-heading); margin-bottom: 8px; letter-spacing: 0; text-transform: none; }
      .lp-feature p { font-size: 13px; color: var(--color-text-dim); line-height: 1.6; }

      /* Trust */
      .lp-trust {
        display: flex; justify-content: center; gap: 24px; flex-wrap: wrap;
        opacity: 0.5;
      }
      .lp-trust span { font-size: 14px; font-weight: 500; color: var(--color-text-dim); }

      /* Final CTA */
      .lp-final-cta {
        text-align: center; padding: 64px 24px;
        background:
          radial-gradient(ellipse at 50% 100%, rgba(196,123,58,0.06), transparent 50%),
          var(--color-bg);
      }
      .lp-final-cta h2 {
        font-family: var(--font-display);
        font-size: 28px; font-weight: 700;
        color: var(--color-text-heading);
        margin-bottom: 8px;
      }
      .lp-final-cta p { font-size: 15px; color: var(--color-text-dim); margin-bottom: 24px; }
      .lp-guest-link {
        display: block; margin-top: 16px;
        background: none; border: none;
        font-size: 14px; color: var(--color-muted);
        cursor: pointer; font-family: var(--font-body);
        transition: color 0.15s;
      }
      .lp-guest-link:hover { color: var(--color-primary); }

      /* Responsive */
      @media (max-width: 768px) {
        .lp-hero { padding: 40px 16px; }
        .lp-steps { flex-direction: column; align-items: center; }
        .lp-step { max-width: 100%; }
        .lp-step-arrow { display: none; }
        .lp-features { grid-template-columns: 1fr; }
        .lp-section { padding: 40px 16px; }
      }
      @media (max-width: 480px) {
        .lp-headline { font-size: 28px; }
        .lp-cta-primary, .lp-cta-secondary { width: 100%; }
        .lp-features { gap: 12px; }
      }
    </style>
  `;

  // CTA handlers
  const signUp = (e) => { sessionStorage.setItem('authMode', 'signup'); navigate('auth'); };
  const signIn = () => { sessionStorage.setItem('authMode', 'signin'); navigate('auth'); };
  const guest = async () => {
    const user = await signInAnonymously();
    if (user) { localStorage.setItem(STORAGE_KEYS.onboarded, 'true'); navigate('dashboard'); }
  };

  container.querySelector('#landingSignUp')?.addEventListener('click', signUp);
  container.querySelector('#landingSignUp2')?.addEventListener('click', signUp);
  container.querySelector('#landingSignIn')?.addEventListener('click', signIn);
  container.querySelector('#landingGuest')?.addEventListener('click', guest);
}

export default { renderLanding };
