/* ============================================================
   services/usage-tracker.js — API usage tracking + rate limiting
   Tracks per-API daily usage in localStorage.
   Free tier: 5 uses per API per day.
   ============================================================ */

const STORAGE_KEY = 'jobsink_api_usage';
const DAILY_LIMIT = 5;

// Per-API limits (override defaults for specific APIs)
const LIMITS = {
  remotive: 20,        // Free, no key — generous limit
  arbeitnow: 20,       // Free, no key — generous limit
  adzuna: 5,
  jsearch: 5,
  gemini: 5,
  groq: 5,
  hunter: 3,           // Only 25/month free — tighter
  emailjs: 3,          // Only 200/month free — tighter
  bls: 10,             // Free gov API — generous
  abstractCompany: 3,  // Only 100/month free — tighter
  careerOneStop: 5,
  ntfy: 20,            // Free, unlimited — generous
  clearbit: 20,        // Free logos — generous
};

// Tier definitions
export const TIERS = {
  free: {
    name: 'Free',
    price: '$0',
    limits: LIMITS,
    features: [
      '5 API calls per service/day',
      'Local keyword matching',
      'CSV import/export',
      'Kanban board',
      'Browser notifications',
    ]
  },
  pro: {
    name: 'Pro',
    price: '$9/mo',
    limits: null, // unlimited
    features: [
      'Unlimited API calls',
      'AI resume matching (Gemini + Groq)',
      'Priority job search (4 sources)',
      'Email automation (EmailJS)',
      'Company enrichment',
      'Push notifications (ntfy.sh)',
      'Cloud sync (Firebase)',
    ]
  },
  enterprise: {
    name: 'Enterprise',
    price: '$29/mo',
    limits: null,
    features: [
      'Everything in Pro',
      'Team dashboards',
      'Custom API integrations',
      'Priority support',
      'SSO authentication',
      'Advanced analytics',
    ]
  }
};

/**
 * Get today's date key for tracking.
 */
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Load usage data from localStorage.
 */
function loadUsage() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    // Reset if it's a new day
    if (data._date !== todayKey()) {
      return { _date: todayKey() };
    }
    return data;
  } catch {
    return { _date: todayKey() };
  }
}

/**
 * Save usage data to localStorage.
 */
function saveUsage(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Get the current user's tier.
 */
export function getUserTier() {
  return localStorage.getItem('jobsink_user_tier') || 'free';
}

/**
 * Set the user's tier (for testing/upgrade).
 */
export function setUserTier(tier) {
  localStorage.setItem('jobsink_user_tier', tier);
}

/**
 * Get the daily limit for a specific API.
 */
export function getLimit(apiName) {
  const tier = getUserTier();
  if (tier !== 'free') return Infinity;
  return LIMITS[apiName] || DAILY_LIMIT;
}

/**
 * Get current usage count for an API today.
 */
export function getUsage(apiName) {
  const data = loadUsage();
  return data[apiName] || 0;
}

/**
 * Get remaining uses for an API today.
 */
export function getRemaining(apiName) {
  const limit = getLimit(apiName);
  if (limit === Infinity) return Infinity;
  return Math.max(0, limit - getUsage(apiName));
}

/**
 * Check if an API call is allowed (under the daily limit).
 * @param {string} apiName — the API identifier
 * @returns {{ allowed: boolean, used: number, limit: number, remaining: number }}
 */
export function checkLimit(apiName) {
  const limit = getLimit(apiName);
  const used = getUsage(apiName);
  const remaining = Math.max(0, limit - used);
  return {
    allowed: limit === Infinity || used < limit,
    used,
    limit: limit === Infinity ? '∞' : limit,
    remaining: limit === Infinity ? '∞' : remaining,
  };
}

/**
 * Record an API usage. Call this AFTER a successful API call.
 * @param {string} apiName — the API identifier
 */
export function recordUsage(apiName) {
  const tier = getUserTier();
  if (tier !== 'free') return; // Don't track for paid users

  const data = loadUsage();
  data[apiName] = (data[apiName] || 0) + 1;
  saveUsage(data);
}

/**
 * Get usage summary for all APIs.
 * @returns {Array<{ name: string, used: number, limit: number, remaining: number, percentage: number }>}
 */
export function getUsageSummary() {
  const summary = [];
  for (const [name, limit] of Object.entries(LIMITS)) {
    const used = getUsage(name);
    const effectiveLimit = getLimit(name);
    summary.push({
      name,
      used,
      limit: effectiveLimit === Infinity ? '∞' : effectiveLimit,
      remaining: effectiveLimit === Infinity ? '∞' : Math.max(0, effectiveLimit - used),
      percentage: effectiveLimit === Infinity ? 0 : Math.min(100, Math.round((used / effectiveLimit) * 100)),
    });
  }
  return summary;
}

/**
 * Reset all usage counters (for testing).
 */
export function resetUsage() {
  saveUsage({ _date: todayKey() });
}

export default {
  checkLimit, recordUsage, getUsage, getRemaining, getLimit,
  getUserTier, setUserTier, getUsageSummary, resetUsage, TIERS
};
