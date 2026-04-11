/* ============================================================
   views/job-search.js — Unified Job Search
   Single "Search All" button, persistent results database,
   rich result cards, filtering and sorting.
   ============================================================ */

import { escapeHtml } from '../utils.js';
import { staggerChildren } from '../ui/animate.js';
import { searchRemotive } from '../services/search-remotive.js';
import { searchAdzuna } from '../services/search-adzuna.js';
import { searchArbeitnow } from '../services/search-arbeitnow.js';
import { searchJSearch } from '../services/search-jsearch.js';
import { getApi, hasApi } from '../services/api-keys.js';
import { toast } from '../components/toast.js';
import { ENDPOINTS } from '../config.js';
import { checkLimit, recordUsage } from '../services/usage-tracker.js';
import { showUpgradeBanner } from '../components/upgrade-banner.js';
import { completeChecklistItem } from '../components/getting-started.js';
import { uid, today } from '../utils.js';
import { buildCareerProfile, evaluateOpportunity } from '../services/career-ops-lite.js';

const SEARCH_DB_KEY = 'jobsynk_search_results';

/**
 * Load persistent search results from localStorage.
 */
function loadSearchDB() {
  try { return JSON.parse(localStorage.getItem(SEARCH_DB_KEY) || '[]'); } catch { return []; }
}

/**
 * Save search results to persistent database.
 */
function saveSearchDB(results) {
  // Cap at 500 results to prevent localStorage overflow
  const capped = results.slice(0, 500);
  localStorage.setItem(SEARCH_DB_KEY, JSON.stringify(capped));
}

function populateSourceOptions(sourceFilter, results) {
  if (!sourceFilter) return;
  const current = sourceFilter.value;
  const sources = [...new Set(results.map(result => result.source).filter(Boolean))].sort();
  sourceFilter.innerHTML = '';
  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = 'All Sources';
  sourceFilter.appendChild(allOption);
  sources.forEach(source => {
    const option = document.createElement('option');
    option.value = source;
    option.textContent = source;
    sourceFilter.appendChild(option);
  });
  if (sources.includes(current)) sourceFilter.value = current;
}

function relevanceScore(job) {
  if (job.fit?.score) return job.fit.score;
  const keyword = String(job._keyword || '').toLowerCase().trim();
  if (!keyword) return 0;
  const haystack = `${job.title || ''} ${job.company || ''} ${job.description || ''}`.toLowerCase();
  return keyword.split(/\s+/).filter(Boolean).reduce((score, term) => (
    haystack.includes(term) ? score + 1 : score
  ), 0);
}

function enrichResults(results, state) {
  const profile = buildCareerProfile({
    resumes: state.get('resumes') || [],
    jobs: state.get('jobs') || [],
    offers: state.get('offers') || [],
    settings: state.get('settings') || {}
  });

  return (results || []).map(result => ({
    ...result,
    fit: evaluateOpportunity(result, profile)
  }));
}

/**
 * Render the unified job search view.
 */
export function renderJobSearch(container, state, addJob) {
  const statusEl = container.querySelector('#searchStatus');
  const resultsEl = container.querySelector('#searchResults');

  // Pre-fill from saved search preferences
  const settings = state.get('settings') || {};
  const keywordInput = container.querySelector('#searchKeyword');
  const locationInput = container.querySelector('#searchLocation');
  if (keywordInput && !keywordInput.value && settings.searchKeywords) keywordInput.value = settings.searchKeywords;
  if (locationInput && !locationInput.value && settings.searchLocation) locationInput.value = settings.searchLocation;
  const filterBar = container.querySelector('#searchFilterBar');
  const sourceFilter = container.querySelector('#searchSourceFilter');
  const sortBy = container.querySelector('#searchSortBy');
  const resultCount = container.querySelector('#searchResultCount');
  const searchAllBtn = container.querySelector('#searchAllBtn');
  const runSearch = () => searchAllBtn?.click();

  ['#searchKeyword', '#searchLocation', '#searchMinSalary'].forEach(selector => {
    container.querySelector(selector)?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        runSearch();
      }
    });
  });

  // Load persisted results on render
  let allResults = loadSearchDB();
  if (allResults.length > 0) {
    populateSourceOptions(sourceFilter, allResults);
    try {
      displayResults(enrichResults(allResults, state), null, null, null, addJob, sourceFilter?.value, sortBy?.value);
    } catch (e) {
      console.error('displayResults init error:', e);
    }
  }

  // Unified Search All button
  if (searchAllBtn) {
    searchAllBtn.onclick = async () => {
      const keyword = (container.querySelector('#searchKeyword')?.value || '').trim();
      const location = (container.querySelector('#searchLocation')?.value || '').trim();
      const minSalary = parseInt(container.querySelector('#searchMinSalary')?.value) || 0;
      const remoteFilter = container.querySelector('#searchRemoteFilter')?.value || '';

      if (!keyword) { toast('Enter keywords to search', 'error'); return; }

      searchAllBtn.disabled = true;
      searchAllBtn.innerHTML = '<span class="spinner"></span> Searching...';
      if (statusEl) statusEl.innerHTML = '<span class="spinner"></span> Searching across all sources...';
      if (resultsEl) resultsEl.innerHTML = '';

      const collected = [];
      const sources = { Remotive: 0, Arbeitnow: 0, Adzuna: 0, JSearch: 0 };
      const errors = [];

      // 1. Remotive (free)
      if (checkLimit('remotive').allowed) {
        try {
          const jobs = await searchRemotive(keyword);
          recordUsage('remotive');
          sources.Remotive = jobs.length;
          collected.push(...jobs);
          updateStatus(statusEl, collected.length, sources);
        } catch (e) { errors.push('Remotive: ' + e.message); }
      }

      // 2. Arbeitnow (free)
      if (checkLimit('arbeitnow').allowed) {
        try {
          const jobs = await searchArbeitnow(keyword);
          recordUsage('arbeitnow');
          sources.Arbeitnow = jobs.length;
          collected.push(...jobs);
          updateStatus(statusEl, collected.length, sources);
        } catch (e) { errors.push('Arbeitnow: ' + e.message); }
      }

      // 3. Adzuna (keyed)
      if (hasApi('adzunaId') && hasApi('adzunaKey') && checkLimit('adzuna').allowed) {
        try {
          const jobs = await searchAdzuna(keyword, location || 'us', getApi('adzunaId'), getApi('adzunaKey'));
          recordUsage('adzuna');
          sources.Adzuna = jobs.length;
          collected.push(...jobs);
          updateStatus(statusEl, collected.length, sources);
        } catch (e) { errors.push('Adzuna: ' + e.message); }
      }

      // 4. JSearch (keyed)
      if (hasApi('jsearchKey') && checkLimit('jsearch').allowed) {
        try {
          const query = location ? `${keyword} in ${location}` : keyword;
          const jobs = await searchJSearch(query, getApi('jsearchKey'));
          recordUsage('jsearch');
          sources.JSearch = jobs.length;
          collected.push(...jobs);
          updateStatus(statusEl, collected.length, sources);
        } catch (e) { errors.push('JSearch: ' + e.message); }
      }

      // Deduplicate
      const seen = new Set();
      const unique = [];
      for (const job of collected) {
        const key = `${(job.title || '').toLowerCase().trim()}|${(job.company || '').toLowerCase().trim()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        // Apply filters
        if (minSalary > 0 && job.salary) {
          const salNum = parseInt((job.salary || '').replace(/[^0-9]/g, ''));
          if (salNum > 0 && salNum < minSalary) continue;
        }
        if (remoteFilter === 'remote' && !job.remote && !(job.location || '').toLowerCase().includes('remote')) continue;
        unique.push({ ...job, _searchedAt: new Date().toISOString(), _keyword: keyword });
      }

      // Merge with existing DB (prepend new, dedup against old)
      const existingDB = loadSearchDB();
      const existingKeys = new Set(existingDB.map(j => `${(j.title||'').toLowerCase()}|${(j.company||'').toLowerCase()}`));
      const newOnly = unique.filter(j => !existingKeys.has(`${(j.title||'').toLowerCase()}|${(j.company||'').toLowerCase()}`));
      allResults = [...newOnly, ...existingDB];
      saveSearchDB(allResults);
      populateSourceOptions(sourceFilter, allResults);

      // Final status
      const sourceStr = Object.entries(sources).filter(([_, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(' · ');
      if (statusEl) {
        statusEl.innerHTML = `<strong>${unique.length} results</strong> from ${sourceStr} · ${collected.length - unique.length} duplicates removed` +
          (newOnly.length < unique.length ? ` · ${unique.length - newOnly.length} already in database` : '') +
          (errors.length > 0 ? `<br><span style="color:var(--color-warning);font-size:12px;">${errors.join(', ')}</span>` : '');
      }

      completeChecklistItem('firstSearch');
      displayResults(enrichResults(allResults, state), null, null, null, addJob, sourceFilter?.value, sortBy?.value);

      searchAllBtn.disabled = false;
      searchAllBtn.innerHTML = 'Search All Sources';
      toast(`Found ${unique.length} jobs across ${Object.values(sources).filter(v => v > 0).length} sources`, 'success');
    };
  }

  // Filter/Sort handlers
  if (sourceFilter) {
    sourceFilter.onchange = () => displayResults(enrichResults(allResults, state), resultsEl, filterBar, resultCount, addJob, sourceFilter.value, sortBy?.value);
  }
  if (sortBy) {
    sortBy.onchange = () => displayResults(enrichResults(allResults, state), resultsEl, filterBar, resultCount, addJob, sourceFilter?.value, sortBy.value);
  }
}

function updateStatus(el, count, sources) {
  if (!el) return;
  const active = Object.entries(sources).filter(([_, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(' · ');
  el.innerHTML = `<span class="spinner" style="margin-right:6px;"></span> ${count} results so far... ${active}`;
}

function displayResults(allResults, resultsEl, filterBar, resultCount, addJob, sourceFilterVal, sortVal) {
  // Re-query in case references are stale
  if (!resultsEl) resultsEl = document.getElementById('searchResults');
  if (!filterBar) filterBar = document.getElementById('searchFilterBar');
  if (!resultCount) resultCount = document.getElementById('searchResultCount');
  if (!resultsEl) return;

  let filtered = [...allResults];

  // Apply source filter
  if (sourceFilterVal) {
    filtered = filtered.filter(j => j.source === sourceFilterVal);
  }

  // Apply sort
  if (sortVal === 'salary') {
    filtered.sort((a, b) => {
      const sa = parseInt((a.salary || '').replace(/[^0-9]/g, '')) || 0;
      const sb = parseInt((b.salary || '').replace(/[^0-9]/g, '')) || 0;
      return sb - sa;
    });
  } else if (sortVal === 'relevance') {
    filtered.sort((a, b) => relevanceScore(b) - relevanceScore(a));
  } else {
    filtered.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }

  // Show filter bar
  if (filterBar) filterBar.style.display = allResults.length > 0 ? 'flex' : 'none';
  if (resultCount) resultCount.textContent = `${filtered.length} of ${allResults.length} results`;

  if (filtered.length === 0) {
    resultsEl.innerHTML = allResults.length === 0
      ? '<div class="empty-inline">Enter keywords and run a search to start building your opportunities list.</div>'
      : '<div class="empty-inline">No results match this filter. Try another source, salary range, or remote setting.</div>';
    return;
  }

  // Render rich result cards (max 50 visible)
  resultsEl.innerHTML = filtered.slice(0, 50).map((j, i) => {
    const domain = (j.company || '').toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
    const salaryDisplay = j.salary ? formatSalary(j.salary) : '';

    return `
      <div class="search-result-card card-enter" data-idx="${i}">
        <div class="src-card-header">
          <img class="src-card-logo" src="${ENDPOINTS.clearbitLogo}/${domain}" onerror="this.style.display='none'" alt="">
          <div class="src-card-info">
            <div class="src-card-company">${escapeHtml(j.company || 'Unknown Company')}</div>
            <h3 class="src-card-title">${escapeHtml(j.title || 'Untitled Position')}</h3>
            ${j.fit ? `
              <div class="fit-summary-row">
                <span class="fit-grade fit-grade-${(j.fit.grade || 'c').toLowerCase()}">${escapeHtml(j.fit.grade)} · ${j.fit.score}%</span>
                <span class="muted">${escapeHtml(j.fit.summary)}</span>
              </div>
            ` : ''}
          </div>
          <span class="src-card-source">${escapeHtml(j.source || '')}</span>
        </div>
        <div class="src-card-details">
          ${j.location ? `<span class="src-card-detail">📍 ${escapeHtml(String(j.location))}</span>` : ''}
          ${j.date ? `<span class="src-card-detail">📅 ${escapeHtml(String(j.date).slice(0, 10))}</span>` : ''}
          ${salaryDisplay ? `<span class="src-card-detail src-card-salary">💰 ${salaryDisplay}</span>` : ''}
          ${j.remote ? `<span class="src-card-detail" style="color:var(--color-accent)">🏠 Remote</span>` : ''}
        </div>
        ${j.fit ? `
          <div class="fit-chip-row">
            ${j.fit.strengths.slice(0, 3).map(item => `<span class="chip chip-strong">${escapeHtml(item)}</span>`).join('')}
            ${j.fit.risks.slice(0, 2).map(item => `<span class="chip chip-risk">${escapeHtml(item)}</span>`).join('')}
          </div>
        ` : ''}
        ${j.description ? `<p class="src-card-desc">${escapeHtml(String(j.description))}</p>` : ''}
        <div class="src-card-actions">
          <button class="btn brand small search-add-btn"
            data-title="${escapeHtml(String(j.title || ''))}"
            data-company="${escapeHtml(String(j.company || ''))}"
            data-url="${escapeHtml(String(j.url || ''))}"
            data-source="${escapeHtml(String(j.source || ''))}"
            data-salary="${escapeHtml(String(j.salary || '').toString().replace(/[^0-9]/g, ''))}"
            data-description="${escapeHtml(String(j.description || ''))}"
            data-location="${escapeHtml(String(j.location || ''))}"
            data-remote="${escapeHtml(String(j.remote || ''))}"
            data-date="${escapeHtml(String(j.date || ''))}"
            data-fit-score="${escapeHtml(String(j.fit?.score || ''))}"
            data-fit-grade="${escapeHtml(String(j.fit?.grade || ''))}">
            + Add to Tracker
          </button>
          ${j.url ? `<a href="${escapeHtml(j.url)}" target="_blank" rel="noopener" class="btn small ghost">View Posting</a>` : ''}
        </div>
      </div>
    `;
  }).join('');

  staggerChildren(resultsEl, '.search-result-card');

  // Bind add buttons — fade out card after adding
  resultsEl.querySelectorAll('.search-add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      addJob({
        title: btn.dataset.title || '',
        company: btn.dataset.company || '',
        url: btn.dataset.url || '',
        source: btn.dataset.source || '',
        salary: btn.dataset.salary || '',
        description: btn.dataset.description || '',
        location: btn.dataset.location || '',
        remote: btn.dataset.remote || '',
        date: btn.dataset.date || '',
        fitScore: btn.dataset.fitScore ? Number(btn.dataset.fitScore) : 0,
        fitGrade: btn.dataset.fitGrade || '',
        status: 'Saved',
        follow: today(3)
      });
      toast(`Added "${btn.dataset.title}" to tracker`, 'success');
      btn.disabled = true;
      btn.textContent = 'Added';
      btn.style.background = 'var(--color-success)';
      btn.style.borderColor = 'var(--color-success)';
      btn.style.color = '#1a1a1e';
      // Fade out the card
      const card = btn.closest('.search-result-card');
      if (card) {
        card.style.transition = 'opacity 0.4s, transform 0.4s, max-height 0.4s, margin 0.4s, padding 0.4s';
        card.style.opacity = '0.4';
        card.style.transform = 'scale(0.98)';
        setTimeout(() => {
          card.style.maxHeight = '0';
          card.style.margin = '0';
          card.style.padding = '0';
          card.style.overflow = 'hidden';
          card.style.borderWidth = '0';
        }, 500);
      }
    });
  });
}

function formatSalary(sal) {
  const s = (sal || '').toString();
  const num = parseInt(s.replace(/[^0-9]/g, ''));
  if (!num || num < 100) return s;
  if (num > 1000000) return '$' + Math.round(num / 1000).toLocaleString(); // Fix Adzuna inflated salaries
  return '$' + num.toLocaleString();
}

export default { renderJobSearch };
