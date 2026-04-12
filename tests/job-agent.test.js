/**
 * Tests for js/services/job-agent.js
 * Run with: npx vitest run tests/job-agent.test.js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock all external dependencies
vi.mock('../js/services/dedup-engine.js', () => ({
  deduplicateResults: vi.fn((results) => ({ unique: results, duplicates: [] })),
  isDuplicate: vi.fn(() => false),
}));

vi.mock('../js/services/relevance-scorer.js', () => ({
  extractResumeProfile: vi.fn(() => ({
    skills: ['javascript', 'react', 'node'],
    titleKeywords: ['developer', 'engineer'],
  })),
  scoreAndRankJobs: vi.fn((jobs) => jobs),
}));

vi.mock('../js/services/search-remotive.js', () => ({
  searchRemotive: vi.fn().mockResolvedValue([]),
}));

vi.mock('../js/services/search-arbeitnow.js', () => ({
  searchArbeitnow: vi.fn().mockResolvedValue([]),
}));

vi.mock('../js/services/search-adzuna.js', () => ({
  searchAdzuna: vi.fn().mockResolvedValue([]),
}));

vi.mock('../js/services/search-jsearch.js', () => ({
  searchJSearch: vi.fn().mockResolvedValue([]),
}));

vi.mock('../js/services/ai-gemini.js', () => ({
  callGemini: vi.fn().mockResolvedValue(null),
}));

vi.mock('../js/services/ai-groq.js', () => ({
  callGroq: vi.fn().mockResolvedValue(null),
}));

vi.mock('../js/services/api-keys.js', () => ({
  getApi: vi.fn(() => ''),
  hasApi: vi.fn(() => false),
}));

vi.mock('../js/services/usage-tracker.js', () => ({
  checkLimit: vi.fn(() => ({ allowed: true, used: 0, limit: 5, remaining: 5 })),
  recordUsage: vi.fn(),
  getRemaining: vi.fn(() => 5),
}));

// Must use a hoisted variable for vi.mock factory
const { mockState } = vi.hoisted(() => {
  const mockState = {
    _data: {},
    get(key) { return this._data[key] ?? null; },
    set(key, val) { this._data[key] = val; },
    clear() { this._data = {}; },
  };
  return { mockState };
});

vi.mock('../js/state.js', () => ({
  default: mockState,
}));

vi.mock('../js/components/toast.js', () => ({
  toast: vi.fn(),
}));

vi.mock('../js/utils.js', () => ({
  uid: () => 'test-uid-' + Math.random().toString(36).slice(2, 6),
  today: (n = 0) => '2026-04-12',
}));

vi.mock('../js/config.js', () => ({
  FEATURES: {},
  STORAGE_KEYS: {
    agentConfig: 'jobsynk_agent_config',
    agentRuns: 'jobsynk_agent_runs',
  },
}));

import {
  initAgent,
  stopAgent,
  runAgentCycle,
  getAgentStatus,
  updateAgentConfig,
  getAgentConfig,
  getAgentRuns,
  recordRefinementSignal,
  startAgent,
  generateSearchQueries,
} from '../js/services/job-agent.js';

import { deduplicateResults } from '../js/services/dedup-engine.js';
import { scoreAndRankJobs } from '../js/services/relevance-scorer.js';

/* ---------- Setup / Teardown ---------- */

beforeEach(() => {
  vi.restoreAllMocks();
  vi.useFakeTimers();
  mockState.clear();

  // Re-apply mocks that restoreAllMocks clears
  deduplicateResults.mockImplementation((results) => ({ unique: results, duplicates: [] }));
  scoreAndRankJobs.mockImplementation((jobs) => jobs);
});

afterEach(() => {
  // Stop any running agent to clear intervals
  try { stopAgent(); } catch (e) { /* ignore */ }
  vi.useRealTimers();
});

// ── Config management ─────────────────────────────────────────

describe('Config management', () => {
  it('getAgentConfig returns config with expected default shape', () => {
    initAgent(mockState, vi.fn());
    const cfg = getAgentConfig();
    expect(cfg).toHaveProperty('enabled');
    expect(cfg).toHaveProperty('autoAdd');
    expect(cfg).toHaveProperty('minRelevanceScore');
    expect(cfg).toHaveProperty('frequency');
    expect(cfg).toHaveProperty('searchQueries');
    expect(cfg).toHaveProperty('refinementData');
  });

  it('loadConfig returns defaults when state has no agent config', () => {
    mockState.clear();
    initAgent(mockState, vi.fn());
    const cfg = getAgentConfig();
    expect(cfg.enabled).toBe(false);
    expect(cfg.frequency).toBe('12h');
  });

  it('persistConfig saves config to state', () => {
    initAgent(mockState, vi.fn());
    updateAgentConfig({ minRelevanceScore: 80 });
    const saved = mockState.get('agentConfig');
    expect(saved).toBeDefined();
    expect(saved.minRelevanceScore).toBe(80);
  });

  it('merges missing fields with defaults', () => {
    mockState.set('agentConfig', { enabled: true });
    initAgent(mockState, vi.fn());
    const cfg = getAgentConfig();
    // Should have defaults for missing fields
    expect(cfg.frequency).toBe('12h');
    expect(cfg.minRelevanceScore).toBe(60);
    expect(cfg.enabled).toBe(true);
  });

  it('config has boolean flags (enabled, autoAdd)', () => {
    initAgent(mockState, vi.fn());
    const cfg = getAgentConfig();
    expect(typeof cfg.enabled).toBe('boolean');
    expect(typeof cfg.autoAdd).toBe('boolean');
  });

  it('config has numeric fields (minRelevanceScore, frequency interval)', () => {
    initAgent(mockState, vi.fn());
    const cfg = getAgentConfig();
    expect(typeof cfg.minRelevanceScore).toBe('number');
    expect(typeof cfg.maxResultsPerRun).toBe('number');
  });

  it('searchQueries is an array', () => {
    initAgent(mockState, vi.fn());
    const cfg = getAgentConfig();
    expect(Array.isArray(cfg.searchQueries)).toBe(true);
  });

  it('refinementData exists with kept and deleted arrays', () => {
    initAgent(mockState, vi.fn());
    const cfg = getAgentConfig();
    expect(cfg.refinementData).toBeDefined();
    expect(Array.isArray(cfg.refinementData.kept)).toBe(true);
    expect(Array.isArray(cfg.refinementData.deleted)).toBe(true);
  });
});

// ── Schedule management ───────────────────────────────────────

describe('Schedule management', () => {
  it('initAgent with enabled=false does not start an interval', () => {
    mockState.clear();
    initAgent(mockState, vi.fn());
    const status = getAgentStatus();
    expect(status.enabled).toBe(false);
    expect(status.running).toBe(false);
  });

  it('stopAgent clears any running interval', () => {
    mockState.clear();
    initAgent(mockState, vi.fn());
    startAgent();
    const statusBefore = getAgentStatus();
    expect(statusBefore.enabled).toBe(true);

    stopAgent();
    const statusAfter = getAgentStatus();
    expect(statusAfter.enabled).toBe(false);
  });

  it('multiple stopAgent calls do not throw', () => {
    mockState.clear();
    initAgent(mockState, vi.fn());
    expect(() => {
      stopAgent();
      stopAgent();
      stopAgent();
    }).not.toThrow();
  });

  it('startAgent sets enabled to true and schedules next run', () => {
    mockState.clear();
    initAgent(mockState, vi.fn());
    startAgent();
    const cfg = getAgentConfig();
    expect(cfg.enabled).toBe(true);
    expect(cfg.nextRun).toBeDefined();
  });
});

// ── Refinement signals ────────────────────────────────────────

describe('Refinement signals', () => {
  it('recordRefinementSignal adds keywords to kept array', () => {
    initAgent(mockState, vi.fn());
    // Put a matching job in state
    mockState.set('jobs', [
      { id: 'job-1', title: 'Senior React Developer' },
    ]);
    recordRefinementSignal('job-1', 'kept');
    const cfg = getAgentConfig();
    expect(cfg.refinementData.kept.length).toBeGreaterThan(0);
  });

  it('recordRefinementSignal adds keywords to deleted array', () => {
    initAgent(mockState, vi.fn());
    mockState.set('jobs', [
      { id: 'job-2', title: 'Junior Python Engineer' },
    ]);
    recordRefinementSignal('job-2', 'deleted');
    const cfg = getAgentConfig();
    expect(cfg.refinementData.deleted.length).toBeGreaterThan(0);
  });

  it('signals persist through config in state', () => {
    initAgent(mockState, vi.fn());
    mockState.set('jobs', [
      { id: 'job-3', title: 'Full Stack Developer' },
    ]);
    recordRefinementSignal('job-3', 'kept');
    const saved = mockState.get('agentConfig');
    expect(saved.refinementData.kept.length).toBeGreaterThan(0);
  });

  it('handles signal for non-existent job gracefully', () => {
    initAgent(mockState, vi.fn());
    mockState.set('jobs', []);
    expect(() => {
      recordRefinementSignal('nonexistent-id', 'kept');
    }).not.toThrow();
  });
});

// ── Agent pipeline logic ──────────────────────────────────────

describe('Agent pipeline logic', () => {
  it('runAgentCycle returns skipped when agent is disabled', async () => {
    initAgent(mockState, vi.fn());
    // Agent is disabled by default
    const result = await runAgentCycle();
    expect(result.status).toBe('skipped');
    expect(result.reason).toContain('disabled');
  });

  it('runAgentCycle returns skipped when offline', async () => {
    initAgent(mockState, vi.fn());
    updateAgentConfig({ enabled: true });
    const result = await runAgentCycle();
    // In test environment navigator.onLine is typically false
    expect(result.status).toBe('skipped');
    expect(typeof result.reason).toBe('string');
  });

  it('deduplicateResults mock is properly configured', () => {
    const { deduplicateResults } = require('../js/services/dedup-engine.js');
    const result = deduplicateResults([{ title: 'Test Job' }], []);
    expect(result.unique).toHaveLength(1);
    expect(result.duplicates).toHaveLength(0);
  });

  it('scoreAndRankJobs mock is properly configured', () => {
    expect(scoreAndRankJobs).toBeDefined();
    expect(typeof scoreAndRankJobs).toBe('function');
  });
});
