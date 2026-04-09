/* ============================================================
   app.js — Main entry point for JobGrid Pro
   ============================================================ */

// Config & utilities
import { STORAGE_KEYS, FEATURES } from './config.js';
import { uid, today, download } from './utils.js';

// State
import state from './state.js';

// Router
import router from './router.js';

// Firebase
import { initFirebase } from './firebase/init.js';
import { signInAnonymously } from './firebase/auth.js';
import { getAllDocs } from './firebase/db.js';
import { migrateToFirestore } from './firebase/migration.js';

// Services
import { loadKeys, getApi, hasApi } from './services/api-keys.js';
import { scheduleChecks } from './services/notifications.js';

// Components
import { toast } from './components/toast.js';
import { initTheme } from './components/theme-toggle.js';
import { initSidebar } from './components/sidebar.js';
import { initJobForm } from './components/job-form.js';
import { showModal, hideModal } from './components/modal.js';
import { exportJobsCsv, importCsv } from './components/import-export.js';
import { startTour, isTourCompleted } from './components/onboarding-tour.js';

// Views
import { renderLanding } from './views/landing.js';
import { renderProfileSetup } from './views/profile-setup.js';
import { renderDashboard } from './views/dashboard.js';
import { renderTracker } from './views/tracker.js';
import { renderJobSearch } from './views/job-search.js';
import { renderAiTools } from './views/ai-tools.js';
import { renderResumeCenter } from './views/resume-center.js';
import { renderCompanies } from './views/companies.js';
import { renderContacts } from './views/contacts.js';
import { renderInsights } from './views/insights.js';
import { renderSettings } from './views/settings.js';

/* ============================================================
   Job CRUD helpers
   ============================================================ */
function addJob(j) {
  const jobs = state.get('jobs') || [];
  jobs.push({ id: uid(), title: '', company: '', status: 'Saved', follow: '', salary: '', source: '', url: '', _added: today(), ...j });
  state.set('jobs', jobs);
  renderCurrentView();
  toast('Job added', 'success');
}

function updateJob(id, patch) {
  const jobs = state.get('jobs') || [];
  const j = jobs.find(x => x.id === id);
  if (j) {
    Object.assign(j, patch);
    state.set('jobs', jobs);
    renderCurrentView();
  }
}

function removeJob(id) {
  state.set('jobs', (state.get('jobs') || []).filter(x => x.id !== id));
  renderCurrentView();
}

/* ============================================================
   Render dispatch — calls the current view's render function
   ============================================================ */
function renderCurrentView() {
  const view = router.getCurrentView();
  const renderers = {
    landing: () => renderLanding(getSection('landing')),
    profile: () => renderProfileSetup(getSection('profile'), state, () => {}),
    dashboard: () => renderDashboard(getSection('dashboard'), state),
    tracker: () => renderTracker(getSection('tracker'), state, { addJob, updateJob, removeJob }),
    search: () => renderJobSearch(getSection('search'), state, addJob),
    ai: () => renderAiTools(getSection('ai'), state, addJob),
    resume: () => renderResumeCenter(getSection('resume'), state),
    companies: () => renderCompanies(getSection('companies'), state),
    contacts: () => renderContacts(getSection('contacts'), state),
    insights: () => renderInsights(getSection('insights'), state),
    settings: () => renderSettings(getSection('settings'), null, null, null)
  };

  if (renderers[view]) {
    try { renderers[view](); } catch (e) { console.error(`Render error (${view}):`, e); }
  }
}

function renderAll() {
  // Render all visible/common views
  try { renderDashboard(getSection('dashboard'), state); } catch (e) { console.error(e); }
  try { renderTracker(getSection('tracker'), state, { addJob, updateJob, removeJob }); } catch (e) { console.error(e); }
  try { renderInsights(getSection('insights'), state); } catch (e) { console.error(e); }
  try { renderResumeCenter(getSection('resume'), state); } catch (e) { console.error(e); }
  try { renderCompanies(getSection('companies'), state); } catch (e) { console.error(e); }
  try { renderContacts(getSection('contacts'), state); } catch (e) { console.error(e); }
}

function getSection(name) {
  return document.getElementById('view-' + name);
}

/* ============================================================
   Seed data
   ============================================================ */
function loadSeedData() {
  state.set('jobs', [
    { id: uid(), title: 'Senior Data Analyst', company: 'ENCOM', status: 'Saved', follow: today(2), salary: '125000', source: 'LinkedIn', url: '', _added: today() },
    { id: uid(), title: 'ML Engineer', company: 'Flynn Lives', status: 'Applied', follow: today(5), salary: '145000', source: 'Indeed', url: '', _added: today() },
    { id: uid(), title: 'Backend Developer', company: 'Grid Systems', status: 'Interview', follow: today(1), salary: '135000', source: 'Greenhouse', url: '', _added: today() },
    { id: uid(), title: 'Security Analyst', company: 'MCP Corp', status: 'Offer', follow: today(7), salary: '130000', source: 'Lever', url: '', _added: today() },
    { id: uid(), title: 'DevOps Engineer', company: 'Digital Frontier', status: 'Closed', follow: '', salary: '', source: 'Referral', url: '', _added: today() },
    { id: uid(), title: 'Frontend Developer', company: 'Tron Industries', status: 'Applied', follow: today(3), salary: '115000', source: 'Remotive', url: '', _added: today() }
  ]);
  state.set('resumes', [
    { id: uid(), name: 'General Tech - v1', skills: ['python', 'javascript', 'sql', 'aws'], text: '' },
    { id: uid(), name: 'Data Science Focus - v2', skills: ['python', 'machine learning', 'pandas', 'tensorflow'], text: '' }
  ]);
  state.set('companies', [
    { id: uid(), name: 'ENCOM', domain: 'encom.com', notes: 'Legacy systems company, innovative culture' },
    { id: uid(), name: 'Flynn Lives', domain: 'flynnlives.com', notes: 'Startup, fast growth, AI-focused' }
  ]);
  state.set('contacts', [
    { id: uid(), name: 'Kevin Flynn', email: 'kevin@flynn.io', company: 'Flynn Lives', notes: 'CEO, met at conference', verified: null }
  ]);
}

/* ============================================================
   Import modal handling
   ============================================================ */
let lastImportFile = null;

function setupImportModal() {
  const importFileInput = document.getElementById('importFileInput');
  const startImportBtn = document.getElementById('startImportBtn');
  const closeImportBtn = document.getElementById('closeImportModal');
  const importJobsBtn = document.getElementById('importJobsBtn');
  const importCompaniesBtn = document.getElementById('importCompaniesBtn');

  function openImportModal(type) {
    const typeEl = document.getElementById('importType');
    if (typeEl) typeEl.value = type;
    const titleEl = document.getElementById('importModalTitle');
    if (titleEl) titleEl.textContent = type === 'jobs' ? '\u27E8 IMPORT JOBS \u27E9' : '\u27E8 IMPORT COMPANIES \u27E9';
    const statsEl = document.getElementById('importStats');
    if (statsEl) statsEl.textContent = 'Waiting for file...';
    const logEl = document.getElementById('importLog');
    if (logEl) logEl.innerHTML = '';
    showModal('importModal');
  }

  if (importJobsBtn) importJobsBtn.addEventListener('click', () => openImportModal('jobs'));
  if (importCompaniesBtn) importCompaniesBtn.addEventListener('click', () => openImportModal('companies'));
  if (closeImportBtn) closeImportBtn.addEventListener('click', () => hideModal('importModal'));

  if (importFileInput) {
    importFileInput.addEventListener('change', e => {
      lastImportFile = e.target.files[0] || null;
    });
  }

  if (startImportBtn) {
    startImportBtn.addEventListener('click', async () => {
      const typeEl = document.getElementById('importType');
      const type = typeEl?.value || 'jobs';
      if (!lastImportFile) { toast('Choose a CSV file', 'error'); return; }

      const statsEl = document.getElementById('importStats');
      const logEl = document.getElementById('importLog');
      if (statsEl) statsEl.textContent = 'Parsing...';
      if (logEl) logEl.innerHTML = '';

      try {
        const result = await importCsv(lastImportFile, type);

        // Add records to state
        if (type === 'jobs') {
          const jobs = state.get('jobs') || [];
          result.records.forEach(r => {
            jobs.push({ id: uid(), _added: today(), ...r });
            logLine(logEl, `+ Job "${r.title}" @ ${r.company}`, 'success');
          });
          state.set('jobs', jobs);
        } else {
          const companies = state.get('companies') || [];
          result.records.forEach(r => {
            companies.push({ id: uid(), ...r });
            logLine(logEl, `+ Company "${r.name}"`, 'success');
          });
          state.set('companies', companies);
        }

        result.errors.forEach(err => {
          logLine(logEl, `Row ${err.row}: ${err.message}`, 'error');
        });

        if (statsEl) statsEl.textContent = `Done: ${result.records.length} imported, ${result.errors.length} errors`;
        toast(`Imported ${result.records.length} ${type}`, 'success');
        renderAll();
      } catch (err) {
        if (statsEl) statsEl.textContent = 'Error: ' + err.message;
        toast('Import failed: ' + err.message, 'error');
      }

      lastImportFile = null;
      if (importFileInput) importFileInput.value = '';
    });
  }
}

function logLine(logEl, msg, kind) {
  if (!logEl) return;
  const div = document.createElement('div');
  div.textContent = msg;
  div.style.color = kind === 'error' ? '#ff6666' : kind === 'success' ? '#00ff41' : '#e0e0e0';
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

/* ============================================================
   Boot sequence
   ============================================================ */
async function boot() {
  // 1. Initialize theme
  initTheme();

  // 2. Try Firebase init + anonymous auth
  let firebaseReady = false;
  if (FEATURES.firebase) {
    try {
      firebaseReady = await initFirebase();
      if (firebaseReady) {
        await signInAnonymously();
      }
    } catch (e) {
      console.warn('Firebase boot failed:', e);
    }
  }

  // 3. Load state from localStorage
  state.loadFromStorage();

  // 4. Sync from Firestore if available
  if (firebaseReady) {
    try {
      await state.syncFromFirestore(getAllDocs);
      await migrateToFirestore();
    } catch (e) {
      console.warn('Firestore sync/migration skipped:', e);
    }
  }

  // 5. Load API keys
  loadKeys();

  // 6. Set role from saved settings
  const settings = state.get('settings') || {};
  if (settings.role) state.set('role', settings.role);
  const roleSelect = document.getElementById('roleSelect');
  if (roleSelect) {
    roleSelect.value = state.get('role') || 'Candidate';
    roleSelect.addEventListener('change', e => {
      state.set('role', e.target.value);
      renderAll();
    });
  }

  // 7. Initialize sidebar
  initSidebar();

  // 8. Initialize job form
  initJobForm(job => addJob(job));

  // 9. Setup CSV export button
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const csv = exportJobsCsv(state.get('jobs') || []);
      download('tron-jobs.csv', csv, 'text/csv');
      toast('Exported ' + (state.get('jobs') || []).length + ' jobs', 'success');
    });
  }

  // 10. Setup import modal
  setupImportModal();

  // 11. Setup seed data button
  const seedBtn = document.getElementById('seedBtn');
  if (seedBtn) {
    seedBtn.addEventListener('click', () => {
      if (!confirm('Load sample data?')) return;
      loadSeedData();
      renderAll();
      toast('Sample data loaded', 'success');
    });
  }

  // 12. Register view renderers with router
  router.registerView('landing', () => renderLanding(getSection('landing')));
  router.registerView('profile', () => renderProfileSetup(getSection('profile'), state, () => {}));
  router.registerView('dashboard', () => {
    renderDashboard(getSection('dashboard'), state);
    // Also render tracker and insights since they share data
  });
  router.registerView('tracker', () => renderTracker(getSection('tracker'), state, { addJob, updateJob, removeJob }));
  router.registerView('search', () => renderJobSearch(getSection('search'), state, addJob));
  router.registerView('ai', () => renderAiTools(getSection('ai'), state, addJob));
  router.registerView('resume', () => renderResumeCenter(getSection('resume'), state));
  router.registerView('companies', () => renderCompanies(getSection('companies'), state));
  router.registerView('contacts', () => renderContacts(getSection('contacts'), state));
  router.registerView('insights', () => renderInsights(getSection('insights'), state));
  router.registerView('settings', () => renderSettings(getSection('settings'), null, null, null));

  // 13. Check if onboarded -> determine starting view
  const isOnboarded = localStorage.getItem(STORAGE_KEYS.onboarded) === 'true';
  if (!isOnboarded && FEATURES.landing) {
    // Create landing section if it doesn't exist
    let landingSection = document.getElementById('view-landing');
    if (!landingSection) {
      landingSection = document.createElement('section');
      landingSection.id = 'view-landing';
      landingSection.className = 'panel hidden';
      const main = document.querySelector('main');
      if (main) main.prepend(landingSection);
    }

    // Create profile section if it doesn't exist
    let profileSection = document.getElementById('view-profile');
    if (!profileSection) {
      profileSection = document.createElement('section');
      profileSection.id = 'view-profile';
      profileSection.className = 'panel hidden';
      const main = document.querySelector('main');
      if (main) main.insertBefore(profileSection, main.firstChild.nextSibling);
    }
  }

  // 14. Initialize router
  router.init();

  // If not onboarded and no specific hash, go to landing
  if (!isOnboarded && FEATURES.landing && !window.location.hash) {
    router.navigate('landing');
  }

  // 15. Render all views initially
  renderAll();

  // 16. Start notification schedule if permitted
  if (FEATURES.notifications && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    scheduleChecks(() => state.get('jobs') || [], getApi('ntfyTopic'));
  }

  // 17. Show onboarding tour if not completed
  if (FEATURES.onboardingTour && isOnboarded && !isTourCompleted()) {
    setTimeout(() => startTour(), 1000);
  }

  // 18. Listen for state changes to re-render
  state.on('change', () => {
    // Debounce re-renders
  });

  // 19. Save on unload
  window.addEventListener('beforeunload', () => state.persist());

  // Expose addJobFromSearch globally for inline onclick in search results
  window.addJobFromSearch = (title, company, url, source, salary) => {
    addJob({ title, company, url, source, salary: salary ? salary.replace(/[^0-9]/g, '') : '', status: 'Saved', follow: today(3) });
    toast(`Added "${title}" to tracker`, 'success');
  };

  console.log('JobGrid Pro initialized');
}

// Run boot when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
