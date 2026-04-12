// @vitest-environment jsdom

/**
 * Tests for js/services/notifications.js
 * Run with: npx vitest run tests/notifications.test.js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing the module
vi.mock('../js/config.js', () => ({
  ENDPOINTS: {
    ntfy: 'https://ntfy.sh',
  },
}));

vi.mock('../js/utils.js', () => ({
  today: () => '2026-04-12',
}));

vi.mock('../js/components/toast.js', () => ({
  toast: vi.fn(),
}));

import {
  getPermissionStatus,
  sendNtfy,
  checkFollowUps,
  scheduleChecks,
  requestPermission,
  sendAllChannels,
} from '../js/services/notifications.js';

/* ---------- Setup / Teardown ---------- */

let originalFetch;
let originalNotification;

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.useFakeTimers();

  // Save originals
  originalFetch = globalThis.fetch;
  originalNotification = globalThis.Notification;

  // Default mocks
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
  globalThis.Notification = vi.fn();
  globalThis.Notification.permission = 'granted';
  globalThis.Notification.requestPermission = vi.fn().mockResolvedValue('granted');
});

afterEach(() => {
  vi.useRealTimers();
  globalThis.fetch = originalFetch;
  globalThis.Notification = originalNotification;
});

// ── getPermissionStatus ───────────────────────────────────────

describe('getPermissionStatus', () => {
  it('returns an object with status and label fields', () => {
    const result = getPermissionStatus();
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('label');
  });

  it('returns granted/Enabled when permission is granted', () => {
    globalThis.Notification.permission = 'granted';
    const result = getPermissionStatus();
    expect(result.status).toBe('granted');
    expect(result.label).toBe('Enabled');
  });

  it('returns denied/Blocked when permission is denied', () => {
    globalThis.Notification.permission = 'denied';
    const result = getPermissionStatus();
    expect(result.status).toBe('denied');
    expect(result.label).toContain('Blocked');
  });

  it('returns unsupported when Notification API does not exist', () => {
    delete globalThis.Notification;
    const result = getPermissionStatus();
    expect(result.status).toBe('unsupported');
    expect(result.label).toBe('Not Supported');
  });
});

// ── sendNtfy ──────────────────────────────────────────────────

describe('sendNtfy', () => {
  it('returns false when no topic is provided', async () => {
    const result = await sendNtfy('hello', '');
    expect(result).toBe(false);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('calls fetch with correct URL when topic is provided', async () => {
    await sendNtfy('Test message', 'my-topic');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://ntfy.sh/my-topic',
      expect.objectContaining({
        method: 'POST',
        body: 'Test message',
      })
    );
  });

  it('returns true on successful fetch', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
    const result = await sendNtfy('msg', 'topic');
    expect(result).toBe(true);
  });

  it('returns false on fetch error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const result = await sendNtfy('msg', 'topic');
    expect(result).toBe(false);
  });
});

// ── checkFollowUps ────────────────────────────────────────────

describe('checkFollowUps', () => {
  it('returns empty array when jobs array is empty', () => {
    const result = checkFollowUps([], null);
    expect(result).toEqual([]);
  });

  it('returns empty array when jobs is null', () => {
    const result = checkFollowUps(null, null);
    expect(result).toEqual([]);
  });

  it('identifies jobs with follow-up date <= today', () => {
    const jobs = [
      { id: '1', title: 'Dev', company: 'Co', follow: '2026-04-12', status: 'Applied' },
      { id: '2', title: 'PM', company: 'Inc', follow: '2026-04-10', status: 'Applied' },
      { id: '3', title: 'QA', company: 'Ltd', follow: '2026-04-20', status: 'Applied' },
    ];
    const result = checkFollowUps(jobs, null);
    expect(result).toHaveLength(2);
    expect(result.map(j => j.id)).toContain('1');
    expect(result.map(j => j.id)).toContain('2');
  });

  it('skips jobs with status Closed', () => {
    const jobs = [
      { id: '1', title: 'Dev', company: 'Co', follow: '2026-04-10', status: 'Closed' },
    ];
    const result = checkFollowUps(jobs, null);
    expect(result).toEqual([]);
  });

  it('skips jobs with no follow-up date', () => {
    const jobs = [
      { id: '1', title: 'Dev', company: 'Co', status: 'Applied' },
    ];
    const result = checkFollowUps(jobs, null);
    expect(result).toEqual([]);
  });

  it('sends browser notification for due jobs when permission is granted', () => {
    globalThis.Notification.permission = 'granted';
    const jobs = [
      { id: '1', title: 'Dev', company: 'Co', follow: '2026-04-12', status: 'Applied' },
    ];
    checkFollowUps(jobs, null);
    expect(globalThis.Notification).toHaveBeenCalledWith(
      'JobSynk Follow-Up',
      expect.objectContaining({
        body: expect.stringContaining('Dev'),
      })
    );
  });

  it('calls sendNtfy when topic is provided', async () => {
    const jobs = [
      { id: '1', title: 'Dev', company: 'Co', follow: '2026-04-12', status: 'Applied' },
    ];
    checkFollowUps(jobs, 'test-topic');
    // sendNtfy calls fetch with the ntfy URL
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://ntfy.sh/test-topic',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });
});

// ── scheduleChecks ────────────────────────────────────────────

describe('scheduleChecks', () => {
  it('calls checkFollowUps after delay', () => {
    const getJobs = vi.fn().mockReturnValue([]);
    scheduleChecks(getJobs, null);

    // Initial check fires after 5000ms
    vi.advanceTimersByTime(5000);
    expect(getJobs).toHaveBeenCalled();
  });

  it('sets up a recurring interval', () => {
    const getJobs = vi.fn().mockReturnValue([]);
    const intervalId = scheduleChecks(getJobs, null);
    expect(intervalId).toBeDefined();

    // Advance past initial delay
    vi.advanceTimersByTime(5000);
    const callsAfterDelay = getJobs.mock.calls.length;

    // Advance by 30 minutes (interval)
    vi.advanceTimersByTime(30 * 60 * 1000);
    expect(getJobs.mock.calls.length).toBeGreaterThan(callsAfterDelay);
  });

  it('does not throw with empty job array', () => {
    const getJobs = vi.fn().mockReturnValue([]);
    expect(() => {
      scheduleChecks(getJobs, null);
      vi.advanceTimersByTime(5000);
    }).not.toThrow();
  });

  it('handles missing ntfyTopic gracefully', () => {
    const getJobs = vi.fn().mockReturnValue([
      { id: '1', title: 'Dev', company: 'Co', follow: '2026-04-12', status: 'Applied' },
    ]);
    expect(() => {
      scheduleChecks(getJobs, undefined);
      vi.advanceTimersByTime(5000);
    }).not.toThrow();
  });
});
