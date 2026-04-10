/* ============================================================
   services/job-agent.js — Automated job search agent
   Orchestrates search, deduplication, relevance scoring, and
   AI-powered query generation on a configurable schedule.
   ============================================================ */

import { deduplicateResults } from './dedup-engine.js';
import { extractResumeProfile, scoreAndRankJobs } from './relevance-scorer.js';
import { searchRemotive } from './search-remotive.js';
import { searchArbeitnow } from './search-arbeitnow.js';
import { searchAdzuna } from './search-adzuna.js';
import { searchJSearch } from './search-jsearch.js';
import { callGemini } from './ai-gemini.js';
import { callGroq } from './ai-groq.js';
import { getApi, hasApi } from './api-keys.js';
import { checkLimit, recordUsage, getRemaining } from './usage-tracker.js';
import state from '../state.js';
import { toast } from '../components/toast.js';
import { uid, today } from '../utils.js';
import { FEATURES, STORAGE_KEYS } from '../config.js';

/* ---------- Constants ---------- */

const FREQUENCY_MS = {
  'hourly': 3600000,
  '6h': 21600000,
  '12h': 43200000,
  '24h': 86400000
};

const DEFAULT_CONFIG = {
  enabled: false,
  frequency: '12h',
  minRelevanceScore: 60,
  autoAdd: false,
  maxResultsPerRun: 20,
  dedupThreshold: 0.75,
  lastRun: null,
  nextRun: null,
  searchQueries: [],
  queriesGeneratedAt: null,
  pendingJobs: [],
  refinementData: { kept: [], deleted: [] },
  queuedQueries: []
};

/* ---------- Internal state ---------- */

let agentState = { intervalId: null, running: false };
let config = { ...DEFAULT_CONFIG };
let agentRuns = [];
let stateRef = null;
let addJobRef = null;

/* ---------- Helpers ---------- */

function persistConfig() {
  state.set('agentConfig', { ...config });
}

function persistRuns() {
  state.set('agentRuns', [...agentRuns]);
}

function loadConfig() {
  const saved = state.get('agentConfig');
  if (saved && typeof saved === 'object') {
    config = { ...DEFAULT_CONFIG, ...saved };
    // Ensure nested objects exist
    if (!config.refinementData) config.refinementData = { kept: [], deleted: [] };
    if (!config.pendingJobs) config.pendingJobs = [];
    if (!config.searchQueries) config.searchQueries = [];
    if (!config.queuedQueries) config.queuedQueries = [];
  } else {
    config = { ...DEFAULT_CONFIG };
  }
}

function loadRuns() {
  const saved = state.get('agentRuns');
  agentRuns = Array.isArray(saved) ? saved : [];
}

function getIntervalMs() {
  return FREQUENCY_MS[config.frequency] || FREQUENCY_MS['12h'];
}

/* ---------- Exported functions ---------- */

/**
 * Initialize the agent. Loads config, stores references, starts if enabled.
 * @param {object} stateStore — state module reference
 * @param {Function} addJobFn — callback to add a job to the tracker
 */
export function initAgent(stateStore, addJobFn) {
  stateRef = stateStore;
  addJobRef = addJobFn;
  loadConfig();
  loadRuns();

  if (config.enabled) {
    startAgent();
  }
}

/**
 * Start the agent interval timer.
 * Runs immediately if nextRun is in the past.
 */
export function startAgent() {
  if (agentState.intervalId) {
    clearInterval(agentState.intervalId);
  }

  config.enabled = true;
  const intervalMs = getIntervalMs();

  // Check if we should run immediately (nextRun is past)
  const now = Date.now();
  if (config.nextRun && new Date(config.nextRun).getTime() <= now) {
    runAgentCycle().catch(err => console.error('Agent cycle error:', err));
  }

  // Set up recurring interval
  agentState.intervalId = setInterval(() => {
    runAgentCycle().catch(err => console.error('Agent cycle error:', err));
  }, intervalMs);

  // Set next run time
  config.nextRun = new Date(now + intervalMs).toISOString();
  persistConfig();
}

/**
 * Stop the agent and disable it.
 */
export function stopAgent() {
  if (agentState.intervalId) {
    clearInterval(agentState.intervalId);
    agentState.intervalId = null;
  }
  agentState.running = false;
  config.enabled = false;
  persistConfig();
}

/**
 * Run a single agent cycle — the 10-step pipeline.
 * @returns {{ status: string, reason?: string, stats?: object }}
 */
export async function runAgentCycle() {
  const startTime = Date.now();

  // Step 1: Pre-flight checks
  if (!config.enabled) {
    return { status: 'skipped', reason: 'Agent is disabled' };
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { status: 'skipped', reason: 'Browser is offline' };
  }
  const resumes = state.get('resumes');
  if (!resumes || !Array.isArray(resumes) || resumes.filter(r => !r._meta).length === 0) {
    return { status: 'skipped', reason: 'No resumes found — upload a resume first' };
  }

  // Step 2: Set running, get resumes
  agentState.running = true;
  const validResumes = resumes.filter(r => !r._meta);

  // Step 3: Extract profile
  const profile = extractResumeProfile(validResumes);
  if (!profile.skills || profile.skills.length === 0) {
    agentState.running = false;
    return { status: 'skipped', reason: 'No skills found in resumes' };
  }

  // Step 4: Generate search queries if needed
  const queriesAge = config.queriesGeneratedAt
    ? Date.now() - new Date(config.queriesGeneratedAt).getTime()
    : Infinity;
  const twentyFourHours = 24 * 60 * 60 * 1000;

  if (!config.searchQueries || config.searchQueries.length === 0 || queriesAge > twentyFourHours) {
    await generateSearchQueries(profile);
  }

  const queries = config.searchQueries.length > 0
    ? config.searchQueries
    : [profile.skills.slice(0, 3).join(' ')];

  // Step 5: Plan API calls
  const plan = [];

  for (const query of queries) {
    // Free APIs first
    if (getRemaining('remotive') > 0) {
      plan.push({
        api: 'remotive',
        query,
        searchFn: searchRemotive,
        args: [query]
      });
    }
    if (getRemaining('arbeitnow') > 0) {
      plan.push({
        api: 'arbeitnow',
        query,
        searchFn: searchArbeitnow,
        args: [query]
      });
    }
    // Keyed APIs if available
    if (hasApi('adzunaId') && hasApi('adzunaKey') && getRemaining('adzuna') > 0) {
      plan.push({
        api: 'adzuna',
        query,
        searchFn: searchAdzuna,
        args: [query, 'us', getApi('adzunaId'), getApi('adzunaKey')]
      });
    }
    if (hasApi('jsearchKey') && getRemaining('jsearch') > 0) {
      plan.push({
        api: 'jsearch',
        query,
        searchFn: searchJSearch,
        args: [query, getApi('jsearchKey')]
      });
    }
  }

  // Step 6: Execute searches
  const allResults = [];
  const sourceBreakdown = {};

  for (const item of plan) {
    try {
      const results = await item.searchFn(...item.args);
      const limited = (results || []).slice(0, config.maxResultsPerRun);
      allResults.push(...limited);
      sourceBreakdown[item.api] = (sourceBreakdown[item.api] || 0) + limited.length;
      recordUsage(item.api);
    } catch (err) {
      console.warn(`Agent: ${item.api} search failed for "${item.query}":`, err.message);
    }
  }

  // Step 7: Deduplicate
  const existingJobs = (state.get('jobs') || []).filter(j => j && j.title);
  const { unique, duplicates } = deduplicateResults(
    allResults,
    existingJobs,
    config.dedupThreshold
  );

  // Step 8: Score and rank
  const scored = scoreAndRankJobs(unique, profile, config.minRelevanceScore);

  // Step 9: Handle results
  let addedCount = 0;

  if (config.autoAdd && addJobRef) {
    for (const job of scored) {
      addJobRef({
        title: job.title || '',
        company: job.company || '',
        url: job.url || '',
        source: job.source || '',
        salary: job.salary || '',
        status: 'Saved',
        follow: today(3),
        _agentAdded: true,
        relevanceScore: job.relevanceScore,
        matchedSkills: job.matchedSkills
      });
      addedCount++;
    }
    if (addedCount > 0) {
      toast(`Agent added ${addedCount} new job${addedCount > 1 ? 's' : ''} to tracker`, 'success');
    }
  } else {
    // Add to pending review queue (cap at 100)
    for (const job of scored) {
      config.pendingJobs.push({
        ...job,
        _pendingId: uid(),
        _foundAt: new Date().toISOString()
      });
    }
    if (config.pendingJobs.length > 100) {
      config.pendingJobs = config.pendingJobs.slice(-100);
    }
    if (scored.length > 0) {
      toast(`Agent found ${scored.length} new job${scored.length > 1 ? 's' : ''} — review pending`, 'info');
    }
  }

  // Step 10: Log run and persist
  const duration = Date.now() - startTime;
  const runEntry = {
    id: uid(),
    date: new Date().toISOString(),
    queries: queries.slice(),
    stats: {
      total: allResults.length,
      unique: unique.length,
      duplicates: duplicates.length,
      scored: scored.length,
      added: addedCount
    },
    sourceBreakdown,
    duration
  };

  agentRuns.push(runEntry);
  if (agentRuns.length > 50) {
    agentRuns = agentRuns.slice(-50);
  }

  config.lastRun = new Date().toISOString();
  config.nextRun = new Date(Date.now() + getIntervalMs()).toISOString();
  agentState.running = false;

  persistConfig();
  persistRuns();

  return {
    status: 'complete',
    stats: {
      total: allResults.length,
      unique: unique.length,
      duplicates: duplicates.length,
      scored: scored.length,
      added: addedCount
    }
  };
}

/**
 * Generate search queries using AI or fallback heuristics.
 * Stores queries in config.searchQueries.
 * @param {{ skills: string[], titleKeywords: string[] }} profile
 */
export async function generateSearchQueries(profile) {
  const skills = profile.skills.slice(0, 15);
  const titleKw = profile.titleKeywords.slice(0, 10);

  // Build refinement context
  let refinementContext = '';
  if (config.refinementData) {
    const keptCount = (config.refinementData.kept || []).length;
    const deletedCount = (config.refinementData.deleted || []).length;
    if (keptCount + deletedCount >= 10) {
      const keptSample = (config.refinementData.kept || []).slice(-10).join(', ');
      const deletedSample = (config.refinementData.deleted || []).slice(-10).join(', ');
      refinementContext = `\n\nUser feedback signals:
- Preferred keywords: ${keptSample || 'none'}
- Avoided keywords: ${deletedSample || 'none'}
Adjust queries to match these preferences.`;
    }
  }

  const prompt = `Generate exactly 4 diverse job search queries for someone with these skills: ${skills.join(', ')}.
Title keywords: ${titleKw.join(', ')}.
${refinementContext}

Rules:
- Each query should be 2-4 words
- Cover different angles (e.g., role-based, skill-based, industry-based)
- No numbering, no bullet points
- One query per line
- No explanations, just the queries`;

  // Try AI first
  let aiResponse = null;

  // Try Gemini
  if (!aiResponse && hasApi('geminiKey') && getRemaining('gemini') > 0) {
    try {
      aiResponse = await callGemini(prompt, getApi('geminiKey'));
      recordUsage('gemini');
    } catch (err) {
      console.warn('Agent: Gemini query generation failed:', err.message);
    }
  }

  // Try Groq
  if (!aiResponse && hasApi('groqKey') && getRemaining('groq') > 0) {
    try {
      aiResponse = await callGroq(prompt, getApi('groqKey'));
      recordUsage('groq');
    } catch (err) {
      console.warn('Agent: Groq query generation failed:', err.message);
    }
  }

  // Parse AI response
  if (aiResponse) {
    const lines = aiResponse
      .split('\n')
      .map(l => l.replace(/^[\d\.\-\*\s]+/, '').trim())
      .filter(l => l.length > 1 && l.length < 80 && !l.includes(':'));

    if (lines.length >= 2) {
      config.searchQueries = lines.slice(0, 6);
      config.queriesGeneratedAt = new Date().toISOString();
      persistConfig();
      return;
    }
  }

  // Fallback: generate queries from top skills
  const topSkills = skills.slice(0, 3);
  const fallbackQueries = [];

  if (topSkills[0]) fallbackQueries.push(`${topSkills[0]} developer`);
  if (topSkills[1]) fallbackQueries.push(`${topSkills[1]} engineer`);
  if (topSkills[2]) fallbackQueries.push(`${topSkills[2]} data analyst`);
  if (topSkills.length >= 2) {
    fallbackQueries.push(`${topSkills[0]} ${topSkills[1]} remote`);
  }

  config.searchQueries = fallbackQueries.length > 0
    ? fallbackQueries
    : ['software developer', 'data analyst', 'web developer'];
  config.queriesGeneratedAt = new Date().toISOString();
  persistConfig();
}

/**
 * Get the current agent status.
 * @returns {{ enabled: boolean, running: boolean, lastRun: string|null, nextRun: string|null, pendingCount: number, config: object }}
 */
export function getAgentStatus() {
  return {
    enabled: config.enabled,
    running: agentState.running,
    lastRun: config.lastRun,
    nextRun: config.nextRun,
    pendingCount: (config.pendingJobs || []).length,
    config: { ...config }
  };
}

/**
 * Update agent configuration with a partial patch.
 * Restarts the interval if frequency changed.
 * @param {object} patch — partial config object
 */
export function updateAgentConfig(patch) {
  const oldFrequency = config.frequency;
  Object.assign(config, patch);

  // Restart interval if frequency changed while running
  if (patch.frequency && patch.frequency !== oldFrequency && config.enabled) {
    if (agentState.intervalId) {
      clearInterval(agentState.intervalId);
    }
    const intervalMs = getIntervalMs();
    agentState.intervalId = setInterval(() => {
      runAgentCycle().catch(err => console.error('Agent cycle error:', err));
    }, intervalMs);
    config.nextRun = new Date(Date.now() + intervalMs).toISOString();
  }

  persistConfig();
}

/**
 * Get the current agent configuration.
 * @returns {object} config copy
 */
export function getAgentConfig() {
  return { ...config };
}

/**
 * Get the array of past agent runs.
 * @returns {Array} run log entries
 */
export function getAgentRuns() {
  return [...agentRuns];
}

/**
 * Record a refinement signal when a user keeps or deletes an agent-found job.
 * Clears search queries to force regeneration with new preferences.
 * @param {string} jobId — the job identifier
 * @param {'kept'|'deleted'} signal — whether the job was kept or deleted
 */
export function recordRefinementSignal(jobId, signal) {
  if (!config.refinementData) {
    config.refinementData = { kept: [], deleted: [] };
  }

  // Find the job to extract keywords
  const allJobs = state.get('jobs') || [];
  const job = allJobs.find(j => j.id === jobId);
  const pending = (config.pendingJobs || []).find(j => j._pendingId === jobId || j.id === jobId);
  const target = job || pending;

  if (target) {
    const keywords = (target.title || '')
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 2);

    if (signal === 'kept') {
      config.refinementData.kept.push(...keywords);
      // Cap at 100 signals
      if (config.refinementData.kept.length > 100) {
        config.refinementData.kept = config.refinementData.kept.slice(-100);
      }
    } else if (signal === 'deleted') {
      config.refinementData.deleted.push(...keywords);
      if (config.refinementData.deleted.length > 100) {
        config.refinementData.deleted = config.refinementData.deleted.slice(-100);
      }
    }
  }

  // Force query regeneration
  config.searchQueries = [];
  config.queriesGeneratedAt = null;
  persistConfig();
}

/**
 * Approve a pending job and add it to the tracker.
 * @param {number} index — index in pendingJobs array
 * @param {Function} addJobFn — callback to add the job
 */
export function approvePendingJob(index, addJobFn) {
  const fn = addJobFn || addJobRef;
  if (!config.pendingJobs || index < 0 || index >= config.pendingJobs.length) return;

  const job = config.pendingJobs.splice(index, 1)[0];
  if (fn && job) {
    fn({
      title: job.title || '',
      company: job.company || '',
      url: job.url || '',
      source: job.source || '',
      salary: job.salary || '',
      status: 'Saved',
      follow: today(3),
      _agentAdded: true,
      relevanceScore: job.relevanceScore,
      matchedSkills: job.matchedSkills
    });
    recordRefinementSignal(job._pendingId || '', 'kept');
    toast(`Added "${job.title}" to tracker`, 'success');
  }
  persistConfig();
}

/**
 * Dismiss a pending job and record a negative signal.
 * @param {number} index — index in pendingJobs array
 */
export function dismissPendingJob(index) {
  if (!config.pendingJobs || index < 0 || index >= config.pendingJobs.length) return;

  const job = config.pendingJobs.splice(index, 1)[0];
  if (job) {
    recordRefinementSignal(job._pendingId || '', 'deleted');
  }
  persistConfig();
}

export default {
  initAgent,
  startAgent,
  stopAgent,
  runAgentCycle,
  generateSearchQueries,
  getAgentStatus,
  updateAgentConfig,
  getAgentConfig,
  getAgentRuns,
  recordRefinementSignal,
  approvePendingJob,
  dismissPendingJob
};
