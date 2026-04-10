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
  settings: 'settings'
};

// localStorage key prefixes
export const STORAGE_KEYS = {
  jobs: 'tron_jobs',
  resumes: 'tron_resumes',
  companies: 'tron_companies',
  contacts: 'tron_contacts',
  filters: 'tron_filters',
  settings: 'tron_settings',
  apiKeys: 'tron_api_keys',
  migrated: 'tron_migrated',
  theme: 'tron_theme',
  onboarded: 'tron_onboarded',
  tourDone: 'tron_tour_done',
  authUser: 'tron_auth_user',
  agentConfig: 'tron_agent_config',
  agentRuns: 'tron_agent_runs'
};

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
