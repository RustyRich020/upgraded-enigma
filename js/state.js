/* ============================================================
   state.js — Reactive state store with event emitter
   ============================================================ */

import { STORAGE_KEYS } from './config.js';

const listeners = {};
const JSON_FIELDS = [
  ['jobs', STORAGE_KEYS.jobs, []],
  ['resumes', STORAGE_KEYS.resumes, []],
  ['companies', STORAGE_KEYS.companies, []],
  ['contacts', STORAGE_KEYS.contacts, []],
  ['interviews', STORAGE_KEYS.interviews, []],
  ['networking', STORAGE_KEYS.networking, []],
  ['offers', STORAGE_KEYS.offers, []],
  ['stories', STORAGE_KEYS.stories, []],
  ['agentConfig', STORAGE_KEYS.agentConfig, null],
  ['agentRuns', STORAGE_KEYS.agentRuns, []]
];
const data = {
  jobs: [],
  resumes: [],
  companies: [],
  contacts: [],
  interviews: [],
  networking: [],
  offers: [],
  stories: [],
  settings: {},
  apiKeys: {},
  user: null,
  agentConfig: null,
  agentRuns: [],
  view: 'dashboard',
  role: 'Candidate',
  listView: true
};

/**
 * Get a state value by key.
 */
export function get(key) {
  return data[key];
}

/**
 * Set a state value by key and emit a change event.
 */
export function set(key, value) {
  const old = data[key];
  data[key] = value;
  emit('change', { key, value, old });
  emit(`change:${key}`, { value, old });
  persist();
}

function readStoredValue(storageKey, fallback) {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Listen for an event.
 */
export function on(event, cb) {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(cb);
  return () => {
    listeners[event] = listeners[event].filter(fn => fn !== cb);
  };
}

/**
 * Emit an event to all registered listeners.
 */
export function emit(event, payload) {
  (listeners[event] || []).forEach(fn => {
    try { fn(payload); } catch (e) { console.error('State event error:', e); }
  });
}

/**
 * Persist all state data to localStorage.
 */
export function persist() {
  try {
    JSON_FIELDS.forEach(([key, storageKey]) => {
      if (data[key] !== undefined && data[key] !== null) {
        localStorage.setItem(storageKey, JSON.stringify(data[key]));
      } else {
        localStorage.removeItem(storageKey);
      }
    });
    localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({ role: data.role, listView: data.listView, ...data.settings })
    );
  } catch (e) {
    console.warn('Persist failed:', e);
  }
}

/**
 * Load initial state from localStorage.
 */
export function loadFromStorage() {
  try {
    JSON_FIELDS.forEach(([key, storageKey, fallback]) => {
      data[key] = readStoredValue(storageKey, fallback);
    });
    const settings = readStoredValue(STORAGE_KEYS.settings, {});
    data.role = settings.role || 'Candidate';
    data.listView = settings.listView !== false;
    data.settings = settings;
  } catch (e) {
    console.warn('Load from storage failed:', e);
  }
}

/**
 * Sync state from Firestore when available (called from firebase/db.js).
 */
export async function syncFromFirestore(getAllDocs) {
  try {
    for (const key of ['jobs', 'resumes', 'companies', 'contacts', 'interviews', 'networking', 'offers', 'stories']) {
      const items = await getAllDocs(key);
      if (items && items.length > 0) data[key] = items;
    }
    emit('change', { key: 'all', value: null, old: null });
  } catch (e) {
    console.warn('Firestore sync failed, using localStorage:', e);
  }
}

/**
 * Get the full state data object (read-only reference).
 */
export function getAll() {
  return data;
}

export default { get, set, on, emit, persist, loadFromStorage, syncFromFirestore, getAll };
