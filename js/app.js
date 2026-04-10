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
import { signInAnonymously, signOut, getCurrentUser, getUserProfile, onAuthChange, isAnonymous, upgradeAnonymousToEmail } from './firebase/auth.js';
import { getAllDocs } from './firebase/db.js';
import { migrateToFirestore } from './firebase/migration.js';

// Services
import { loadKeys, getApi, hasApi } from './services/api-keys.js';
import { scheduleChecks } from './services/notifications.js';

// Components
import { toast } from './components/toast.js';
import { initTheme, toggleTheme, getCurrentTheme } from './components/theme-toggle.js';
import { initSidebar } from './components/sidebar.js';
import { initJobForm } from './components/job-form.js';
import { showModal, hideModal } from './components/modal.js';
import { exportJobsCsv, importCsv } from './components/import-export.js';
import { startTour, isTourCompleted } from './components/onboarding-tour.js';

// Views
import { renderLanding } from './views/landing.js';
import { renderAuth } from './views/auth.js';
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
import { renderInterviews } from './views/interviews.js';
import { renderTimeline } from './views/timeline.js';
import { renderNetworking } from './views/networking.js';
import { renderSalaryTool } from './views/salary-tool.js';
import { renderWeeklyReport } from './views/weekly-report.js';
import { initJdStorage } from './components/jd-storage.js';
import { completeChecklistItem } from './components/getting-started.js';
import { renderAgentDashboard } from './views/agent-dashboard.js';
import { initAgent, recordRefinementSignal } from './services/job-agent.js';
import { startRealtimeSync, stopRealtimeSync } from './firebase/realtime.js';

/* ============================================================
   Job CRUD helpers
   ============================================================ */
function addJob(j) {
  const jobs = state.get('jobs') || [];
  jobs.push({ id: uid(), title: '', company: '', status: 'Saved', follow: '', salary: '', source: '', url: '', _added: today(), ...j });
  state.set('jobs', jobs);
  completeChecklistItem('firstJobAdded');
  renderCurrentView();
  toast('Job added', 'success');
}

function updateJob(id, patch) {
  const jobs = state.get('jobs') || [];
  const j = jobs.find(x => x.id === id);
  if (j) {
    // Track refinement signal for agent-added jobs
    if (patch.status && ['Applied', 'Interview'].includes(patch.status) && j._agentAdded) {
      recordRefinementSignal(id, 'kept');
    }
    Object.assign(j, patch);
    state.set('jobs', jobs);
    renderCurrentView();
  }
}

function removeJob(id) {
  const jobs = state.get('jobs') || [];
  const job = jobs.find(x => x.id === id);
  if (job && job._agentAdded) recordRefinementSignal(id, 'deleted');
  state.set('jobs', jobs.filter(x => x.id !== id));
  renderCurrentView();
}

/* ============================================================
   Render dispatch
   ============================================================ */
function renderCurrentView() {
  const view = router.getCurrentView();
  const renderers = {
    landing: () => renderLanding(getSection('landing')),
    auth: () => renderAuth(getSection('auth'), { onAuthSuccess: handleAuthSuccess, onGuestAccess: handleGuestAccess }),
    profile: () => renderProfileSetup(getSection('profile'), state, handleProfileComplete),
    dashboard: () => renderDashboard(getSection('dashboard'), state),
    tracker: () => renderTracker(getSection('tracker'), state, { addJob, updateJob, removeJob }),
    search: () => renderJobSearch(getSection('search'), state, addJob),
    ai: () => renderAiTools(getSection('ai'), state, addJob),
    resume: () => renderResumeCenter(getSection('resume'), state),
    companies: () => renderCompanies(getSection('companies'), state),
    contacts: () => renderContacts(getSection('contacts'), state),
    insights: () => renderInsights(getSection('insights'), state),
    settings: () => renderSettings(getSection('settings'), null, null, null),
    agent: () => renderAgentDashboard(getSection('agent'), state, addJob),
    interviews: () => renderInterviews(getSection('interviews'), state),
    timeline: () => renderTimeline(getSection('timeline'), state),
    networking: () => renderNetworking(getSection('networking'), state),
    salary: () => renderSalaryTool(getSection('salary'), state),
    report: () => renderWeeklyReport(getSection('report'), state)
  };
  if (renderers[view]) {
    try { renderers[view](); } catch (e) { console.error(`Render error (${view}):`, e); }
  }
}

function renderAll() {
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
   Auth flow handlers
   ============================================================ */
function handleAuthSuccess(user) {
  state.set('user', getUserProfile());
  updateUserUI();
  const isOnboarded = localStorage.getItem(STORAGE_KEYS.onboarded) === 'true';
  if (isOnboarded) {
    loadUserData();
    router.navigate('dashboard');
  } else {
    router.navigate('profile');
  }
}

function handleGuestAccess(user) {
  state.set('user', getUserProfile());
  updateUserUI();
  localStorage.setItem(STORAGE_KEYS.onboarded, 'true');
  loadUserData();
  router.navigate('dashboard');
}

function handleProfileComplete() {
  if (FEATURES.onboardingTour && !isTourCompleted()) {
    router.navigate('dashboard');
    renderAll();
    setTimeout(() => startTour(), 800);
  } else {
    router.navigate('dashboard');
    renderAll();
  }
}

async function loadUserData() {
  state.loadFromStorage();
  loadKeys();
  // Sync from Firestore if available
  try {
    if (getCurrentUser()) {
      await state.syncFromFirestore(getAllDocs);
      await migrateToFirestore();
    }
  } catch (e) {
    console.warn('Firestore sync skipped:', e);
  }
  renderAll();
}

/* ============================================================
   UI updates for auth state
   ============================================================ */
function updateUserUI() {
  const user = getUserProfile();
  const userInfo = document.getElementById('userInfo');
  const userName = document.getElementById('userName');
  const userAvatar = document.getElementById('userAvatar');
  const sidebarAuth = document.getElementById('sidebarAuth');
  const sidebarUserEmail = document.getElementById('sidebarUserEmail');
  const sidebarUpgradeBtn = document.getElementById('sidebarUpgradeBtn');
  const apiStatusTag = document.getElementById('apiStatusTag');

  if (user) {
    const displayName = user.displayName || (user.email ? user.email.split('@')[0] : (user.isAnonymous ? 'Guest' : 'User'));
    const initial = displayName.charAt(0).toUpperCase();

    if (userInfo) userInfo.style.display = 'flex';
    if (userName) userName.textContent = displayName;
    if (userAvatar) userAvatar.textContent = initial;

    if (sidebarAuth) sidebarAuth.style.display = '';
    if (sidebarUserEmail) sidebarUserEmail.textContent = user.email || 'Guest (anonymous)';
    if (sidebarUpgradeBtn) sidebarUpgradeBtn.style.display = user.isAnonymous ? '' : 'none';
  } else {
    if (userInfo) userInfo.style.display = 'none';
    if (sidebarAuth) sidebarAuth.style.display = 'none';
  }
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
  if (closeImportBtn) closeImportBtn.addEventListener('click', () => hideModal('importModal'));
  if (importFileInput) importFileInput.addEventListener('change', e => { lastImportFile = e.target.files[0] || null; });

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
        if (type === 'jobs') {
          const jobs = state.get('jobs') || [];
          result.records.forEach(r => { jobs.push({ id: uid(), _added: today(), ...r }); logLine(logEl, `+ Job "${r.title}" @ ${r.company}`, 'success'); });
          state.set('jobs', jobs);
        } else {
          const companies = state.get('companies') || [];
          result.records.forEach(r => { companies.push({ id: uid(), ...r }); logLine(logEl, `+ Company "${r.name}"`, 'success'); });
          state.set('companies', companies);
        }
        result.errors.forEach(err => logLine(logEl, `Row ${err.row}: ${err.message}`, 'error'));
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
   Upgrade anonymous account (sidebar button)
   ============================================================ */
function setupUpgradeButton() {
  const btn = document.getElementById('sidebarUpgradeBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    sessionStorage.setItem('authMode', 'signup');
    // Show a prompt for email/password
    const email = prompt('Enter your email to create a permanent account:');
    if (!email) return;
    const password = prompt('Choose a password (min 8 characters):');
    if (!password || password.length < 8) { toast('Password must be at least 8 characters', 'error'); return; }

    upgradeAnonymousToEmail(email, password)
      .then(user => {
        state.set('user', getUserProfile());
        updateUserUI();
        toast('Account upgraded! Your data is preserved.', 'success');
      })
      .catch(err => {
        toast(err.message || 'Upgrade failed', 'error');
      });
  });
}

/* ============================================================
   Boot sequence
   ============================================================ */
async function boot() {
  // 1. Initialize theme + wire toggle button
  initTheme();
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    function updateThemeIcon() {
      themeBtn.textContent = getCurrentTheme() === 'light' ? '🌙' : '☀';
    }
    updateThemeIcon();
    themeBtn.addEventListener('click', () => {
      toggleTheme();
      updateThemeIcon();
      // Re-render current view to update chart colors
      renderCurrentView();
    });
  }

  // Header overflow menu toggle
  const overflowBtn = document.getElementById('headerOverflowBtn');
  const overflowMenu = document.getElementById('headerOverflowMenu');
  if (overflowBtn && overflowMenu) {
    overflowBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      overflowMenu.classList.toggle('show');
    });
    document.addEventListener('click', () => overflowMenu.classList.remove('show'));
  }

  // 2. Try Firebase init (but do NOT auto sign-in)
  let firebaseReady = false;
  if (FEATURES.firebase) {
    try {
      firebaseReady = await initFirebase();
    } catch (e) {
      console.warn('Firebase boot failed:', e);
    }
  }

  // 3. Initialize sidebar + UI components
  initSidebar();
  initJdStorage(state);

  // Initialize job agent (background search)
  if (FEATURES.jobAgent) {
    initAgent(state, addJob);
  }

  // Collapsible sidebar "More Tools" section
  const navExpandBtn = document.getElementById('navExpandMore');
  const navMoreSection = document.getElementById('navMoreSection');
  const navExpandIcon = document.getElementById('navExpandIcon');
  if (navExpandBtn && navMoreSection) {
    navExpandBtn.addEventListener('click', () => {
      const isOpen = navMoreSection.style.display !== 'none';
      navMoreSection.style.display = isOpen ? 'none' : 'block';
      if (navExpandIcon) navExpandIcon.style.transform = isOpen ? '' : 'rotate(90deg)';
    });
  }
  initJobForm(job => addJob(job));
  setupImportModal();

  // 4. Setup CSV export
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const csv = exportJobsCsv(state.get('jobs') || []);
      download('tron-jobs.csv', csv, 'text/csv');
      toast('Exported ' + (state.get('jobs') || []).length + ' jobs', 'success');
    });
  }

  // 5. Seed data button
  const seedBtn = document.getElementById('seedBtn');
  if (seedBtn) {
    seedBtn.addEventListener('click', () => {
      if (!confirm('Load sample data?')) return;
      loadSeedData();
      renderAll();
      toast('Sample data loaded', 'success');
    });
  }

  // 6. Role select
  const roleSelect = document.getElementById('roleSelect');
  if (roleSelect) {
    roleSelect.addEventListener('change', e => {
      state.set('role', e.target.value);
      renderAll();
    });
  }

  // 7. Register view renderers
  router.registerView('landing', () => renderLanding(getSection('landing')));
  router.registerView('auth', () => renderAuth(getSection('auth'), { onAuthSuccess: handleAuthSuccess, onGuestAccess: handleGuestAccess }));
  router.registerView('profile', () => renderProfileSetup(getSection('profile'), state, handleProfileComplete));
  router.registerView('dashboard', () => renderDashboard(getSection('dashboard'), state));
  router.registerView('tracker', () => renderTracker(getSection('tracker'), state, { addJob, updateJob, removeJob }));
  router.registerView('search', () => renderJobSearch(getSection('search'), state, addJob));
  router.registerView('agent', () => renderAgentDashboard(getSection('agent'), state, addJob));
  router.registerView('ai', () => renderAiTools(getSection('ai'), state, addJob));
  router.registerView('resume', () => renderResumeCenter(getSection('resume'), state));
  router.registerView('companies', () => renderCompanies(getSection('companies'), state));
  router.registerView('contacts', () => renderContacts(getSection('contacts'), state));
  router.registerView('insights', () => renderInsights(getSection('insights'), state));
  router.registerView('settings', () => renderSettings(getSection('settings'), null, null, null));
  router.registerView('interviews', () => renderInterviews(getSection('interviews'), state));
  router.registerView('timeline', () => renderTimeline(getSection('timeline'), state));
  router.registerView('networking', () => renderNetworking(getSection('networking'), state));
  router.registerView('salary', () => renderSalaryTool(getSection('salary'), state));
  router.registerView('report', () => renderWeeklyReport(getSection('report'), state));

  // 8. Set auth guard
  router.setAuthGuard(() => {
    return getCurrentUser() !== null;
  });

  // 9. Setup sign out handlers
  const signOutBtn = document.getElementById('signOutBtn');
  const sidebarSignOut = document.getElementById('sidebarSignOut');
  const handleSignOut = async () => {
    stopRealtimeSync();
    await signOut();
    state.set('user', null);
    updateUserUI();
    toast('Signed out', 'info');
    router.navigate('landing');
  };
  if (signOutBtn) signOutBtn.addEventListener('click', handleSignOut);
  if (sidebarSignOut) sidebarSignOut.addEventListener('click', handleSignOut);

  // 10. Setup upgrade button for anonymous users
  setupUpgradeButton();

  // 11. Listen for auth state changes (handles page reload with persisted session)
  if (firebaseReady) {
    onAuthChange(async (user) => {
      if (user) {
        // User is signed in (either returning session or fresh sign-in)
        state.set('user', getUserProfile());
        updateUserUI();

        // Load data
        state.loadFromStorage();
        loadKeys();

        // Set role
        const settings = state.get('settings') || {};
        if (settings.role) {
          state.set('role', settings.role);
          const rs = document.getElementById('roleSelect');
          if (rs) rs.value = settings.role;
        }

        // Sync Firestore + start real-time listeners
        try {
          await state.syncFromFirestore(getAllDocs);
          await migrateToFirestore();
          // Start real-time listeners for cross-device sync
          startRealtimeSync(state, (key) => {
            if (['jobs', 'resumes', 'companies', 'contacts'].includes(key)) {
              renderAll();
            }
          });
        } catch (e) { console.warn('Firestore sync skipped:', e); }

        // If we're on landing or auth and user is authenticated, redirect
        const currentView = router.getCurrentView();
        if (currentView === 'landing' || currentView === 'auth') {
          const isOnboarded = localStorage.getItem(STORAGE_KEYS.onboarded) === 'true';
          if (isOnboarded) {
            router.navigate('dashboard');
            renderAll();
          }
          // If not onboarded, handleAuthSuccess will navigate to profile
        }

        // Start notifications if permitted
        if (FEATURES.notifications && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          scheduleChecks(() => state.get('jobs') || [], getApi('ntfyTopic'));
        }

        // Show tour if needed
        if (FEATURES.onboardingTour && localStorage.getItem(STORAGE_KEYS.onboarded) === 'true' && !isTourCompleted()) {
          setTimeout(() => startTour(), 1200);
        }
      } else {
        // User signed out
        state.set('user', null);
        updateUserUI();
      }
    });
  } else {
    // No Firebase — load data from localStorage and allow access without auth
    state.loadFromStorage();
    loadKeys();
    const settings = state.get('settings') || {};
    if (settings.role) {
      state.set('role', settings.role);
      const rs = document.getElementById('roleSelect');
      if (rs) rs.value = settings.role;
    }

    // Disable auth guard when Firebase is not configured
    router.setAuthGuard(null);
  }

  // 12. Initialize router
  router.init();

  // 13. Navigate based on state
  if (!window.location.hash || window.location.hash === '#') {
    if (firebaseReady) {
      // Auth change listener will handle navigation
      const user = getCurrentUser();
      if (!user) {
        router.navigate('landing');
      }
    } else {
      // No Firebase — check onboarding
      const isOnboarded = localStorage.getItem(STORAGE_KEYS.onboarded) === 'true';
      if (!isOnboarded && FEATURES.landing) {
        router.navigate('landing');
      } else {
        router.navigate('dashboard');
        renderAll();
      }
    }
  }

  // 14. Save on unload
  window.addEventListener('beforeunload', () => state.persist());

  // 15. Expose addJobFromSearch globally for inline onclick
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
