/* ============================================================
   services/keyword-bank.js — Persistent Keyword Intelligence Engine

   Accumulates keywords across every ATS analysis, tracks frequency,
   categorizes by type, and provides market intelligence insights.
   No other ATS tool on the market does cross-JD keyword banking.
   ============================================================ */

const BANK_KEY = 'jobsynk_keyword_bank';
const ANALYSIS_LOG_KEY = 'jobsynk_analysis_log';

/**
 * Load the keyword bank from localStorage.
 * Structure: { [keyword]: { count, category, sources[], firstSeen, lastSeen, inResume } }
 */
export function loadBank() {
  try {
    return JSON.parse(localStorage.getItem(BANK_KEY) || '{}');
  } catch { return {}; }
}

/**
 * Save the keyword bank to localStorage.
 */
function saveBank(bank) {
  localStorage.setItem(BANK_KEY, JSON.stringify(bank));
}

/**
 * Load analysis history log.
 * Structure: [{ id, title, company, source, date, score, keywordCount, topMissing[] }]
 */
export function loadAnalysisLog() {
  try {
    return JSON.parse(localStorage.getItem(ANALYSIS_LOG_KEY) || '[]');
  } catch { return []; }
}

function saveAnalysisLog(log) {
  localStorage.setItem(ANALYSIS_LOG_KEY, JSON.stringify(log));
}

/**
 * Record an ATS analysis into the keyword bank.
 * Called after every scoreATSAlignment or deepATSAnalysis.
 *
 * @param {object} result — { score, matched[], missing[], breakdown }
 * @param {object} meta — { title, company, source, jobText }
 * @param {string[]} resumeSkills — current resume skills array
 */
export function recordAnalysis(result, meta, resumeSkills = []) {
  const bank = loadBank();
  const now = new Date().toISOString();
  const sourceLabel = meta.title
    ? `${meta.title}${meta.company ? ' @ ' + meta.company : ''}`
    : 'Manual paste';

  // Process matched keywords
  for (const item of (result.matched || [])) {
    const kw = item.keyword.toLowerCase().trim();
    if (!kw) continue;
    if (!bank[kw]) {
      bank[kw] = { count: 0, category: item.category || 'general', sources: [], firstSeen: now, lastSeen: now, inResume: false, matched: 0, missed: 0 };
    }
    bank[kw].count++;
    bank[kw].matched++;
    bank[kw].lastSeen = now;
    bank[kw].inResume = resumeSkills.some(s => s.toLowerCase() === kw);
    if (!bank[kw].sources.includes(sourceLabel)) {
      bank[kw].sources.push(sourceLabel);
      if (bank[kw].sources.length > 20) bank[kw].sources = bank[kw].sources.slice(-20);
    }
  }

  // Process missing keywords
  for (const item of (result.missing || [])) {
    const kw = item.keyword.toLowerCase().trim();
    if (!kw) continue;
    if (!bank[kw]) {
      bank[kw] = { count: 0, category: item.category || 'general', sources: [], firstSeen: now, lastSeen: now, inResume: false, matched: 0, missed: 0 };
    }
    bank[kw].count++;
    bank[kw].missed++;
    bank[kw].lastSeen = now;
    bank[kw].inResume = resumeSkills.some(s => s.toLowerCase() === kw);
    if (!bank[kw].sources.includes(sourceLabel)) {
      bank[kw].sources.push(sourceLabel);
      if (bank[kw].sources.length > 20) bank[kw].sources = bank[kw].sources.slice(-20);
    }
  }

  saveBank(bank);

  // Log the analysis
  const log = loadAnalysisLog();
  log.push({
    id: Date.now().toString(36),
    title: meta.title || 'Unknown',
    company: meta.company || '',
    source: meta.source || 'paste',
    date: now,
    score: result.score,
    keywordCount: (result.matched?.length || 0) + (result.missing?.length || 0),
    topMissing: (result.missing || []).slice(0, 5).map(m => m.keyword),
  });
  // Keep last 100 analyses
  if (log.length > 100) log.splice(0, log.length - 100);
  saveAnalysisLog(log);
}

/**
 * Refresh inResume flags against current resume skills.
 */
export function syncResumeSkills(resumeSkills = []) {
  const bank = loadBank();
  const lower = resumeSkills.map(s => s.toLowerCase());
  for (const kw of Object.keys(bank)) {
    bank[kw].inResume = lower.includes(kw);
  }
  saveBank(bank);
}

/**
 * Get the top N most-demanded keywords (by frequency across postings).
 * @param {number} n
 * @returns {Array<{keyword, count, category, inResume, sources, missRate}>}
 */
export function getTopKeywords(n = 30) {
  const bank = loadBank();
  return Object.entries(bank)
    .map(([keyword, data]) => ({
      keyword,
      count: data.count,
      category: data.category,
      inResume: data.inResume,
      sources: data.sources.length,
      missRate: data.count > 0 ? Math.round((data.missed / data.count) * 100) : 0,
      matched: data.matched,
      missed: data.missed,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

/**
 * Get keywords you're missing most often — the biggest gaps.
 * Sorted by miss count descending, filtered to only keywords NOT in resume.
 */
export function getTopGaps(n = 20) {
  const bank = loadBank();
  return Object.entries(bank)
    .filter(([_, data]) => !data.inResume && data.missed > 0)
    .map(([keyword, data]) => ({
      keyword,
      missed: data.missed,
      count: data.count,
      category: data.category,
      sources: data.sources.length,
      missRate: Math.round((data.missed / data.count) * 100),
    }))
    .sort((a, b) => b.missed - a.missed)
    .slice(0, n);
}

/**
 * Get market intelligence summary.
 */
export function getMarketIntelligence() {
  const bank = loadBank();
  const log = loadAnalysisLog();
  const keywords = Object.entries(bank);

  if (keywords.length === 0) {
    return { totalKeywords: 0, totalAnalyses: 0, avgScore: 0, coverageRate: 0, topCategories: [], trendingUp: [], criticalGaps: [] };
  }

  const totalKeywords = keywords.length;
  const inResume = keywords.filter(([_, d]) => d.inResume).length;
  const coverageRate = Math.round((inResume / totalKeywords) * 100);

  // Average ATS score across analyses
  const scores = log.map(l => l.score).filter(s => typeof s === 'number');
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  // Top categories by keyword count
  const catCounts = {};
  for (const [_, data] of keywords) {
    catCounts[data.category] = (catCounts[data.category] || 0) + data.count;
  }
  const topCategories = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat, count]) => ({ category: cat, count }));

  // Keywords appearing in most recent analyses but not in resume (trending gaps)
  const recentLog = log.slice(-10);
  const recentMissing = {};
  for (const entry of recentLog) {
    for (const kw of (entry.topMissing || [])) {
      recentMissing[kw] = (recentMissing[kw] || 0) + 1;
    }
  }
  const criticalGaps = Object.entries(recentMissing)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword, freq]) => ({ keyword, frequency: freq }));

  return {
    totalKeywords,
    totalAnalyses: log.length,
    avgScore,
    coverageRate,
    topCategories,
    criticalGaps,
  };
}

/**
 * Clear the keyword bank (for testing/reset).
 */
export function clearBank() {
  localStorage.removeItem(BANK_KEY);
  localStorage.removeItem(ANALYSIS_LOG_KEY);
}

/**
 * Get bank stats for display.
 */
export function getBankStats() {
  const bank = loadBank();
  const log = loadAnalysisLog();
  const entries = Object.entries(bank);
  return {
    totalKeywords: entries.length,
    inResume: entries.filter(([_, d]) => d.inResume).length,
    totalAnalyses: log.length,
    lastAnalysis: log.length > 0 ? log[log.length - 1].date : null,
  };
}

export default {
  loadBank, recordAnalysis, syncResumeSkills,
  getTopKeywords, getTopGaps, getMarketIntelligence,
  loadAnalysisLog, clearBank, getBankStats,
};
