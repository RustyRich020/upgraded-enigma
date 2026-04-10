/* ============================================================
   components/upgrade-banner.js — Inline usage banner + upgrade CTA
   Shows usage meters and upgrade prompt when limits are hit.
   ============================================================ */

import { checkLimit, getUsageSummary, getUserTier, TIERS } from '../services/usage-tracker.js';

/**
 * Show an inline upgrade banner at the top of a view container.
 * @param {HTMLElement} container — the view section element
 * @param {string} apiName — the API that was just rate-limited
 */
export function showUpgradeBanner(container, apiName) {
  // Remove any existing banner in this container
  const existing = container.querySelector('.upgrade-banner');
  if (existing) existing.remove();

  const { used, limit } = checkLimit(apiName);
  const tier = getUserTier();
  const tierInfo = TIERS[tier] || TIERS.free;
  const nextTier = TIERS.pro;

  const banner = document.createElement('div');
  banner.className = 'upgrade-banner';
  banner.innerHTML = `
    <div class="upgrade-banner-content">
      <div class="upgrade-banner-left">
        <strong>Daily limit reached</strong>
        <span class="upgrade-banner-detail">${formatApiName(apiName)}: ${used}/${limit} uses today (${tierInfo.name} tier)</span>
      </div>
      <div class="upgrade-banner-right">
        <button class="btn brand small upgrade-cta">UPGRADE TO PRO — ${nextTier.price}</button>
        <button class="btn ghost small upgrade-dismiss">✕</button>
      </div>
    </div>
    <div class="upgrade-banner-meter">
      <div class="upgrade-banner-fill" style="width:100%"></div>
    </div>
  `;

  // Insert at top of container
  container.prepend(banner);

  // Dismiss handler
  banner.querySelector('.upgrade-dismiss')?.addEventListener('click', () => banner.remove());

  // CTA handler — navigate to settings/pricing
  banner.querySelector('.upgrade-cta')?.addEventListener('click', () => {
    window.location.hash = '#settings';
    banner.remove();
  });
}

/**
 * Show a usage meter widget (non-blocking).
 * @param {HTMLElement} container — element to append the meter into
 * @param {string} apiName — the API to show usage for
 */
export function showUsageMeter(container, apiName) {
  const { used, limit, remaining, allowed } = checkLimit(apiName);
  if (limit === '∞') return; // Don't show for unlimited

  const pct = Math.min(100, Math.round((used / limit) * 100));
  const color = pct >= 100 ? 'var(--color-danger)' : pct >= 80 ? 'var(--color-warning)' : 'var(--color-success)';

  const meter = document.createElement('div');
  meter.className = 'usage-meter';
  meter.innerHTML = `
    <span class="usage-meter-label">${remaining} of ${limit} remaining today</span>
    <div class="usage-meter-bar">
      <div class="usage-meter-fill" style="width:${pct}%;background:${color}"></div>
    </div>
  `;
  container.appendChild(meter);
}

/**
 * Render a full pricing table (for Settings page).
 * @returns {string} HTML string
 */
export function renderPricingTable() {
  const currentTier = getUserTier();

  return `
    <div class="pricing-grid">
      ${Object.entries(TIERS).map(([key, tier]) => `
        <div class="pricing-card ${key === currentTier ? 'current' : ''} ${key === 'pro' ? 'recommended' : ''}">
          ${key === 'pro' ? '<div class="pricing-badge">RECOMMENDED</div>' : ''}
          ${key === currentTier ? '<div class="pricing-badge current-badge">CURRENT PLAN</div>' : ''}
          <h3 class="pricing-tier-name">${tier.name}</h3>
          <div class="pricing-price">${tier.price}</div>
          <ul class="pricing-features">
            ${tier.features.map(f => `<li>✓ ${f}</li>`).join('')}
          </ul>
          ${key !== currentTier ? `
            <button class="btn ${key === 'pro' ? 'brand' : 'ghost'} pricing-select" data-tier="${key}" style="width:100%;margin-top:12px">
              ${key === 'free' ? 'DOWNGRADE' : 'UPGRADE'}
            </button>
          ` : '<div class="muted" style="text-align:center;margin-top:12px;font-size:11px">Active</div>'}
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Render a usage dashboard showing all API meters.
 * @returns {string} HTML string
 */
export function renderUsageDashboard() {
  const summary = getUsageSummary();
  const tier = getUserTier();

  if (tier !== 'free') {
    return `<div class="muted" style="text-align:center;padding:16px;">Unlimited usage on ${TIERS[tier]?.name || tier} tier</div>`;
  }

  return `
    <div class="usage-dashboard">
      ${summary.map(api => `
        <div class="usage-row">
          <span class="usage-api-name">${formatApiName(api.name)}</span>
          <span class="usage-count">${api.used}/${api.limit}</span>
          <div class="usage-bar">
            <div class="usage-bar-fill" style="width:${api.percentage}%;background:${
              api.percentage >= 100 ? 'var(--color-danger)' : api.percentage >= 80 ? 'var(--color-warning)' : 'var(--color-primary)'
            }"></div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function formatApiName(name) {
  const names = {
    remotive: 'Remotive', arbeitnow: 'Arbeitnow', adzuna: 'Adzuna',
    jsearch: 'JSearch', gemini: 'Gemini AI', groq: 'Groq AI',
    hunter: 'Hunter.io', emailjs: 'EmailJS', bls: 'BLS Salary',
    abstractCompany: 'Company Data', careerOneStop: 'CareerOneStop',
    ntfy: 'Ntfy.sh', clearbit: 'Clearbit',
  };
  return names[name] || name;
}

export default { showUpgradeBanner, showUsageMeter, renderPricingTable, renderUsageDashboard };
