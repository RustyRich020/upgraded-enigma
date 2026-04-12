/* ============================================================
   components/upgrade-banner.js — Inline usage banner + upgrade CTA
   Shows usage meters and upgrade prompt when limits are hit.
   ============================================================ */

import { checkLimit, getUsageSummary, getUserTier, TIERS, STRIPE } from '../services/usage-tracker.js';

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
        <a href="${STRIPE['3mo'].link}" target="_blank" rel="noopener" class="btn brand small upgrade-cta" style="text-decoration:none">Upgrade — $69/3mo</a>
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
 * Mirrors JobLand-style pricing with Stripe payment links.
 * @returns {string} HTML string
 */
export function renderPricingTable() {
  const currentTier = getUserTier();
  const paidTiers = ['1mo', '3mo', '6mo'];
  const isPaid = paidTiers.includes(currentTier);

  return `
    <div class="pricing-header" style="text-align:center;margin-bottom:24px">
      <p class="eyebrow">Plans & Pricing</p>
      <h3 style="font-size:20px;font-weight:700;color:var(--color-text-heading);margin-bottom:6px">Unlock your full career potential</h3>
      <p class="muted" style="font-size:14px">All plans include unlimited API calls, AI features, and cloud sync</p>
    </div>
    <div class="pricing-grid">
      ${paidTiers.map(key => {
        const tier = TIERS[key];
        const stripe = STRIPE[key];
        const isCurrent = key === currentTier;
        const isPopular = tier.badge === 'Most Popular';
        const isBest = tier.badge === 'Best Value';
        return `
          <div class="pricing-card ${isCurrent ? 'current' : ''} ${isPopular ? 'recommended' : ''}">
            ${tier.badge ? `<div class="pricing-badge ${isBest ? 'best-badge' : ''}">${tier.badge}</div>` : ''}
            ${isCurrent ? '<div class="pricing-badge current-badge">Current Plan</div>' : ''}
            <h3 class="pricing-tier-name">${tier.name}</h3>
            <div class="pricing-price">
              <span class="pricing-original">${tier.originalPrice}</span>
              ${tier.price}
            </div>
            <div class="pricing-daily">${tier.priceDetail}</div>
            <ul class="pricing-features">
              ${tier.features.map(f => `<li>✓ ${f}</li>`).join('')}
            </ul>
            ${isCurrent
              ? '<div class="muted" style="text-align:center;margin-top:12px;font-size:12px">Active</div>'
              : `<a href="${stripe.link}" target="_blank" rel="noopener" class="btn ${isPopular ? 'brand' : 'ghost'} pricing-select" style="width:100%;margin-top:12px;text-align:center;display:block;text-decoration:none">
                  Get my plan
                </a>`
            }
          </div>`;
      }).join('')}
    </div>
    ${isPaid ? '' : `
      <div style="text-align:center;margin-top:16px">
        <p class="muted" style="font-size:12px">30-day money-back guarantee · Cancel anytime · Secure checkout via Stripe</p>
      </div>
    `}
    <style>
      .pricing-original {
        text-decoration: line-through;
        color: var(--color-muted);
        font-size: 14px;
        font-weight: 400;
        margin-right: 6px;
      }
      .pricing-daily {
        font-size: 13px;
        color: var(--color-accent);
        font-weight: 600;
        margin-top: 2px;
        margin-bottom: 12px;
      }
      .pricing-badge.best-badge {
        background: var(--color-accent);
        color: #fff;
      }
    </style>
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

/**
 * Render a compact free-tier usage summary widget.
 * Shows the top 4 most-used APIs with meter bars.
 * @returns {string} HTML string (empty if not on free tier)
 */
export function renderFreeTierSummary() {
  const tier = getUserTier();
  if (tier !== 'free') return '';

  // Get top 4 most-used APIs
  const summary = getUsageSummary()
    .filter(api => api.limit !== '∞')
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 4);

  if (summary.length === 0) return '';

  return `
    <div class="free-tier-widget">
      <div class="free-tier-header">
        <span class="free-tier-label">Free Tier</span>
        <a href="#settings" class="free-tier-link">View all limits</a>
      </div>
      <div class="free-tier-meters">
        ${summary.map(api => `
          <div class="free-tier-meter">
            <div class="free-tier-meter-label">${formatApiName(api.name)}</div>
            <div class="free-tier-meter-bar">
              <div class="free-tier-meter-fill" style="width:${api.percentage}%;background:${
                api.percentage >= 100 ? 'var(--color-danger)' : api.percentage >= 80 ? 'var(--color-warning)' : 'var(--color-accent)'
              }"></div>
            </div>
            <div class="free-tier-meter-count">${api.remaining}/${api.limit}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

export default { showUpgradeBanner, showUsageMeter, renderPricingTable, renderUsageDashboard, renderFreeTierSummary };
