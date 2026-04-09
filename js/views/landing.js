/* ============================================================
   views/landing.js — Landing / hero page
   ============================================================ */

import { escapeHtml } from '../utils.js';
import { navigate } from '../router.js';

/**
 * Render the landing page with hero section.
 * @param {HTMLElement} container — the section element to render into
 */
export function renderLanding(container) {
  container.innerHTML = `
    <div style="text-align:center;padding:40px 20px;max-width:800px;margin:0 auto;">
      <div style="margin-bottom:32px;">
        <div style="width:80px;height:80px;margin:0 auto 20px;border:3px solid var(--orange);border-radius:50%;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle, rgba(255,0,0,0.3), transparent);box-shadow:0 0 40px rgba(255,0,0,0.6);animation:pulse 3s ease-in-out infinite;">
          <span style="font-weight:900;font-size:36px;color:var(--orange);">T</span>
        </div>
        <h1 style="font-size:36px;font-weight:900;color:var(--white);text-shadow:0 0 20px var(--orange-glow);letter-spacing:3px;margin-bottom:8px;">
          JobGrid Pro
        </h1>
        <p style="font-size:16px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;">
          Track. Analyze. Land the Role.
        </p>
      </div>

      <div class="grid cols-3" style="margin:40px 0;gap:20px;">
        <div class="panel" style="padding:24px;text-align:center;">
          <div style="font-size:32px;margin-bottom:12px;">&#9670;</div>
          <h3 style="font-size:14px;margin-bottom:8px;">Smart Tracking</h3>
          <p style="font-size:12px;color:var(--muted);line-height:1.6;">
            Kanban board and table views. Status pipeline, follow-up reminders, salary tracking, and CSV import/export.
          </p>
        </div>
        <div class="panel" style="padding:24px;text-align:center;">
          <div style="font-size:32px;margin-bottom:12px;">&#9670;</div>
          <h3 style="font-size:14px;margin-bottom:8px;">AI Analysis</h3>
          <p style="font-size:12px;color:var(--muted);line-height:1.6;">
            Match resumes to job descriptions, generate cover letters, and parse JDs with local algorithms or Gemini AI.
          </p>
        </div>
        <div class="panel" style="padding:24px;text-align:center;">
          <div style="font-size:32px;margin-bottom:12px;">&#9670;</div>
          <h3 style="font-size:14px;margin-bottom:8px;">Real-time Search</h3>
          <p style="font-size:12px;color:var(--muted);line-height:1.6;">
            Search remote and local jobs via Remotive and Adzuna APIs. Add results to your tracker with one click.
          </p>
        </div>
      </div>

      <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-top:32px;">
        <button class="btn brand" id="landingGetStarted" style="padding:14px 32px;font-size:14px;">
          GET STARTED
        </button>
        <button class="btn ghost" id="landingSkip" style="padding:14px 32px;font-size:14px;">
          SKIP TO DASHBOARD
        </button>
      </div>
    </div>
  `;

  container.querySelector('#landingGetStarted')?.addEventListener('click', () => {
    navigate('profile');
  });
  container.querySelector('#landingSkip')?.addEventListener('click', () => {
    navigate('dashboard');
  });
}

export default { renderLanding };
