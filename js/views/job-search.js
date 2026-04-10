/* ============================================================
   views/job-search.js — Job search (Remotive + Adzuna)
   ============================================================ */

import { escapeHtml } from '../utils.js';
import { searchRemotive } from '../services/search-remotive.js';
import { searchAdzuna } from '../services/search-adzuna.js';
import { searchArbeitnow } from '../services/search-arbeitnow.js';
import { searchJSearch } from '../services/search-jsearch.js';
import { getApi, hasApi } from '../services/api-keys.js';
import { toast } from '../components/toast.js';
import { ENDPOINTS } from '../config.js';
import { checkLimit, recordUsage } from '../services/usage-tracker.js';
import { showUpgradeBanner, showUsageMeter } from '../components/upgrade-banner.js';
import { uid, today } from '../utils.js';
import { completeChecklistItem } from '../components/getting-started.js';

/**
 * Render the job search view.
 * @param {HTMLElement} container — section element
 * @param {object} state — state store
 * @param {Function} addJob — callback to add a job to tracker
 */
export function renderJobSearch(container, state, addJob) {
  const searchBtn = container.querySelector('#searchRemotiveBtn');
  const arbeitnowBtn = container.querySelector('#searchArbeitnowBtn');
  const adzunaBtn = container.querySelector('#searchAdzunaBtn');
  const jsearchBtn = container.querySelector('#searchJSearchBtn');
  const statusEl = container.querySelector('#searchStatus');
  const resultsEl = container.querySelector('#searchResults');

  if (searchBtn) {
    searchBtn.onclick = async () => {
      const { allowed } = checkLimit('remotive');
      if (!allowed) { showUpgradeBanner(container, 'remotive'); return; }

      const keyword = (container.querySelector('#searchKeyword')?.value || '').trim();
      if (statusEl) statusEl.innerHTML = '<span class="spinner"></span> Searching Remotive...';
      if (resultsEl) resultsEl.innerHTML = '';

      try {
        const jobs = await searchRemotive(keyword);
        recordUsage('remotive');
        completeChecklistItem('firstSearch');
        const shown = jobs.slice(0, 20);
        if (statusEl) statusEl.textContent = `Found ${jobs.length} remote jobs (showing ${shown.length})`;
        if (resultsEl) resultsEl.innerHTML = renderResults(shown, addJob);
        bindAddButtons(resultsEl, addJob);
      } catch (err) {
        if (statusEl) statusEl.textContent = 'Error: ' + err.message;
        toast('Remotive search failed: ' + err.message, 'error');
      }
    };
  }

  // Arbeitnow — free, no key
  if (arbeitnowBtn) {
    arbeitnowBtn.onclick = async () => {
      const { allowed } = checkLimit('arbeitnow');
      if (!allowed) { showUpgradeBanner(container, 'arbeitnow'); return; }

      const keyword = (container.querySelector('#searchKeyword')?.value || '').trim();
      if (statusEl) statusEl.innerHTML = '<span class="spinner"></span> Searching Arbeitnow...';
      if (resultsEl) resultsEl.innerHTML = '';
      try {
        const jobs = await searchArbeitnow(keyword);
        recordUsage('arbeitnow');
        if (statusEl) statusEl.textContent = `Found ${jobs.length} European/remote jobs`;
        if (resultsEl) resultsEl.innerHTML = renderResults(jobs);
        bindAddButtons(resultsEl, addJob);
      } catch (err) {
        if (statusEl) statusEl.textContent = 'Error: ' + err.message;
        toast('Arbeitnow search failed: ' + err.message, 'error');
      }
    };
  }

  // JSearch — requires RapidAPI key
  if (jsearchBtn) {
    jsearchBtn.onclick = async () => {
      const { allowed: jsAllowed } = checkLimit('jsearch');
      if (!jsAllowed) { showUpgradeBanner(container, 'jsearch'); return; }
      if (!hasApi('jsearchKey')) {
        toast('Configure JSearch RapidAPI key in Settings first', 'error');
        return;
      }
      const keyword = (container.querySelector('#searchKeyword')?.value || '').trim() || 'developer';
      const location = (container.querySelector('#searchLocation')?.value || '').trim();
      const query = location ? `${keyword} in ${location}` : keyword;
      if (statusEl) statusEl.innerHTML = '<span class="spinner"></span> Searching JSearch (LinkedIn, Indeed)...';
      if (resultsEl) resultsEl.innerHTML = '';
      try {
        const jobs = await searchJSearch(query, getApi('jsearchKey'));
        recordUsage('jsearch');
        if (statusEl) statusEl.textContent = `Found ${jobs.length} jobs from LinkedIn, Indeed, etc.`;
        if (resultsEl) resultsEl.innerHTML = renderResults(jobs);
        bindAddButtons(resultsEl, addJob);
        toast(`JSearch: ${jobs.length} jobs found`, 'success');
      } catch (err) {
        if (statusEl) statusEl.textContent = 'Error: ' + err.message;
        toast('JSearch failed: ' + err.message, 'error');
      }
    };
  }

  if (adzunaBtn) {
    adzunaBtn.onclick = async () => {
      const { allowed: azAllowed } = checkLimit('adzuna');
      if (!azAllowed) { showUpgradeBanner(container, 'adzuna'); return; }
      if (!hasApi('adzunaId') || !hasApi('adzunaKey')) {
        toast('Configure Adzuna API keys in Settings first', 'error');
        return;
      }
      const keyword = (container.querySelector('#searchKeyword')?.value || '').trim() || 'developer';
      const location = (container.querySelector('#searchLocation')?.value || '').trim() || 'us';
      if (statusEl) statusEl.innerHTML = '<span class="spinner"></span> Searching Adzuna...';
      if (resultsEl) resultsEl.innerHTML = '';

      try {
        const jobs = await searchAdzuna(keyword, location, getApi('adzunaId'), getApi('adzunaKey'));
        recordUsage('adzuna');
        const shown = jobs.slice(0, 20);
        if (statusEl) statusEl.textContent = `Found ${jobs[0]?.totalResults || jobs.length} jobs (showing ${shown.length})`;
        if (resultsEl) resultsEl.innerHTML = renderResults(shown, addJob);
        bindAddButtons(resultsEl, addJob);
        toast(`Adzuna: ${jobs[0]?.totalResults || jobs.length} jobs found`, 'success');
      } catch (err) {
        if (statusEl) statusEl.textContent = 'Error: ' + err.message;
        toast('Adzuna search failed: ' + err.message, 'error');
      }
    };
  }
}

function renderResults(jobs) {
  if (!jobs.length) {
    return '<div class="muted" style="padding:20px;text-align:center">No results found</div>';
  }

  return jobs.map((j, i) => {
    const domain = j.domain || (j.company || '').toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
    return `
      <div class="search-result">
        <div class="company-row">
          <img class="company-logo" src="${ENDPOINTS.clearbitLogo}/${domain}" onerror="this.style.display='none'" alt="">
          <span class="muted">${escapeHtml(j.company)}</span>
          ${j.type ? `<span class="chip">${escapeHtml(j.type)}</span>` : ''}
        </div>
        <h4>${escapeHtml(j.title)}</h4>
        <div class="meta">
          <span>${escapeHtml(j.location || 'Remote')}</span>
          <span>${escapeHtml(j.date || '')}</span>
          ${j.category ? `<span>${escapeHtml(j.category)}</span>` : ''}
          ${j.salary ? `<span>${escapeHtml(j.salary)}</span>` : ''}
        </div>
        <div style="margin-top:10px;display:flex;gap:8px">
          <button class="btn small brand search-add-btn"
            data-title="${escapeHtml(j.title)}"
            data-company="${escapeHtml(j.company)}"
            data-url="${escapeHtml(j.url)}"
            data-source="${escapeHtml(j.source)}"
            data-salary="${escapeHtml(j.salary ? j.salary.replace(/[^0-9]/g, '') : '')}">
            + ADD TO TRACKER
          </button>
          ${j.url ? `<a href="${escapeHtml(j.url)}" target="_blank" class="btn small ghost">VIEW</a>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function bindAddButtons(container, addJob) {
  if (!container) return;
  container.querySelectorAll('.search-add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      addJob({
        title: btn.dataset.title || '',
        company: btn.dataset.company || '',
        url: btn.dataset.url || '',
        source: btn.dataset.source || '',
        salary: btn.dataset.salary || '',
        status: 'Saved',
        follow: today(3)
      });
      toast(`Added "${btn.dataset.title}" to tracker`, 'success');
      btn.disabled = true;
      btn.textContent = 'ADDED';
    });
  });
}

export default { renderJobSearch };
