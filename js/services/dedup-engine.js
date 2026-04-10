/* ============================================================
   services/dedup-engine.js — Job deduplication engine
   Detects duplicate job listings across multiple sources using
   URL matching, exact title+company matching, and fuzzy Jaccard
   similarity on tokenized titles.
   ============================================================ */

import { tokenize } from '../utils.js';

/**
 * Normalize a company name for comparison.
 * Lowercases, trims, strips common suffixes, collapses whitespace.
 * @param {string} name — raw company name
 * @returns {string} normalized company name
 */
export function normalizeCompany(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/\b(inc\.?|llc\.?|corp\.?|ltd\.?|gmbh|company|co\.?|group)\b/gi, '')
    .replace(/[.,]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize a job title for comparison.
 * Lowercases, trims, collapses whitespace.
 * @param {string} title — raw job title
 * @returns {string} normalized title
 */
export function normalizeTitle(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Normalize a URL for comparison.
 * Strips protocol, www., trailing slash, and query params.
 * @param {string} url — raw URL
 * @returns {string} normalized URL
 */
export function normalizeUrl(url) {
  if (!url) return '';
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\?.*$/, '')
    .replace(/\/$/, '');
}

/**
 * Compute Jaccard similarity between two Sets of strings.
 * Returns |intersection| / |union|, a value between 0 and 1.
 * @param {Set<string>} setA
 * @param {Set<string>} setB
 * @returns {number} similarity score 0–1
 */
export function jaccardSimilarity(setA, setB) {
  if (!setA || !setB || setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  if (union === 0) return 0;

  return intersection / union;
}

/**
 * Check if two jobs are duplicates using a tiered approach.
 * 1. URL match (after normalization)
 * 2. Exact normalized title + company match
 * 3. Fuzzy Jaccard similarity on tokenized titles
 *
 * @param {object} jobA — first job object
 * @param {object} jobB — second job object
 * @param {number} threshold — Jaccard threshold for fuzzy match (default 0.75)
 * @returns {{ duplicate: boolean, method: 'url'|'exact'|'fuzzy'|null, score: number }}
 */
export function isDuplicate(jobA, jobB, threshold = 0.75) {
  // 1. URL match
  const urlA = normalizeUrl(jobA.url);
  const urlB = normalizeUrl(jobB.url);
  if (urlA && urlB && urlA === urlB) {
    return { duplicate: true, method: 'url', score: 1.0 };
  }

  // 2. Exact normalized title + company match
  const titleA = normalizeTitle(jobA.title);
  const titleB = normalizeTitle(jobB.title);
  const compA = normalizeCompany(jobA.company);
  const compB = normalizeCompany(jobB.company);

  if (titleA && titleB && compA && compB && titleA === titleB && compA === compB) {
    return { duplicate: true, method: 'exact', score: 1.0 };
  }

  // 3. Fuzzy Jaccard similarity on tokenized titles (only if same company)
  if (compA && compB && compA === compB) {
    const tokensA = new Set(tokenize(jobA.title));
    const tokensB = new Set(tokenize(jobB.title));
    const score = jaccardSimilarity(tokensA, tokensB);

    if (score >= threshold) {
      return { duplicate: true, method: 'fuzzy', score };
    }

    return { duplicate: false, method: null, score };
  }

  return { duplicate: false, method: null, score: 0 };
}

/**
 * Deduplicate a list of new jobs against existing jobs.
 * Also deduplicates within the new jobs themselves.
 *
 * @param {Array} newJobs — newly fetched job listings
 * @param {Array} existingJobs — jobs already in the tracker
 * @param {number} threshold — Jaccard threshold (default 0.75)
 * @returns {{ unique: Array, duplicates: Array<{job: object, duplicateOf: object, method: string, score: number}> }}
 */
export function deduplicateResults(newJobs, existingJobs, threshold = 0.75) {
  const unique = [];
  const duplicates = [];

  // Pool = existing jobs + already-accepted new jobs
  const pool = [...(existingJobs || [])];

  for (const job of newJobs) {
    let found = false;

    for (const existing of pool) {
      const result = isDuplicate(job, existing, threshold);
      if (result.duplicate) {
        duplicates.push({
          job,
          duplicateOf: existing,
          method: result.method,
          score: result.score
        });
        found = true;
        break;
      }
    }

    if (!found) {
      unique.push(job);
      pool.push(job); // Add to pool so subsequent new jobs check against it
    }
  }

  return { unique, duplicates };
}

export default {
  normalizeCompany,
  normalizeTitle,
  normalizeUrl,
  jaccardSimilarity,
  isDuplicate,
  deduplicateResults
};
