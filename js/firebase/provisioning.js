/* ============================================================
   firebase/provisioning.js — Per-user auto-provisioning
   Creates isolated Firestore collections, API key vault,
   usage counters, and optional demo data for each new user.
   ============================================================ */

import { db } from './init.js';
import { getCurrentUser } from './auth.js';

const COLLECTIONS = ['jobs', 'resumes', 'companies', 'contacts', 'interviews', 'networking', 'offers'];

/**
 * Check if a user has been provisioned (has a profile doc).
 */
export async function isProvisioned() {
  const user = getCurrentUser();
  if (!user || !db) return false;
  try {
    const doc = await db.collection('users').doc(user.uid).get();
    return doc.exists && doc.data()?.provisioned === true;
  } catch (e) {
    console.warn('Provisioning check failed:', e);
    return false;
  }
}

/**
 * Provision a new user — create their profile, empty collections, API key vault,
 * and usage tracking document in Firestore.
 * @param {object} profile — { name, role, theme }
 * @param {boolean} loadDemoData — whether to pre-populate sample data
 */
export async function provisionUser(profile = {}, loadDemoData = false) {
  const user = getCurrentUser();
  if (!user || !db) {
    console.warn('Cannot provision: no user or no Firestore');
    return false;
  }

  const uid = user.uid;
  const batch = db.batch();
  const userRef = db.collection('users').doc(uid);
  const now = new Date().toISOString();

  try {
    // 1. Create user profile document
    batch.set(userRef, {
      provisioned: true,
      provisionedAt: now,
      email: user.email || null,
      displayName: profile.name || user.displayName || null,
      isAnonymous: user.isAnonymous || false,
      role: profile.role || 'Candidate',
      theme: profile.theme || 'tron',
      tier: 'free',
      createdAt: now,
      lastLogin: now,
    }, { merge: true });

    // 2. Create API key vault (empty, user fills in)
    const apiKeysRef = userRef.collection('config').doc('apiKeys');
    batch.set(apiKeysRef, {
      adzunaId: '', adzunaKey: '', jsearchKey: '',
      geminiKey: '', groqKey: '',
      emailjsPublic: '', emailjsService: '', emailjsTemplate: '',
      hunterKey: '', abstractKey: '',
      careerOneStopKey: '', careerOneStopUser: '',
      ntfyTopic: '',
      notionToken: '', notionDatabaseId: '',
      updatedAt: now,
    }, { merge: true });

    // 3. Create usage tracking document
    const usageRef = userRef.collection('config').doc('usage');
    batch.set(usageRef, {
      _date: now.slice(0, 10),
      tier: 'free',
    }, { merge: true });

    // 4. Create empty placeholder docs for each collection
    // (Firestore creates collections on first write, but we need at least a metadata doc)
    for (const col of COLLECTIONS) {
      const metaRef = userRef.collection(col).doc('_meta');
      batch.set(metaRef, {
        createdAt: now,
        collection: col,
        count: 0,
      }, { merge: true });
    }

    // Commit the batch
    await batch.commit();

    // 5. Optionally load demo data
    if (loadDemoData) {
      await loadSampleData(uid);
    }

    console.log(`User ${uid} provisioned successfully`);
    return true;
  } catch (e) {
    console.error('Provisioning failed:', e);
    return false;
  }
}

/**
 * Load sample/demo data into a user's collections.
 */
async function loadSampleData(uid) {
  const userRef = db.collection('users').doc(uid);
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  function futureDate(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  const batch = db.batch();

  // Sample jobs
  const sampleJobs = [
    { title: 'Senior Data Analyst', company: 'ENCOM', status: 'Saved', follow: futureDate(2), salary: '125000', source: 'LinkedIn', url: '', _added: today },
    { title: 'ML Engineer', company: 'Flynn Lives', status: 'Applied', follow: futureDate(5), salary: '145000', source: 'Indeed', url: '', _added: today },
    { title: 'Backend Developer', company: 'Grid Systems', status: 'Interview', follow: futureDate(1), salary: '135000', source: 'Greenhouse', url: '', _added: today },
    { title: 'Security Analyst', company: 'MCP Corp', status: 'Offer', follow: futureDate(7), salary: '130000', source: 'Lever', url: '', _added: today },
  ];

  for (const job of sampleJobs) {
    const ref = userRef.collection('jobs').doc();
    batch.set(ref, { ...job, id: ref.id, createdAt: now });
  }

  // Sample company
  const companyRef = userRef.collection('companies').doc();
  batch.set(companyRef, { id: companyRef.id, name: 'ENCOM', domain: 'encom.com', notes: 'Legacy systems company, innovative culture', createdAt: now });

  // Sample interview
  const interviewRef = userRef.collection('interviews').doc();
  batch.set(interviewRef, {
    id: interviewRef.id,
    company: 'Grid Systems',
    role: 'Backend Developer',
    date: futureDate(3),
    time: '14:00',
    type: 'Video',
    notes: 'Prepare system design questions. Review their tech stack.',
    status: 'Scheduled',
    createdAt: now,
  });

  // Sample resume
  const resumeRef = userRef.collection('resumes').doc();
  batch.set(resumeRef, { id: resumeRef.id, name: 'General Tech - v1', skills: ['python', 'javascript', 'sql', 'aws'], text: '', createdAt: now });

  await batch.commit();
}

/**
 * Save a user's API keys to their Firestore vault.
 * @param {object} keys — key-value pairs of API keys
 */
export async function saveUserApiKeys(keys) {
  const user = getCurrentUser();
  if (!user || !db) return false;
  try {
    await db.collection('users').doc(user.uid).collection('config').doc('apiKeys').set({
      ...keys,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (e) {
    console.warn('Failed to save API keys to Firestore:', e);
    return false;
  }
}

/**
 * Load a user's API keys from their Firestore vault.
 * @returns {object} key-value pairs or empty object
 */
export async function loadUserApiKeys() {
  const user = getCurrentUser();
  if (!user || !db) return {};
  try {
    const doc = await db.collection('users').doc(user.uid).collection('config').doc('apiKeys').get();
    if (doc.exists) {
      const data = doc.data();
      delete data.updatedAt;
      return data;
    }
    return {};
  } catch (e) {
    console.warn('Failed to load API keys from Firestore:', e);
    return {};
  }
}

/**
 * Save usage tracking data to Firestore (syncs from localStorage).
 */
export async function saveUserUsage(usageData) {
  const user = getCurrentUser();
  if (!user || !db) return false;
  try {
    await db.collection('users').doc(user.uid).collection('config').doc('usage').set({
      ...usageData,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (e) {
    console.warn('Failed to save usage to Firestore:', e);
    return false;
  }
}

/**
 * Load usage tracking data from Firestore.
 */
export async function loadUserUsage() {
  const user = getCurrentUser();
  if (!user || !db) return null;
  try {
    const doc = await db.collection('users').doc(user.uid).collection('config').doc('usage').get();
    return doc.exists ? doc.data() : null;
  } catch (e) {
    console.warn('Failed to load usage from Firestore:', e);
    return null;
  }
}

/**
 * Update user profile in Firestore.
 */
export async function updateUserProfile(updates) {
  const user = getCurrentUser();
  if (!user || !db) return false;
  try {
    await db.collection('users').doc(user.uid).set({
      ...updates,
      lastLogin: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (e) {
    console.warn('Failed to update profile:', e);
    return false;
  }
}

/**
 * Get the user's tier from Firestore.
 */
export async function getUserTierFromFirestore() {
  const user = getCurrentUser();
  if (!user || !db) return 'free';
  try {
    const doc = await db.collection('users').doc(user.uid).get();
    return doc.exists ? (doc.data()?.tier || 'free') : 'free';
  } catch (e) {
    return 'free';
  }
}

/**
 * Set the user's tier in Firestore.
 */
export async function setUserTierInFirestore(tier) {
  const user = getCurrentUser();
  if (!user || !db) return false;
  try {
    await db.collection('users').doc(user.uid).set({ tier, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (e) {
    return false;
  }
}

export default {
  isProvisioned, provisionUser,
  saveUserApiKeys, loadUserApiKeys,
  saveUserUsage, loadUserUsage,
  updateUserProfile,
  getUserTierFromFirestore, setUserTierInFirestore,
};
