/**
 * JobSync — Chrome Extension Content Script
 * Extracts job data from supported job board pages and provides
 * a floating "Save to JobSync" button.
 */

(function () {
  'use strict';

  // Prevent double-injection
  if (document.getElementById('jobsync-save-btn')) return;

  const EXTRACTORS = {
    'linkedin.com': extractLinkedIn,
    'indeed.com': extractIndeed,
    'glassdoor.com': extractGlassdoor,
    'ziprecruiter.com': extractZipRecruiter,
    'dice.com': extractDice,
    'remotive.com': extractRemotive,
  };

  // Determine which extractor to use
  const hostname = window.location.hostname.replace('www.', '');
  const extractor = Object.entries(EXTRACTORS).find(([domain]) => hostname.includes(domain));
  if (!extractor) return;

  // Wait for page to load dynamic content
  setTimeout(() => {
    const [domain, extractFn] = extractor;
    const job = extractFn();
    if (job && job.title) {
      injectSaveButton(job);
    }
  }, 2000);

  // ---- Extractors ----

  function extractLinkedIn() {
    const title = document.querySelector('.job-details-jobs-unified-top-card__job-title, .topcard__title, h1.t-24')?.textContent?.trim();
    const company = document.querySelector('.job-details-jobs-unified-top-card__company-name a, .topcard__org-name-link, a.topcard__org-name-link')?.textContent?.trim();
    const location = document.querySelector('.job-details-jobs-unified-top-card__bullet, .topcard__flavor--bullet')?.textContent?.trim();
    const salary = document.querySelector('.salary-main-rail__min-max, .compensation__salary')?.textContent?.trim();
    return { title, company, location, salary, url: window.location.href, source: 'LinkedIn' };
  }

  function extractIndeed() {
    const title = document.querySelector('h1.jobsearch-JobInfoHeader-title, .jobsearch-JobInfoHeader-title span')?.textContent?.trim();
    const company = document.querySelector('[data-company-name], .jobsearch-InlineCompanyRating-companyHeader a, div[data-testid="inlineHeader-companyName"] a')?.textContent?.trim();
    const location = document.querySelector('[data-testid="job-location"], .jobsearch-JobInfoHeader-subtitle > div:last-child')?.textContent?.trim();
    const salary = document.querySelector('#salaryInfoAndJobType span, [data-testid="attribute_snippet_testid"]')?.textContent?.trim();
    return { title, company, location, salary, url: window.location.href, source: 'Indeed' };
  }

  function extractGlassdoor() {
    const title = document.querySelector('[data-test="job-title"], h1.css-1vg6q84')?.textContent?.trim();
    const company = document.querySelector('[data-test="employer-name"], .css-87uc0g')?.textContent?.trim();
    const location = document.querySelector('[data-test="location"], .css-56kyx5')?.textContent?.trim();
    const salary = document.querySelector('[data-test="detailSalary"]')?.textContent?.trim();
    return { title, company, location, salary, url: window.location.href, source: 'Glassdoor' };
  }

  function extractZipRecruiter() {
    const title = document.querySelector('h1.job_title, .job-title')?.textContent?.trim();
    const company = document.querySelector('.hiring_company_text a, .company-name')?.textContent?.trim();
    const location = document.querySelector('.location_text, .job-location')?.textContent?.trim();
    return { title, company, location, salary: '', url: window.location.href, source: 'ZipRecruiter' };
  }

  function extractDice() {
    const title = document.querySelector('h1[data-cy="jobTitle"], h1.jobTitle')?.textContent?.trim();
    const company = document.querySelector('[data-cy="companyNameLink"], a.companyLink')?.textContent?.trim();
    const location = document.querySelector('[data-cy="locationText"], .location')?.textContent?.trim();
    return { title, company, location, salary: '', url: window.location.href, source: 'Dice' };
  }

  function extractRemotive() {
    const title = document.querySelector('h1.job-title, h1')?.textContent?.trim();
    const company = document.querySelector('.company-name, .job-company')?.textContent?.trim();
    const location = document.querySelector('.job-location')?.textContent?.trim();
    return { title, company, location, salary: '', url: window.location.href, source: 'Remotive' };
  }

  // ---- Save Button ----

  function injectSaveButton(job) {
    const btn = document.createElement('div');
    btn.id = 'jobsync-save-btn';
    btn.innerHTML = `
      <div id="jobsync-popup" style="display:none;">
        <div style="font-weight:700;font-size:13px;margin-bottom:8px;color:#ff1a1a;">Save to JobSync</div>
        <div style="font-size:12px;margin-bottom:4px;"><strong>${escapeHtml(job.title || 'Untitled')}</strong></div>
        <div style="font-size:11px;color:#888;margin-bottom:8px;">${escapeHtml(job.company || '')} — ${escapeHtml(job.source)}</div>
        <button id="jobsync-confirm-save" style="background:#ff1a1a;color:#fff;border:none;padding:8px 16px;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;width:100%;">SAVE TO TRACKER</button>
        <div id="jobsync-save-status" style="font-size:11px;color:#888;margin-top:4px;text-align:center;"></div>
      </div>
      <button id="jobsync-fab" title="Save to JobSync">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="9" stroke="#ff1a1a" stroke-width="2" fill="#050508"/>
          <text x="10" y="14" text-anchor="middle" fill="#ff1a1a" font-weight="900" font-size="11" font-family="Arial">T</text>
        </svg>
      </button>
    `;

    document.body.appendChild(btn);

    // Toggle popup
    document.getElementById('jobsync-fab').addEventListener('click', () => {
      const popup = document.getElementById('jobsync-popup');
      popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
    });

    // Save action
    document.getElementById('jobsync-confirm-save').addEventListener('click', async () => {
      const statusEl = document.getElementById('jobsync-save-status');
      statusEl.textContent = 'Saving...';

      try {
        // Store job in extension storage for the popup/app to pick up
        const jobData = {
          ...job,
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
          status: 'Saved',
          _added: new Date().toISOString().slice(0, 10),
          _extensionAdded: true,
          salary: (job.salary || '').replace(/[^0-9]/g, ''),
        };

        // Save to Chrome extension storage
        if (typeof chrome !== 'undefined' && chrome.storage) {
          const existing = await new Promise(r => chrome.storage.local.get('pendingJobs', d => r(d.pendingJobs || [])));
          existing.push(jobData);
          await new Promise(r => chrome.storage.local.set({ pendingJobs: existing }, r));
        }

        // Also try to save to localStorage (if same origin)
        try {
          const jobs = JSON.parse(localStorage.getItem('tron_jobs') || '[]');
          jobs.push(jobData);
          localStorage.setItem('tron_jobs', JSON.stringify(jobs));
        } catch (e) { /* cross-origin, expected */ }

        statusEl.textContent = '✓ Saved to JobSync!';
        statusEl.style.color = '#00ff6a';
        document.getElementById('jobsync-confirm-save').disabled = true;
        document.getElementById('jobsync-confirm-save').textContent = 'SAVED';

        // Badge notification
        if (typeof chrome !== 'undefined' && chrome.action) {
          chrome.action.setBadgeText({ text: '+1' });
          chrome.action.setBadgeBackgroundColor({ color: '#ff1a1a' });
          setTimeout(() => chrome.action.setBadgeText({ text: '' }), 3000);
        }
      } catch (err) {
        statusEl.textContent = 'Error: ' + err.message;
        statusEl.style.color = '#ff3b3b';
      }
    });
  }

  function escapeHtml(s) {
    return (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
})();
