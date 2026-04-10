/* ============================================================
   state.js — Reactive state store with event emitter
   ============================================================ */

import { STORAGE_KEYS } from './config.js';

const listeners = {};
const data = {
  jobs: [],
  resumes: [],
  companies: [],
  contacts: [],
  settings: {},
  apiKeys: {},
  user: null,
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
    localStorage.setItem(STORAGE_KEYS.jobs, JSON.stringify(data.jobs));
    localStorage.setItem(STORAGE_KEYS.resumes, JSON.stringify(data.resumes));
    localStorage.setItem(STORAGE_KEYS.companies, JSON.stringify(data.companies));
    localStorage.setItem(STORAGE_KEYS.contacts, JSON.stringify(data.contacts));
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ role: data.role, ...data.settings }));
  } catch (e) {
    console.warn('Persist failed:', e);
  }
}

/**
 * Load initial state from localStorage.
 */
export function loadFromStorage() {
  try {
    data.jobs = JSON.parse(localStorage.getItem(STORAGE_KEYS.jobs) || '[]');
    data.resumes = JSON.parse(localStorage.getItem(STORAGE_KEYS.resumes) || '[]');
    data.companies = JSON.parse(localStorage.getItem(STORAGE_KEYS.companies) || '[]');
    data.contacts = JSON.parse(localStorage.getItem(STORAGE_KEYS.contacts) || '[]');
    const settings = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || '{}');
    data.role = settings.role || 'Candidate';
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
    const jobs = await getAllDocs('jobs');
    if (jobs && jobs.length > 0) data.jobs = jobs;
    const resumes = await getAllDocs('resumes');
    if (resumes && resumes.length > 0) data.resumes = resumes;
    const companies = await getAllDocs('companies');
    if (companies && companies.length > 0) data.companies = companies;
    const contacts = await getAllDocs('contacts');
    if (contacts && contacts.length > 0) data.contacts = contacts;
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
