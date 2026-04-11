/* ============================================================
   views/landing.js — Showcase landing page for JobSink
   Professional SaaS landing with sections, animations, and CTAs
   ============================================================ */

import { navigate } from '../router.js';
import { signInAnonymously } from '../firebase/auth.js';
import { STORAGE_KEYS } from '../config.js';

/* Use the branded logo SVG asset */
const LOGO_IMG = `<img src="assets/icons/logo.svg" alt="JobSink" style="width:56px;height:56px;border-radius:12px">`;
const LOGO_IMG_SM = `<img src="assets/icons/logo.svg" alt="JobSink" style="width:40px;height:40px;border-radius:8px">`;

const FEATURES = [
  { img: 'assets/icons/feat-search.svg', title: 'Unified job search', desc: 'One search across 4 job boards. Results stored permanently so you can filter, sort, and revisit anytime.', accent: 'primary' },
  { img: 'assets/icons/feat-ats.svg', title: 'ATS keyword optimizer', desc: 'Paste a job description, see your score, and click to add missing keywords directly to your resume.', accent: 'accent' },
  { img: 'assets/icons/feat-ai.svg', title: 'AI cover letters', desc: 'Select a tracked job and your resume from dropdowns — Gemini generates a tailored cover letter in seconds.', accent: 'primary' },
  { img: 'assets/icons/feat-pipeline.svg', title: 'Pipeline tracking', desc: 'Kanban board, table view, follow-up reminders, and a timeline of every application you\'ve submitted.', accent: 'accent' },
  { img: 'assets/icons/feat-agent.svg', title: 'Automated agent', desc: 'Set your preferences once. The job agent searches on a schedule, deduplicates, and queues matches for review.', accent: 'primary' },
  { img: 'assets/icons/feat-interview.svg', title: 'Interview prep', desc: 'AI generates 10 tailored questions for any role — behavioral, technical, and questions to ask the interviewer.', accent: 'accent' },
];

export function renderLanding(container) {
  container.innerHTML = `
    <div class="lp">

      <!-- ===== HERO ===== -->
      <section class="lp-hero">
        <div class="lp-hero-inner">
          <div class="lp-logo-mark">${LOGO_IMG}</div>
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
          ${FEATURES.map((f, i) => `
            <div class="lp-feature" style="animation-delay:${i * 80}ms">
              <div class="lp-feature-img">
                <img src="${f.img}" alt="${f.title}" loading="lazy">
              </div>
              <div class="lp-feature-body">
                <h3>${f.title}</h3>
                <p>${f.desc}</p>
              </div>
            </div>
          `).join('')}
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
        <div class="lp-logo-mark lp-logo-small">${LOGO_IMG_SM}</div>
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
        border-radius: 20px;
        display: flex; align-items: center; justify-content: center;
        animation: fadeIn 0.6s ease-out;
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(196,123,58,0.2);
      }
      .lp-logo-mark img { border-radius: inherit; }
      .lp-logo-small { width: 56px; height: 56px; border-radius: 14px; margin-bottom: 20px; box-shadow: 0 2px 12px rgba(196,123,58,0.15); }
      .lp-logo-small img { width: 100%; height: 100%; }
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
        gap: 20px;
      }
      .lp-feature {
        background: var(--color-surface);
        border: 1px solid var(--color-surface-border);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: var(--shadow-sm);
        transition: all 0.25s ease;
        animation: fadeIn 0.5s ease-out backwards;
      }
      .lp-feature:hover {
        border-color: var(--color-primary-dim);
        box-shadow: var(--shadow-lg);
        transform: translateY(-4px);
      }
      .lp-feature-img {
        width: 100%; height: 140px;
        display: flex; align-items: center; justify-content: center;
        overflow: hidden;
        border-bottom: 1px solid var(--color-surface-border);
      }
      .lp-feature-img img {
        width: 100%; height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
      }
      .lp-feature:hover .lp-feature-img img { transform: scale(1.04); }
      .lp-feature-body { padding: 20px; }
      .lp-feature-body h3 { font-size: 16px; font-weight: 650; color: var(--color-text-heading); margin-bottom: 8px; letter-spacing: -0.01em; text-transform: none; }
      .lp-feature-body p { font-size: 13px; color: var(--color-text-dim); line-height: 1.65; }

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
