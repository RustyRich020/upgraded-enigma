/* ============================================================
   components/jd-storage.js — Job Description Storage
   ============================================================ */

const STORAGE_KEY = 'jobsynk_job_descriptions';

let jdCache = {};

/**
 * Initialize JD storage by loading from localStorage.
 * @param {object} state — state store (reserved for future use)
 */
export function initJdStorage(state) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    jdCache = raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn('jd-storage: failed to load from localStorage', e);
    jdCache = {};
  }
}

/**
 * Save a job description for a given job ID.
 * @param {string} jobId — the job's unique ID
 * @param {string} jdText — full job description text
 */
export function saveJd(jobId, jdText) {
  if (!jobId) return;
  const text = jdText || '';
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  jdCache[jobId] = {
    text,
    savedAt: new Date().toISOString(),
    wordCount
  };

  persist();
}

/**
 * Retrieve a stored job description for a given job ID.
 * @param {string} jobId — the job's unique ID
 * @returns {{ text: string, savedAt: string, wordCount: number } | null}
 */
export function getJd(jobId) {
  if (!jobId || !jdCache[jobId]) return null;
  return jdCache[jobId];
}

/**
 * Return all stored job descriptions.
 * @returns {{ [jobId: string]: { text: string, savedAt: string, wordCount: number } }}
 */
export function getAllJds() {
  return { ...jdCache };
}

/**
 * Remove a stored JD for a given job ID.
 * @param {string} jobId
 */
export function removeJd(jobId) {
  if (!jobId) return;
  delete jdCache[jobId];
  persist();
}

/* --- Internal --- */

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jdCache));
  } catch (e) {
    console.warn('jd-storage: failed to persist to localStorage', e);
  }
}

export default { initJdStorage, saveJd, getJd, getAllJds, removeJd };
