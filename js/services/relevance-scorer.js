/* ============================================================
   services/relevance-scorer.js — Job relevance scoring engine
   Scores jobs against a user's resume profile using skill
   matching, title keyword overlap, and date freshness.
   ============================================================ */

import { SKILL_PATTERNS } from '../config.js';
import { tokenize } from '../utils.js';

/** Stop words to filter out of resume name keywords */
const TITLE_STOP_WORDS = new Set([
  'v1', 'v2', 'v3', 'v4', 'v5', 'focus', 'general', 'resume',
  'cv', 'cover', 'letter', 'draft', 'final', 'updated', 'new',
  'old', 'copy', 'pdf', 'docx', 'doc', 'the', 'and', 'for',
  'with', 'my', 'a', 'an', 'to', 'in', 'of', 'on', 'is'
]);

/**
 * Extract a unified profile from an array of resume objects.
 * Merges skills arrays and runs SKILL_PATTERNS regex on resume text
 * to catch skills not explicitly listed.
 *
 * @param {Array<{skills: string[], text: string, name: string}>} resumes
 * @returns {{ skills: string[], titleKeywords: string[] }}
 */
export function extractResumeProfile(resumes) {
  const skillSet = new Set();
  const titleKeywordSet = new Set();

  if (!resumes || !Array.isArray(resumes)) {
    return { skills: [], titleKeywords: [] };
  }

  for (const resume of resumes) {
    if (!resume || resume._meta) continue;

    // Collect explicitly listed skills
    if (Array.isArray(resume.skills)) {
      for (const skill of resume.skills) {
        if (skill && typeof skill === 'string') {
          skillSet.add(skill.toLowerCase().trim());
        }
      }
    }

    // Run SKILL_PATTERNS regex on resume text to find additional skills
    if (resume.text && typeof resume.text === 'string') {
      const regex = new RegExp(SKILL_PATTERNS.source, SKILL_PATTERNS.flags);
      let match;
      while ((match = regex.exec(resume.text)) !== null) {
        skillSet.add(match[1].toLowerCase().trim());
      }
    }

    // Extract keywords from resume names
    if (resume.name && typeof resume.name === 'string') {
      const words = resume.name
        .replace(/\.[^.]+$/, '') // strip file extension
        .split(/[\s\-_]+/)
        .map(w => w.toLowerCase())
        .filter(w => w.length > 2 && !TITLE_STOP_WORDS.has(w));

      for (const word of words) {
        titleKeywordSet.add(word);
      }
    }
  }

  return {
    skills: Array.from(skillSet),
    titleKeywords: Array.from(titleKeywordSet)
  };
}

/**
 * Score a single job against a resume profile.
 *
 * Scoring breakdown (0–100):
 *   - Skills match: up to 60 points (proportional to matched/total)
 *   - Title keyword match: up to 30 points (proportional overlap)
 *   - Freshness: up to 10 points (7 days = 10, 14 days = 5, older = 0)
 *
 * @param {object} job — normalized job object
 * @param {{ skills: string[], titleKeywords: string[] }} profile
 * @returns {{ score: number, matchedSkills: string[], titleMatch: boolean }}
 */
export function scoreJob(job, profile) {
  if (!job || !profile) {
    return { score: 0, matchedSkills: [], titleMatch: false };
  }

  const jobText = (
    (job.title || '') + ' ' +
    (job.description || '') + ' ' +
    (job.tags || '')
  ).toLowerCase();

  // --- Skill matching (60 pts max) ---
  const matchedSkills = [];
  if (profile.skills.length > 0) {
    for (const skill of profile.skills) {
      // Check for the skill as a whole phrase in the job text
      if (jobText.includes(skill)) {
        matchedSkills.push(skill);
      }
    }
  }

  const skillScore = profile.skills.length > 0
    ? (matchedSkills.length / profile.skills.length) * 60
    : 0;

  // --- Title keyword matching (30 pts max) ---
  const jobTitleTokens = new Set(tokenize(job.title));
  let titleMatches = 0;
  if (profile.titleKeywords.length > 0) {
    for (const keyword of profile.titleKeywords) {
      if (jobTitleTokens.has(keyword)) {
        titleMatches++;
      }
    }
  }

  const titleScore = profile.titleKeywords.length > 0
    ? (titleMatches / profile.titleKeywords.length) * 30
    : 0;

  const titleMatch = titleMatches > 0;

  // --- Freshness (10 pts max) ---
  let freshnessScore = 0;
  if (job.date) {
    const jobDate = new Date(job.date);
    const now = new Date();
    const daysDiff = Math.floor((now - jobDate) / (1000 * 60 * 60 * 24));

    if (daysDiff <= 7) {
      freshnessScore = 10;
    } else if (daysDiff <= 14) {
      freshnessScore = 5;
    }
    // older than 14 days = 0
  }

  const score = Math.round(skillScore + titleScore + freshnessScore);

  return {
    score: Math.min(100, Math.max(0, score)),
    matchedSkills,
    titleMatch
  };
}

/**
 * Score, filter, and rank an array of jobs against a profile.
 * Jobs below minScore are excluded. Results sorted descending by score.
 * Each returned job gets relevanceScore, matchedSkills, and titleMatch appended.
 *
 * @param {Array} jobs — array of normalized job objects
 * @param {{ skills: string[], titleKeywords: string[] }} profile
 * @param {number} minScore — minimum score threshold (default 60)
 * @returns {Array} scored and filtered jobs, sorted by relevanceScore descending
 */
export function scoreAndRankJobs(jobs, profile, minScore = 60) {
  if (!jobs || !Array.isArray(jobs) || !profile) {
    return [];
  }

  const scored = [];

  for (const job of jobs) {
    const { score, matchedSkills, titleMatch } = scoreJob(job, profile);

    if (score >= minScore) {
      scored.push({
        ...job,
        relevanceScore: score,
        matchedSkills,
        titleMatch
      });
    }
  }

  // Sort descending by relevance score
  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return scored;
}

export default {
  extractResumeProfile,
  scoreJob,
  scoreAndRankJobs
};
