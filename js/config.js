/* ============================================================
   config.js — Application constants and configuration
   ============================================================ */

// Firebase configuration — fill in your own values
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAUbPGPfSHTxl8OFmSaVfg8jIJlwV4YWfA',
  authDomain: 'jobgrid-pro.firebaseapp.com',
  projectId: 'jobgrid-pro',
  storageBucket: 'jobgrid-pro.firebasestorage.app',
  messagingSenderId: '995536477473',
  appId: '1:995536477473:web:4ae5484fa8b21a2025f260',
  measurementId: 'G-8REGTKG7G5'
};

// Firestore collection names (scoped under users/{uid}/)
export const COLLECTIONS = {
  jobs: 'jobs',
  resumes: 'resumes',
  companies: 'companies',
  contacts: 'contacts',
  settings: 'settings',
  interviews: 'interviews',
  networking: 'networking',
  offers: 'offers',
  stories: 'stories'
};

// localStorage key prefixes
export const STORAGE_KEYS = {
  jobs: 'jobsynk_jobs',
  resumes: 'jobsynk_resumes',
  companies: 'jobsynk_companies',
  contacts: 'jobsynk_contacts',
  interviews: 'jobsynk_interviews',
  networking: 'jobsynk_networking',
  offers: 'jobsynk_offers',
  stories: 'jobsynk_stories',
  filters: 'jobsynk_filters',
  settings: 'jobsynk_settings',
  apiKeys: 'jobsynk_api_keys',
  migrated: 'jobsynk_migrated',
  theme: 'jobsynk_theme',
  onboarded: 'jobsynk_onboarded',
  tourDone: 'jobsynk_tour_done',
  authUser: 'jobsynk_auth_user',
  agentConfig: 'jobsynk_agent_config',
  agentRuns: 'jobsynk_agent_runs'
};

/**
 * One-time migration: copy tron_ keys to jobsynk_ keys, then remove old ones.
 * Safe to call multiple times — only runs if old keys exist and new ones don't.
 */
export function migrateStorageKeys() {
  const OLD_PREFIX = 'tron_';
  const NEW_PREFIX = 'jobsynk_';
  let migrated = false;

  // Migrate STORAGE_KEYS values
  Object.values(STORAGE_KEYS).forEach(newKey => {
    const oldKey = newKey.replace(NEW_PREFIX, OLD_PREFIX);
    if (oldKey === newKey) return;
    const oldVal = localStorage.getItem(oldKey);
    if (oldVal !== null && localStorage.getItem(newKey) === null) {
      localStorage.setItem(newKey, oldVal);
      migrated = true;
    }
  });

  // Migrate other known tron_ keys
  const extraKeys = [
    ['tron_checklist', 'jobsynk_checklist'],
    ['tron_job_descriptions', 'jobsynk_job_descriptions'],
    ['tron_search_results', 'jobsynk_search_results'],
    ['tron_findJobs_activeTab', 'jobsynk_findJobs_activeTab'],
    ['tron_myJobs_activeTab', 'jobsynk_myJobs_activeTab'],
    ['tron_myProfile_activeTab', 'jobsynk_myProfile_activeTab'],
    ['tron_api_usage', 'jobsynk_api_usage'],
    ['tron_user_tier', 'jobsynk_user_tier'],
  ];
  extraKeys.forEach(([oldKey, newKey]) => {
    const oldVal = localStorage.getItem(oldKey);
    if (oldVal !== null && localStorage.getItem(newKey) === null) {
      localStorage.setItem(newKey, oldVal);
      migrated = true;
    }
  });

  // Clean up old keys if migration happened
  if (migrated) {
    const allOld = Object.keys(localStorage).filter(k => k.startsWith(OLD_PREFIX));
    allOld.forEach(k => localStorage.removeItem(k));
  }
}

// Job statuses
export const STATUSES = ['Saved', 'Applied', 'Interview', 'Offer', 'Closed'];

// User roles
export const ROLES = ['Candidate', 'Manager', 'Executive', 'Auditor'];

// CDN URLs for libraries loaded via script tags
export const CDN = {
  chartJs: 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
  papaParse: 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js',
  pdfJs: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
  pdfJsWorker: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js',
  emailJs: 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js'
};

// Feature flags
export const FEATURES = {
  firebase: true,
  offlinePersistence: true,
  notifications: true,
  aiTools: true,
  blsSalary: true,
  pdfParsing: true,
  emailIntegration: true,
  hunterVerification: true,
  ntfyPush: true,
  onboardingTour: true,
  landing: true,
  emailAuth: true,
  arbeitnow: true,
  jsearch: true,
  careerOneStop: true,
  companyEnrichment: true,
  groqAi: true,
  jobAgent: true
};

// API endpoints
export const ENDPOINTS = {
  remotive: 'https://remotive.com/api/remote-jobs',
  adzuna: 'https://api.adzuna.com/v1/api/jobs',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
  hunter: 'https://api.hunter.io/v2/email-verifier',
  bls: 'https://api.bls.gov/publicAPI/v2/timeseries/data/',
  ntfy: 'https://ntfy.sh',
  clearbitLogo: 'https://logo.clearbit.com',
  arbeitnow: 'https://www.arbeitnow.com/api/job-board-api',
  jsearch: 'https://jsearch.p.rapidapi.com/search',
  careerOneStop: 'https://api.careeronestop.org/v1/occupation',
  abstractCompany: 'https://companyenrichment.abstractapi.com/v1/',
  groq: 'https://api.groq.com/openai/v1/chat/completions'
};

// BLS series IDs
export const BLS_SERIES = ['LEU0254530800'];

// Skill extraction patterns
export const SKILL_PATTERNS = /\b(python|javascript|typescript|react|angular|vue|node\.?js|sql|nosql|mongodb|postgresql|aws|azure|gcp|docker|kubernetes|git|ci\/cd|machine learning|deep learning|nlp|tensorflow|pytorch|pandas|numpy|scikit|tableau|power bi|excel|agile|scrum|jira|figma|html|css|sass|graphql|rest|api|java|c\+\+|c#|\.net|ruby|go|rust|swift|kotlin|flutter|redux|next\.?js|webpack|linux|bash|terraform|jenkins|datadog|spark|hadoop|kafka|redis|elasticsearch|microservices|devops|data analysis|data science|product management|project management|leadership|communication)\b/gi;
