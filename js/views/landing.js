/* ============================================================
   views/landing.js — Showcase landing page for JobSynk
   Professional SaaS landing with hero, product preview,
   social proof, features, trust badges, and footer
   ============================================================ */

import { navigate } from '../router.js';
import { signInAnonymously } from '../firebase/auth.js';
import { STORAGE_KEYS } from '../config.js';
import { initSwipeCards } from '../ui/swipe-cards.js';

/* Use the branded logo SVG asset */
const LOGO_IMG = `<img src="assets/icons/logo.svg" alt="JobSynk" style="width:56px;height:56px;border-radius:12px">`;
const LOGO_IMG_SM = `<img src="assets/icons/logo.svg" alt="JobSynk" style="width:40px;height:40px;border-radius:8px">`;

const FEATURES = [
  {
    img: 'assets/icons/feat-search.svg',
    title: 'Unified job search',
    desc: 'One search across 4 job boards. Results stored permanently so you can filter, sort, and revisit anytime.',
    detail: {
      headline: 'Search everywhere. Store everything.',
      intro: 'JobSynk connects to 4 major job APIs simultaneously — Remotive, Arbeitnow, Adzuna, and JSearch — so you never have to tab between 10 browser windows again.',
      highlights: [
        { icon: '🔍', label: '4 API Sources', text: 'One button triggers Remotive (remote jobs), Arbeitnow (EU/global), Adzuna (salary data), and JSearch (LinkedIn/Indeed aggregate) in parallel.' },
        { icon: '💾', label: 'Persistent Local DB', text: 'Every result is saved to a local database of up to 500 jobs. Filter by source, sort by date or salary, and revisit results days later.' },
        { icon: '🧹', label: 'Smart Deduplication', text: 'Our 3-tier dedup engine catches duplicates across sources: URL match, exact title+company, and Jaccard fuzzy similarity — so you never see the same job twice.' },
        { icon: '⭐', label: 'Relevance Scoring', text: 'Each result is scored against your resume: 60 pts for skill matches, 30 pts for title alignment, 10 pts for freshness. Best matches float to the top.' },
      ],
      cta: 'find-jobs',
      ctaLabel: 'Try Job Search',
    }
  },
  {
    img: 'assets/icons/feat-ats.svg',
    title: 'ATS keyword optimizer',
    desc: 'Paste a job description, see your score, and click to add missing keywords directly to your resume.',
    detail: {
      headline: 'Beat the bots. Land the interview.',
      intro: 'Most resumes are rejected by Applicant Tracking Systems before a human ever sees them. JobSynk\'s ATS optimizer analyzes job descriptions against your resume with 200+ keyword patterns.',
      highlights: [
        { icon: '📊', label: 'Instant ATS Score', text: 'Paste any job description and get a weighted score across 6 categories: hard skills, certifications, soft skills, action verbs, experience level, and industry terms.' },
        { icon: '🏷️', label: '200+ Keyword Patterns', text: 'Regex-powered extraction catches keywords that simple word matching misses — including multi-word phrases like "machine learning" and "CI/CD".' },
        { icon: '➕', label: 'One-Click Quick Add', text: 'See a missing keyword? Click it to instantly add it to your resume skills. No copy-pasting, no switching tabs.' },
        { icon: '🤖', label: 'AI Deep Analysis', text: 'Optional Gemini-powered deep scan provides context-aware suggestions, tone analysis, and section-by-section recommendations.' },
      ],
      cta: 'find-jobs',
      ctaLabel: 'Try ATS Optimizer',
    }
  },
  {
    img: 'assets/icons/feat-ai.svg',
    title: 'AI cover letters',
    desc: 'Select a tracked job and your resume from dropdowns — Gemini generates a tailored cover letter in seconds.',
    detail: {
      headline: 'Personalized cover letters in seconds.',
      intro: 'Stop writing cover letters from scratch. Select a job from your tracker and a resume from your library — JobSynk\'s AI generates a tailored, professional letter instantly.',
      highlights: [
        { icon: '📝', label: 'Dropdown Selection', text: 'Pick from your tracked jobs and saved resumes via dropdown menus. The AI pulls the job description and your skills automatically.' },
        { icon: '⚡', label: 'Gemini 2.5 Flash', text: 'Powered by Google\'s latest Gemini model for fast, high-quality generation. Each letter is unique and contextual — never template-sounding.' },
        { icon: '🎯', label: 'JD ↔ Resume Matching', text: 'The AI cross-references the job requirements against your actual experience, highlighting relevant projects and quantified achievements.' },
        { icon: '❓', label: 'Interview Questions', text: 'Generate 10 tailored interview questions for any role — behavioral, technical, and smart questions to ask the interviewer.' },
      ],
      cta: 'find-jobs',
      ctaLabel: 'Try AI Tools',
    }
  },
  {
    img: 'assets/icons/feat-pipeline.svg',
    title: 'Pipeline tracking',
    desc: 'Kanban board, table view, follow-up reminders, and a timeline of every application you\'ve submitted.',
    detail: {
      headline: 'Your entire job search, organized.',
      intro: 'Track every application from "Saved" to "Offer" with multiple view modes, follow-up reminders, and a visual timeline that shows your full activity history.',
      highlights: [
        { icon: '📋', label: 'Multiple Views', text: 'Switch between table view (sortable columns), Kanban board (drag cards between stages), and visual timeline (chronological activity feed).' },
        { icon: '🔔', label: 'Follow-Up Reminders', text: 'Set follow-up dates for any application. JobSynk surfaces overdue follow-ups on your dashboard and sends notifications.' },
        { icon: '📈', label: 'Pipeline Analytics', text: 'Chart.js visualizations show your pipeline breakdown (donut), source distribution (bar), and weekly activity trends.' },
        { icon: '☁️', label: 'Cross-Device Sync', text: 'Firebase Firestore keeps everything in sync across devices in real-time. Add a job on your phone, see it on your laptop instantly.' },
      ],
      cta: 'my-jobs',
      ctaLabel: 'Try Pipeline Tracker',
    }
  },
  {
    img: 'assets/icons/feat-agent.svg',
    title: 'Automated agent',
    desc: 'Set your preferences once. The job agent searches on a schedule, deduplicates, and queues matches for review.',
    detail: {
      headline: 'Jobs find you while you sleep.',
      intro: 'Configure your ideal roles, skills, and preferences once. The job agent runs a 10-step pipeline on a schedule — searching, deduplicating, scoring, and queuing the best matches for your review.',
      highlights: [
        { icon: '🤖', label: '10-Step Pipeline', text: 'Check preconditions → build resume profile → generate AI queries → plan API calls → execute searches → deduplicate → score → auto-add/queue → log → persist.' },
        { icon: '⏰', label: 'Scheduled Runs', text: 'Runs every 6 hours via Firebase Cloud Functions — even when your browser is closed. Wake up to fresh, relevant job matches.' },
        { icon: '🧠', label: 'Learning Signals', text: 'The agent learns from your actions: jobs you keep get reinforced, jobs you delete get down-weighted. Search queries improve over time.' },
        { icon: '🔐', label: 'Rate-Limit Aware', text: 'Smart API call planning respects rate limits across all 4 sources. Never wastes your daily quota on duplicate or low-quality searches.' },
      ],
      cta: 'find-jobs',
      ctaLabel: 'Configure Agent',
    }
  },
  {
    img: 'assets/icons/feat-interview.svg',
    title: 'Interview prep',
    desc: 'AI generates 10 tailored questions for any role — behavioral, technical, and questions to ask the interviewer.',
    detail: {
      headline: 'Walk in prepared. Walk out hired.',
      intro: 'For any job in your tracker, generate a curated set of 10 interview questions — split across behavioral, technical, and "questions to ask them" categories. Powered by Gemini AI with context from the actual job description.',
      highlights: [
        { icon: '🎤', label: 'Behavioral Questions', text: 'STAR-method style questions tailored to the role: "Tell me about a time you led a cross-functional project under tight deadlines."' },
        { icon: '💻', label: 'Technical Questions', text: 'Role-specific technical questions based on the required skills: system design, coding challenges, framework knowledge, and domain expertise.' },
        { icon: '🙋', label: 'Questions to Ask', text: 'Smart questions that show you\'ve done your research: team structure, growth trajectory, tech stack decisions, and company culture.' },
        { icon: '📄', label: 'Context-Aware', text: 'Every question is generated from the actual job description and your resume — not generic templates. The AI knows the specific role, company, and your background.' },
      ],
      cta: 'find-jobs',
      ctaLabel: 'Try Interview Prep',
    }
  },
];

const STATS = [
  { value: '4', label: 'Job Sources' },
  { value: '200+', label: 'ATS Keywords' },
  { value: 'AI', label: 'Powered Analysis' },
  { value: '< 60s', label: 'Setup Time' },
];

const TRUST_BADGES = [
  { name: 'Google Gemini', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>` },
  { name: 'Firebase', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 20l2.4-15.2L10 12l2-4 8 12H4z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>` },
  { name: 'Groq LLM', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-7.07l-2.83 2.83M9.76 14.24l-2.83 2.83m11.14 0l-2.83-2.83M9.76 9.76L6.93 6.93" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>` },
  { name: 'Remotive', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M8 21h8m-4-4v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>` },
  { name: 'Adzuna', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>` },
];

/* ---- Product mockup SVG (browser frame showing dashboard) ---- */
const PRODUCT_MOCKUP = `
<svg class="lp-mockup-svg" viewBox="0 0 800 480" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Browser frame -->
  <rect x="0" y="0" width="800" height="480" rx="12" fill="#1A1A1E"/>
  <rect x="0" y="0" width="800" height="36" rx="12" fill="#2A2A2E"/>
  <rect x="0" y="24" width="800" height="12" fill="#2A2A2E"/>
  <!-- Window dots -->
  <circle cx="20" cy="18" r="5" fill="#FF605C"/>
  <circle cx="38" cy="18" r="5" fill="#FFBD44"/>
  <circle cx="56" cy="18" r="5" fill="#00CA4E"/>
  <!-- URL bar -->
  <rect x="160" y="9" width="480" height="18" rx="9" fill="#1A1A1E" opacity="0.6"/>
  <text x="400" y="22" font-family="system-ui" font-size="10" fill="#888" text-anchor="middle">jobsynk.app</text>

  <!-- Sidebar -->
  <rect x="0" y="36" width="180" height="444" fill="#222226"/>
  <!-- Sidebar logo -->
  <rect x="16" y="50" width="28" height="28" rx="7" fill="#C47B3A" opacity="0.2"/>
  <text x="52" y="69" font-family="system-ui" font-size="13" font-weight="600" fill="#D4874D">JobSynk</text>
  <!-- Nav items -->
  <rect x="14" y="96" width="152" height="32" rx="8" fill="#C47B3A" opacity="0.12"/>
  <text x="30" y="116" font-family="system-ui" font-size="11" fill="#D4874D">Home</text>
  <text x="30" y="148" font-family="system-ui" font-size="11" fill="#777">Find Jobs</text>
  <text x="30" y="176" font-family="system-ui" font-size="11" fill="#777">My Jobs</text>
  <text x="30" y="204" font-family="system-ui" font-size="11" fill="#777">My Profile</text>
  <text x="30" y="232" font-family="system-ui" font-size="11" fill="#777">Settings</text>

  <!-- Main content area -->
  <rect x="180" y="36" width="620" height="444" fill="#F8F7F5"/>

  <!-- Dashboard header -->
  <text x="210" y="72" font-family="system-ui" font-size="18" font-weight="700" fill="#1A1A1E">Career Dashboard</text>
  <text x="210" y="90" font-family="system-ui" font-size="11" fill="#888">Welcome back — here's your job search overview</text>

  <!-- Stat cards row -->
  <rect x="210" y="106" width="136" height="72" rx="10" fill="white" stroke="#E8E5E0" stroke-width="1"/>
  <text x="226" y="130" font-family="system-ui" font-size="10" fill="#999">Pipeline</text>
  <text x="226" y="156" font-family="system-ui" font-size="26" font-weight="700" fill="#C47B3A">12</text>

  <rect x="358" y="106" width="136" height="72" rx="10" fill="white" stroke="#E8E5E0" stroke-width="1"/>
  <text x="374" y="130" font-family="system-ui" font-size="10" fill="#999">Applied</text>
  <text x="374" y="156" font-family="system-ui" font-size="26" font-weight="700" fill="#2D8B5F">8</text>

  <rect x="506" y="106" width="136" height="72" rx="10" fill="white" stroke="#E8E5E0" stroke-width="1"/>
  <text x="522" y="130" font-family="system-ui" font-size="10" fill="#999">Interviews</text>
  <text x="522" y="156" font-family="system-ui" font-size="26" font-weight="700" fill="#C47B3A">3</text>

  <rect x="654" y="106" width="136" height="72" rx="10" fill="white" stroke="#E8E5E0" stroke-width="1"/>
  <text x="670" y="130" font-family="system-ui" font-size="10" fill="#999">ATS Score</text>
  <text x="670" y="156" font-family="system-ui" font-size="26" font-weight="700" fill="#2D8B5F">85%</text>

  <!-- Chart area -->
  <rect x="210" y="194" width="290" height="160" rx="10" fill="white" stroke="#E8E5E0" stroke-width="1"/>
  <text x="226" y="218" font-family="system-ui" font-size="11" font-weight="600" fill="#1A1A1E">Application Pipeline</text>
  <!-- Donut chart mock -->
  <circle cx="355" cy="290" r="40" stroke="#E8E5E0" stroke-width="10" fill="none"/>
  <circle cx="355" cy="290" r="40" stroke="#C47B3A" stroke-width="10" fill="none" stroke-dasharray="100 152" transform="rotate(-90 355 290)"/>
  <circle cx="355" cy="290" r="40" stroke="#2D8B5F" stroke-width="10" fill="none" stroke-dasharray="60 192" stroke-dashoffset="-100" transform="rotate(-90 355 290)"/>

  <!-- Recent jobs table -->
  <rect x="514" y="194" width="276" height="160" rx="10" fill="white" stroke="#E8E5E0" stroke-width="1"/>
  <text x="530" y="218" font-family="system-ui" font-size="11" font-weight="600" fill="#1A1A1E">Recent Jobs</text>
  <!-- Table rows -->
  <rect x="530" y="230" width="244" height="1" fill="#E8E5E0"/>
  <text x="530" y="250" font-family="system-ui" font-size="10" fill="#333">Senior Developer</text>
  <rect x="710" y="240" width="48" height="16" rx="8" fill="#2D8B5F" opacity="0.15"/>
  <text x="734" y="252" font-family="system-ui" font-size="8" fill="#2D8B5F" text-anchor="middle">Applied</text>
  <text x="530" y="278" font-family="system-ui" font-size="10" fill="#333">Product Manager</text>
  <rect x="710" y="268" width="48" height="16" rx="8" fill="#C47B3A" opacity="0.15"/>
  <text x="734" y="280" font-family="system-ui" font-size="8" fill="#C47B3A" text-anchor="middle">Interview</text>
  <text x="530" y="306" font-family="system-ui" font-size="10" fill="#333">UX Designer</text>
  <rect x="710" y="296" width="48" height="16" rx="8" fill="#888" opacity="0.15"/>
  <text x="734" y="308" font-family="system-ui" font-size="8" fill="#888" text-anchor="middle">Saved</text>

  <!-- Getting started card -->
  <rect x="210" y="370" width="580" height="90" rx="10" fill="white" stroke="#E8E5E0" stroke-width="1"/>
  <text x="226" y="396" font-family="system-ui" font-size="11" font-weight="600" fill="#1A1A1E">Getting Started</text>
  <!-- Checklist -->
  <rect x="226" y="410" width="14" height="14" rx="3" fill="#2D8B5F" opacity="0.2"/>
  <path d="M230 417l2 2 4-4" stroke="#2D8B5F" stroke-width="1.5" stroke-linecap="round"/>
  <text x="248" y="422" font-family="system-ui" font-size="10" fill="#666">Upload resume</text>
  <rect x="356" y="410" width="14" height="14" rx="3" stroke="#C47B3A" stroke-width="1" fill="none" opacity="0.4"/>
  <text x="378" y="422" font-family="system-ui" font-size="10" fill="#666">Search jobs</text>
  <rect x="476" y="410" width="14" height="14" rx="3" stroke="#C47B3A" stroke-width="1" fill="none" opacity="0.4"/>
  <text x="498" y="422" font-family="system-ui" font-size="10" fill="#666">Add to tracker</text>

  <!-- Subtle shine overlay -->
  <rect x="180" y="36" width="620" height="444" fill="url(#mockupShine)" opacity="0.03"/>
  <defs>
    <linearGradient id="mockupShine" x1="180" y1="36" x2="800" y2="480">
      <stop offset="0%" stop-color="white"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </linearGradient>
  </defs>
</svg>`;

export function renderLanding(container) {
  /* --- Enhancement #7: Hide sidebar/hamburger on landing --- */
  document.body.classList.add('lp-active');

  container.innerHTML = `
    <div class="lp">

      <!-- ===== HERO ===== -->
      <section class="lp-hero">
        <!-- Floating ambient shapes -->
        <div class="lp-hero-shapes">
          <div class="lp-shape lp-shape-1"></div>
          <div class="lp-shape lp-shape-2"></div>
          <div class="lp-shape lp-shape-3"></div>
        </div>

        <div class="lp-hero-inner">
          <div class="lp-logo-mark">${LOGO_IMG}</div>
          <h1 class="lp-headline">Everything flows<br><span class="lp-headline-accent">into one place</span></h1>
          <p class="lp-subhead">Search jobs across 4 sources. Optimize your resume for ATS. Generate cover letters with AI. Track your entire pipeline — all in one app.</p>
          <div class="lp-cta-row">
            <button class="lp-cta-primary" id="landingSignUp">
              Get started free
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M5 12h14m-7-7l7 7-7 7"/></svg>
            </button>
            <button class="lp-cta-demo" id="landingDemo">
              Try Demo
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </button>
            <button class="lp-cta-secondary" id="landingSignIn">Sign in</button>
          </div>
          <p class="lp-note">No credit card required</p>
        </div>

        <!-- Product mockup -->
        <div class="lp-mockup">
          ${PRODUCT_MOCKUP}
        </div>
      </section>

      <!-- ===== SOCIAL PROOF STATS ===== -->
      <section class="lp-stats-bar">
        ${STATS.map(s => `
          <div class="lp-stat">
            <span class="lp-stat-value">${s.value}</span>
            <span class="lp-stat-label">${s.label}</span>
          </div>
        `).join('')}
      </section>

      <!-- ===== HOW IT WORKS ===== -->
      <section class="lp-section">
        <p class="lp-eyebrow">How it works</p>
        <h2 class="lp-section-title">Three steps. Zero chaos.</h2>
        <div class="lp-steps">
          <div class="lp-step">
            <div class="lp-step-num">1</div>
            <div class="lp-step-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="1.5" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3"/></svg>
            </div>
            <h3>Upload your resume</h3>
            <p>Parse a PDF and we extract your skills, experience level, and best-fit roles automatically.</p>
          </div>
          <div class="lp-step-connector"><div class="lp-step-line"></div></div>
          <div class="lp-step">
            <div class="lp-step-num">2</div>
            <div class="lp-step-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            </div>
            <h3>Search & match</h3>
            <p>One click searches Remotive, Arbeitnow, Adzuna, and JSearch. Results are deduplicated and scored.</p>
          </div>
          <div class="lp-step-connector"><div class="lp-step-line"></div></div>
          <div class="lp-step">
            <div class="lp-step-num">3</div>
            <div class="lp-step-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="1.5" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
            </div>
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
            <div class="lp-feature" data-feature="${i}" style="animation-delay:${i * 80}ms" role="button" tabindex="0" aria-label="Learn more about ${f.title}">
              <div class="lp-feature-img">
                <img src="${f.img}" alt="${f.title}" loading="lazy">
              </div>
              <div class="lp-feature-body">
                <h3>${f.title}</h3>
                <p>${f.desc}</p>
                <span class="lp-feature-more">Learn more <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M5 12h14m-7-7l7 7-7 7"/></svg></span>
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- ===== TRUST ===== -->
      <section class="lp-section lp-trust-section">
        <p class="lp-eyebrow">Powered by</p>
        <div class="lp-trust">
          ${TRUST_BADGES.map(t => `
            <div class="lp-trust-badge">
              <span class="lp-trust-icon">${t.icon}</span>
              <span class="lp-trust-name">${t.name}</span>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- ===== FINAL CTA ===== -->
      <section class="lp-final-cta">
        <div class="lp-logo-mark lp-logo-small">${LOGO_IMG_SM}</div>
        <h2>Ready to streamline your job search?</h2>
        <p class="lp-final-metric">Join and search <strong>thousands of jobs</strong> across 4 sources in seconds.</p>
        <div class="lp-cta-row">
          <button class="lp-cta-primary" id="landingSignUp2">
            Get started free
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M5 12h14m-7-7l7 7-7 7"/></svg>
          </button>
        </div>
        <button class="lp-guest-link" id="landingGuest">or continue as guest</button>
      </section>

      <!-- ===== FOOTER ===== -->
      <footer class="lp-footer">
        <div class="lp-footer-inner">
          <div class="lp-footer-brand">
            <img src="assets/icons/logo.svg" alt="JobSynk" width="24" height="24" style="border-radius:6px">
            <span>JobSynk</span>
          </div>
          <div class="lp-footer-links">
            <a href="mailto:hello@qq-studios.com" class="lp-footer-link">Contact</a>
            <span class="lp-footer-sep">&middot;</span>
            <a href="mailto:support@qq-studios.com" class="lp-footer-link">Support</a>
            <span class="lp-footer-sep">&middot;</span>
            <a href="/privacy.html" target="_blank" class="lp-footer-link">Privacy</a>
            <span class="lp-footer-sep">&middot;</span>
            <a href="/terms.html" target="_blank" class="lp-footer-link">Terms</a>
            <span class="lp-footer-sep">&middot;</span>
            <a href="#auth" class="lp-footer-link">Sign In</a>
          </div>
          <p class="lp-footer-copy">&copy; ${new Date().getFullYear()} QQ Studios LLC. All rights reserved.</p>
        </div>
      </footer>

      <!-- ===== FEATURE DETAIL OVERLAY ===== -->
      <div class="lp-detail-overlay" id="featureOverlay" aria-hidden="true">
        <div class="lp-detail-backdrop" id="featureBackdrop"></div>
        <div class="lp-detail-panel" id="featurePanel" role="dialog" aria-modal="true">
          <button class="lp-detail-close" id="featureClose" aria-label="Close detail view">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
          <div class="lp-detail-content" id="featureContent"></div>
        </div>
      </div>

    </div>

    <style>
      /* ===== Landing page scoped styles ===== */
      .lp { max-width: 100%; overflow-x: hidden; }

      /* Enhancement #7: Hide app chrome on landing */
      body.lp-active header { border-bottom-color: transparent; background: transparent; backdrop-filter: none; box-shadow: none; }
      body.lp-active .hamburger { display: none; }
      body.lp-active header .brand h1 { display: none; }
      body.lp-active header .brand .logo { display: none; }
      body.lp-active header .brand .tag { display: none; }

      /* ===== Hero ===== */
      .lp-hero {
        position: relative;
        min-height: calc(100vh - var(--header-height));
        display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
        padding: 48px 24px 0;
        background:
          radial-gradient(ellipse at 30% 10%, rgba(196,123,58,0.1), transparent 50%),
          radial-gradient(ellipse at 70% 80%, rgba(45,139,95,0.06), transparent 40%),
          radial-gradient(ellipse at 50% 50%, rgba(196,123,58,0.03), transparent 70%),
          var(--color-bg);
        overflow: hidden;
      }

      /* Ambient floating shapes */
      .lp-hero-shapes { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
      .lp-shape {
        position: absolute; border-radius: 50%;
        background: var(--color-primary);
        opacity: 0.04;
        animation: lpFloat 20s ease-in-out infinite;
      }
      .lp-shape-1 { width: 300px; height: 300px; top: -80px; right: -60px; animation-delay: 0s; }
      .lp-shape-2 { width: 200px; height: 200px; bottom: 20%; left: -40px; animation-delay: -7s; background: var(--color-accent); }
      .lp-shape-3 { width: 150px; height: 150px; top: 40%; right: 10%; animation-delay: -14s; }

      @keyframes lpFloat {
        0%, 100% { transform: translate(0, 0) scale(1); }
        33% { transform: translate(20px, -30px) scale(1.05); }
        66% { transform: translate(-15px, 20px) scale(0.95); }
      }

      .lp-hero-inner { max-width: 640px; text-align: center; position: relative; z-index: 1; }

      .lp-logo-mark {
        width: 88px; height: 88px; margin: 0 auto 28px;
        border-radius: 22px;
        display: flex; align-items: center; justify-content: center;
        animation: fadeIn 0.6s ease-out;
        overflow: hidden;
        box-shadow: 0 8px 32px rgba(196,123,58,0.2), 0 0 0 1px rgba(196,123,58,0.08);
      }
      .lp-logo-mark img { border-radius: inherit; width: 100%; height: 100%; }
      .lp-logo-small { width: 56px; height: 56px; border-radius: 14px; margin-bottom: 20px; box-shadow: 0 4px 16px rgba(196,123,58,0.15); }
      .lp-logo-small img { width: 100%; height: 100%; }

      .lp-headline {
        font-family: var(--font-display);
        font-size: clamp(36px, 5.5vw, 56px);
        font-weight: 700;
        line-height: 1.08;
        letter-spacing: -0.03em;
        color: var(--color-text-heading);
        margin-bottom: 20px;
        animation: fadeIn 0.6s ease-out 0.1s backwards;
      }
      .lp-headline-accent {
        background: linear-gradient(135deg, var(--color-primary), #E8A862);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .lp-subhead {
        font-size: clamp(15px, 2vw, 18px);
        line-height: 1.65;
        color: var(--color-text-dim);
        max-width: 520px;
        margin: 0 auto 36px;
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
        cursor: pointer; transition: all 0.2s;
        box-shadow: 0 2px 12px rgba(196,123,58,0.25);
        display: inline-flex; align-items: center; gap: 8px;
      }
      .lp-cta-primary:hover { background: var(--color-primary-bright); transform: translateY(-2px); box-shadow: 0 6px 24px rgba(196,123,58,0.35); }
      .lp-cta-primary:active { transform: translateY(0); }

      .lp-cta-secondary {
        background: var(--color-surface); color: var(--color-text);
        border: 1px solid var(--color-surface-border);
        padding: 14px 28px; border-radius: 12px;
        font-family: var(--font-body); font-size: 16px; font-weight: 600;
        cursor: pointer; transition: all 0.2s;
      }
      .lp-cta-secondary:hover { border-color: var(--color-primary); color: var(--color-primary); }

      .lp-cta-demo {
        background: transparent;
        color: var(--color-accent);
        border: 2px solid var(--color-accent);
        padding: 12px 28px;
        border-radius: 12px;
        font-family: var(--font-body);
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .lp-cta-demo:hover {
        background: var(--color-accent);
        color: #fff;
        transform: translateY(-2px);
        box-shadow: 0 4px 20px rgba(45,139,95,0.3);
      }

      .lp-note { font-size: 13px; color: var(--color-muted); margin-top: 16px; animation: fadeIn 0.6s ease-out 0.4s backwards; }

      /* ===== Product Mockup ===== */
      .lp-mockup {
        width: 100%; max-width: 860px;
        margin: 48px auto 0;
        position: relative; z-index: 1;
        animation: lpMockupIn 0.8s ease-out 0.5s backwards;
        filter: drop-shadow(0 24px 64px rgba(0,0,0,0.15));
      }
      .lp-mockup-svg { width: 100%; height: auto; border-radius: 12px; }

      @keyframes lpMockupIn {
        from { opacity: 0; transform: translateY(40px) scale(0.96); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      /* ===== Stats Bar ===== */
      .lp-stats-bar {
        display: flex; justify-content: center; gap: 0; flex-wrap: wrap;
        background: var(--color-surface);
        border-top: 1px solid var(--color-surface-border);
        border-bottom: 1px solid var(--color-surface-border);
        padding: 0;
      }
      .lp-stat {
        flex: 1; min-width: 140px; max-width: 240px;
        display: flex; flex-direction: column; align-items: center;
        padding: 28px 20px;
        border-right: 1px solid var(--color-surface-border);
      }
      .lp-stat:last-child { border-right: none; }
      .lp-stat-value {
        font-family: var(--font-display);
        font-size: 28px; font-weight: 700;
        color: var(--color-primary);
        letter-spacing: -0.02em;
        line-height: 1;
      }
      .lp-stat-label {
        font-size: 13px; font-weight: 500;
        color: var(--color-text-dim);
        margin-top: 6px;
      }

      /* ===== Sections ===== */
      .lp-section { padding: 80px 24px; max-width: 1040px; margin: 0 auto; }
      .lp-section-alt { background: var(--color-bg-secondary); max-width: 100%; padding: 80px 24px; }
      .lp-section-alt > * { max-width: 1040px; margin-left: auto; margin-right: auto; }
      .lp-eyebrow {
        font-size: 12px; font-weight: 700; text-transform: uppercase;
        letter-spacing: 2px; color: var(--color-primary);
        margin-bottom: 10px; text-align: center;
      }
      .lp-section-title {
        font-family: var(--font-display);
        font-size: clamp(24px, 3.5vw, 36px);
        font-weight: 700; color: var(--color-text-heading);
        text-align: center; margin-bottom: 48px;
        letter-spacing: -0.02em;
      }

      /* ===== How It Works ===== */
      .lp-steps {
        display: flex; align-items: flex-start; justify-content: center;
        gap: 0; flex-wrap: wrap;
      }
      .lp-step {
        flex: 1; min-width: 220px; max-width: 280px;
        background: var(--color-surface);
        border: 1px solid var(--color-surface-border);
        border-radius: 16px; padding: 32px 24px;
        text-align: center;
        box-shadow: var(--shadow-sm);
        position: relative;
        transition: all 0.2s;
      }
      .lp-step:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
      .lp-step-num {
        width: 32px; height: 32px; border-radius: 50%;
        background: var(--color-primary); color: #fff;
        font-family: var(--font-display); font-size: 14px; font-weight: 700;
        display: flex; align-items: center; justify-content: center;
        margin: 0 auto 12px;
      }
      .lp-step-icon { margin-bottom: 16px; }
      .lp-step h3 { font-size: 16px; font-weight: 600; color: var(--color-text-heading); margin-bottom: 8px; letter-spacing: 0; text-transform: none; }
      .lp-step p { font-size: 14px; color: var(--color-text-dim); line-height: 1.6; }

      .lp-step-connector {
        display: flex; align-items: center; padding: 0 4px; height: 100px;
      }
      .lp-step-line {
        width: 40px; height: 2px;
        background: linear-gradient(90deg, var(--color-primary) 0%, var(--color-accent) 100%);
        opacity: 0.3;
        border-radius: 1px;
      }

      /* ===== Features ===== */
      .lp-features {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 24px;
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
        border-color: rgba(196,123,58,0.2);
        box-shadow: 0 12px 40px rgba(0,0,0,0.08);
        transform: translateY(-4px);
      }
      .lp-feature-img {
        width: 100%; height: 180px;
        display: flex; align-items: center; justify-content: center;
        overflow: hidden;
        border-bottom: 1px solid var(--color-surface-border);
        padding: 12px;
      }
      .lp-feature-img img {
        width: 100%; height: 100%;
        object-fit: contain;
        transition: transform 0.3s ease;
      }
      .lp-feature:hover .lp-feature-img img { transform: scale(1.06); }
      .lp-feature-body { padding: 22px; }
      .lp-feature { cursor: pointer; }
      .lp-feature-body h3 { font-size: 16px; font-weight: 650; color: var(--color-text-heading); margin-bottom: 8px; letter-spacing: -0.01em; text-transform: none; }
      .lp-feature-body p { font-size: 13px; color: var(--color-text-dim); line-height: 1.65; }
      .lp-feature-more {
        display: inline-flex; align-items: center; gap: 4px;
        font-size: 13px; font-weight: 600;
        color: var(--color-primary);
        margin-top: 12px;
        opacity: 0; transform: translateX(-4px);
        transition: all 0.2s ease;
      }
      .lp-feature:hover .lp-feature-more { opacity: 1; transform: translateX(0); }

      /* ===== Trust Badges ===== */
      .lp-trust-section { padding-top: 48px; padding-bottom: 48px; }
      .lp-trust {
        display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;
      }
      .lp-trust-badge {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 10px 18px;
        background: var(--color-surface);
        border: 1px solid var(--color-surface-border);
        border-radius: 100px;
        font-size: 13px; font-weight: 500;
        color: var(--color-text-dim);
        transition: all 0.15s;
      }
      .lp-trust-badge:hover { border-color: var(--color-primary-dim); color: var(--color-text-heading); }
      .lp-trust-icon { display: flex; align-items: center; color: var(--color-primary); opacity: 0.7; }

      /* ===== Final CTA ===== */
      .lp-final-cta {
        text-align: center; padding: 80px 24px 64px;
        background:
          radial-gradient(ellipse at 50% 100%, rgba(196,123,58,0.08), transparent 50%),
          radial-gradient(ellipse at 20% 50%, rgba(45,139,95,0.04), transparent 40%),
          var(--color-bg);
      }
      .lp-final-cta h2 {
        font-family: var(--font-display);
        font-size: clamp(24px, 3.5vw, 32px); font-weight: 700;
        color: var(--color-text-heading);
        margin-bottom: 12px;
        letter-spacing: -0.02em;
      }
      .lp-final-metric { font-size: 16px; color: var(--color-text-dim); margin-bottom: 32px; line-height: 1.6; }
      .lp-final-metric strong { color: var(--color-text-heading); font-weight: 600; }

      .lp-guest-link {
        display: block; margin-top: 16px;
        background: none; border: none;
        font-size: 14px; color: var(--color-muted);
        cursor: pointer; font-family: var(--font-body);
        transition: color 0.15s;
      }
      .lp-guest-link:hover { color: var(--color-primary); }

      /* ===== Footer ===== */
      .lp-footer {
        border-top: 1px solid var(--color-surface-border);
        background: var(--color-surface);
        padding: 32px 24px;
      }
      .lp-footer-inner {
        max-width: 960px; margin: 0 auto;
        display: flex; align-items: center; justify-content: space-between;
        flex-wrap: wrap; gap: 16px;
      }
      .lp-footer-brand {
        display: flex; align-items: center; gap: 10px;
        font-size: 15px; font-weight: 600;
        color: var(--color-text-heading);
      }
      .lp-footer-links { display: flex; align-items: center; gap: 8px; }
      .lp-footer-link {
        font-size: 13px; color: var(--color-text-dim);
        text-decoration: none; transition: color 0.15s;
      }
      .lp-footer-link:hover { color: var(--color-primary); }
      .lp-footer-sep { color: var(--color-muted); font-size: 12px; }
      .lp-footer-copy { font-size: 12px; color: var(--color-muted); }

      /* ===== Feature Detail Overlay ===== */
      .lp-detail-overlay {
        position: fixed; inset: 0; z-index: 9999;
        display: flex; align-items: flex-end; justify-content: center;
        pointer-events: none; opacity: 0;
        transition: opacity 0.3s ease;
      }
      .lp-detail-overlay.open { pointer-events: auto; opacity: 1; }

      .lp-detail-backdrop {
        position: absolute; inset: 0;
        background: rgba(0,0,0,0.5);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
      }

      .lp-detail-panel {
        position: relative; z-index: 1;
        width: 100%; max-width: 720px;
        max-height: 90vh;
        background: var(--color-surface);
        border-radius: 20px 20px 0 0;
        overflow-y: auto;
        transform: translateY(100%);
        transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        box-shadow: 0 -8px 40px rgba(0,0,0,0.15);
      }
      .lp-detail-overlay.open .lp-detail-panel { transform: translateY(0); }

      .lp-detail-close {
        position: sticky; top: 0; float: right;
        margin: 16px 16px 0 0;
        width: 40px; height: 40px;
        border-radius: 50%;
        border: 1px solid var(--color-surface-border);
        background: var(--color-surface);
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; z-index: 2;
        color: var(--color-text-dim);
        transition: all 0.15s;
        box-shadow: var(--shadow-sm);
      }
      .lp-detail-close:hover { background: var(--color-bg-secondary); color: var(--color-text-heading); }

      .lp-detail-content { padding: 0 32px 40px; }

      /* Detail: Hero area */
      .lp-detail-hero {
        display: flex; align-items: center; gap: 20px;
        margin-bottom: 28px; padding-top: 8px;
      }
      .lp-detail-hero-img {
        width: 80px; height: 80px; flex-shrink: 0;
        border-radius: 16px; overflow: hidden;
        border: 1px solid var(--color-surface-border);
        display: flex; align-items: center; justify-content: center;
        padding: 4px;
        background: var(--color-bg-secondary);
      }
      .lp-detail-hero-img img { width: 100%; height: 100%; object-fit: contain; }
      .lp-detail-hero-text h2 {
        font-family: var(--font-display);
        font-size: clamp(22px, 3vw, 28px);
        font-weight: 700; color: var(--color-text-heading);
        letter-spacing: -0.02em; line-height: 1.2;
        margin-bottom: 4px;
      }
      .lp-detail-hero-text .lp-detail-subtitle {
        font-size: 14px; color: var(--color-primary); font-weight: 600;
        text-transform: uppercase; letter-spacing: 1px;
      }

      /* Detail: Intro */
      .lp-detail-intro {
        font-size: 16px; line-height: 1.7;
        color: var(--color-text-dim);
        margin-bottom: 32px;
        max-width: 600px;
      }

      /* Detail: Highlight cards */
      .lp-detail-highlights {
        display: grid; grid-template-columns: 1fr 1fr;
        gap: 16px; margin-bottom: 36px;
      }
      .lp-detail-hl {
        padding: 20px;
        border-radius: 14px;
        border: 1px solid var(--color-surface-border);
        background: var(--color-bg-secondary);
        transition: all 0.2s;
      }
      .lp-detail-hl:hover { border-color: var(--color-primary-dim); transform: translateY(-2px); box-shadow: var(--shadow-sm); }
      .lp-detail-hl-header {
        display: flex; align-items: center; gap: 10px;
        margin-bottom: 8px;
      }
      .lp-detail-hl-icon { font-size: 20px; line-height: 1; }
      .lp-detail-hl-label {
        font-size: 14px; font-weight: 650;
        color: var(--color-text-heading);
        letter-spacing: -0.01em;
      }
      .lp-detail-hl-text {
        font-size: 13px; line-height: 1.6;
        color: var(--color-text-dim);
      }

      /* Detail: CTA */
      .lp-detail-cta-row {
        display: flex; gap: 12px; flex-wrap: wrap;
        padding-top: 8px;
        border-top: 1px solid var(--color-surface-border);
        margin-top: 4px;
      }
      .lp-detail-cta-try {
        display: inline-flex; align-items: center; gap: 8px;
        background: var(--color-primary); color: #fff; border: none;
        padding: 12px 28px; border-radius: 12px;
        font-family: var(--font-body); font-size: 15px; font-weight: 600;
        cursor: pointer; transition: all 0.2s;
        box-shadow: 0 2px 12px rgba(196,123,58,0.2);
      }
      .lp-detail-cta-try:hover { background: var(--color-primary-bright); transform: translateY(-1px); }
      .lp-detail-cta-back {
        display: inline-flex; align-items: center; gap: 6px;
        background: var(--color-bg-secondary); color: var(--color-text-dim);
        border: 1px solid var(--color-surface-border);
        padding: 12px 24px; border-radius: 12px;
        font-family: var(--font-body); font-size: 15px; font-weight: 500;
        cursor: pointer; transition: all 0.15s;
      }
      .lp-detail-cta-back:hover { border-color: var(--color-primary); color: var(--color-text-heading); }

      /* ===== Responsive ===== */
      @media (max-width: 768px) {
        .lp-hero { padding: 32px 16px 0; min-height: auto; }
        .lp-mockup { margin-top: 32px; }
        .lp-steps { flex-direction: column; align-items: center; }
        .lp-step { max-width: 100%; }
        .lp-step-connector { height: auto; padding: 8px 0; }
        .lp-step-line { width: 2px; height: 24px; }
        .lp-step-connector { flex-direction: column; }
        .lp-features { grid-template-columns: 1fr; }
        .lp-section, .lp-section-alt { padding: 48px 16px; }
        .lp-stats-bar { flex-direction: column; }
        .lp-stat { border-right: none; border-bottom: 1px solid var(--color-surface-border); padding: 20px; flex-direction: row; gap: 12px; max-width: 100%; }
        .lp-stat:last-child { border-bottom: none; }
        .lp-footer-inner { flex-direction: column; text-align: center; }
        .lp-detail-content { padding: 0 20px 32px; }
        .lp-detail-highlights { grid-template-columns: 1fr; }
        .lp-detail-hero { flex-direction: column; text-align: center; }
        .lp-detail-intro { text-align: center; }
        .lp-detail-cta-row { justify-content: center; }
      }
      @media (min-width: 769px) and (max-width: 1024px) {
        .lp-features { grid-template-columns: repeat(2, 1fr); }
      }
      @media (max-width: 480px) {
        .lp-headline { font-size: 32px; }
        .lp-cta-primary, .lp-cta-demo, .lp-cta-secondary { width: 100%; justify-content: center; }
        .lp-features { gap: 16px; }
        .lp-feature-img { height: 140px; }
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

  const demo = async () => {
    try {
      const user = await signInAnonymously();
      if (user) {
        localStorage.setItem(STORAGE_KEYS.onboarded, 'true');
        localStorage.setItem('jobsynk_demo_mode', 'true');
        const { provisionUser } = await import('../firebase/provisioning.js');
        await provisionUser({ name: 'Demo User', role: 'Candidate', theme: 'default' }, true);
        navigate('dashboard');
      }
    } catch (e) {
      console.error('Demo failed:', e);
    }
  };

  container.querySelector('#landingDemo')?.addEventListener('click', demo);
  container.querySelector('#landingSignUp')?.addEventListener('click', signUp);
  container.querySelector('#landingSignUp2')?.addEventListener('click', signUp);
  container.querySelector('#landingSignIn')?.addEventListener('click', signIn);

  // Swipe carousel for feature cards on mobile
  initSwipeCards(container.querySelector('.lp-features'), { label: 'Features', wide: true });
  container.querySelector('#landingGuest')?.addEventListener('click', guest);

  /* ===== Feature Detail Overlay ===== */
  const overlay = container.querySelector('#featureOverlay');
  const panel = container.querySelector('#featurePanel');
  const content = container.querySelector('#featureContent');

  function openDetail(index) {
    const f = FEATURES[index];
    if (!f || !f.detail) return;
    const d = f.detail;

    content.innerHTML = `
      <div class="lp-detail-hero">
        <div class="lp-detail-hero-img"><img src="${f.img}" alt="${f.title}"></div>
        <div class="lp-detail-hero-text">
          <div class="lp-detail-subtitle">${f.title}</div>
          <h2>${d.headline}</h2>
        </div>
      </div>

      <p class="lp-detail-intro">${d.intro}</p>

      <div class="lp-detail-highlights">
        ${d.highlights.map(h => `
          <div class="lp-detail-hl">
            <div class="lp-detail-hl-header">
              <span class="lp-detail-hl-icon">${h.icon}</span>
              <span class="lp-detail-hl-label">${h.label}</span>
            </div>
            <p class="lp-detail-hl-text">${h.text}</p>
          </div>
        `).join('')}
      </div>

      <div class="lp-detail-cta-row">
        <button class="lp-detail-cta-try" data-nav="${d.cta}">
          ${d.ctaLabel}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M5 12h14m-7-7l7 7-7 7"/></svg>
        </button>
        <button class="lp-detail-cta-back" id="detailBack">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 12H5m7-7l-7 7 7 7"/></svg>
          Back to features
        </button>
      </div>
    `;

    // Scroll panel to top
    panel.scrollTop = 0;

    // Show overlay
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Wire up detail CTA
    content.querySelector('[data-nav]')?.addEventListener('click', () => {
      closeDetail();
      sessionStorage.setItem('authMode', 'signup');
      navigate('auth');
    });
    content.querySelector('#detailBack')?.addEventListener('click', closeDetail);
  }

  function closeDetail() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // Feature card click handlers
  container.querySelectorAll('.lp-feature[data-feature]').forEach(card => {
    const handler = () => openDetail(parseInt(card.dataset.feature, 10));
    card.addEventListener('click', handler);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); } });
  });

  // Close on backdrop click, close button, or Escape
  container.querySelector('#featureBackdrop')?.addEventListener('click', closeDetail);
  container.querySelector('#featureClose')?.addEventListener('click', closeDetail);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeDetail();
  });
}

export default { renderLanding };
