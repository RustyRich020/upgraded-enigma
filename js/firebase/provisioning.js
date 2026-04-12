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
      theme: profile.theme || 'default',
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

  function futureDate(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function pastDate(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  }

  // ── Jobs (10 entries) ──────────────────────────────────────
  const sampleJobs = [
    { title: 'Senior Data Engineer', company: 'Stripe', status: 'Saved', follow: futureDate(2), salary: '185000', source: 'LinkedIn', url: 'https://stripe.com/jobs', _added: pastDate(12), description: '' },
    { title: 'ML Platform Engineer', company: 'Anthropic', status: 'Applied', follow: futureDate(5), salary: '210000', source: 'Greenhouse', url: '', _added: pastDate(10) },
    { title: 'Backend Developer', company: 'Shopify', status: 'Interview', follow: futureDate(1), salary: '165000', source: 'Indeed', url: '', _added: pastDate(8) },
    { title: 'DevOps Engineer', company: 'Cloudflare', status: 'Offer', follow: futureDate(7), salary: '175000', source: 'Lever', url: '', _added: pastDate(6) },
    { title: 'Frontend Developer', company: 'Figma', status: 'Applied', follow: futureDate(3), salary: '155000', source: 'Remotive', url: '', _added: pastDate(5) },
    { title: 'Security Engineer', company: 'CrowdStrike', status: 'Saved', follow: futureDate(4), salary: '170000', source: 'JSearch', url: '', _added: pastDate(4) },
    { title: 'Data Analyst', company: 'Airbnb', status: 'Closed', follow: '', salary: '135000', source: 'LinkedIn', url: '', _added: pastDate(14) },
    { title: 'Full Stack Developer', company: 'Notion', status: 'Interview', follow: futureDate(6), salary: '180000', source: 'Adzuna', url: '', _added: pastDate(3) },
    { title: 'Platform Engineer', company: 'Vercel', status: 'Saved', follow: futureDate(9), salary: '160000', source: 'Remotive', url: '', _added: pastDate(1), _agentAdded: true },
    { title: 'Software Engineer II', company: 'Google', status: 'Applied', follow: futureDate(8), salary: '195000', source: 'LinkedIn', url: '', _added: pastDate(2),
      description: 'We are looking for a Software Engineer to join our Cloud Platform team. Requirements: 3+ years experience with Python, JavaScript, or Go. Experience with distributed systems, microservices, and cloud infrastructure (GCP/AWS). Strong SQL skills and data modeling experience. Familiarity with CI/CD pipelines, Docker, and Kubernetes. Excellent communication and leadership skills.' },
  ];

  // ── Companies (4 entries) ──────────────────────────────────
  const sampleCompanies = [
    { name: 'Stripe', domain: 'stripe.com', notes: 'Financial infrastructure platform. Engineering-driven culture.' },
    { name: 'Anthropic', domain: 'anthropic.com', notes: 'AI safety company. Cutting-edge ML research.' },
    { name: 'Shopify', domain: 'shopify.com', notes: 'E-commerce platform. Large-scale distributed systems.' },
    { name: 'Cloudflare', domain: 'cloudflare.com', notes: 'Internet security and CDN. Global infrastructure.' },
  ];

  // ── Resumes (3 entries) ────────────────────────────────────
  const sampleResumes = [
    { name: 'Software Engineer - General', skills: ['python', 'javascript', 'react', 'node.js', 'aws', 'docker', 'sql', 'git'], text: 'Experienced software engineer with 5+ years building full-stack web applications. Proficient in Python, JavaScript, React, and cloud services.' },
    { name: 'Data Engineering Focus', skills: ['python', 'sql', 'spark', 'airflow', 'dbt', 'snowflake', 'aws', 'data modeling'], text: 'Data engineer specializing in building scalable data pipelines and analytics infrastructure.' },
    { name: 'ML & AI Specialist', skills: ['python', 'tensorflow', 'pytorch', 'machine learning', 'deep learning', 'nlp', 'sql'], text: 'Machine learning engineer with expertise in NLP, computer vision, and production ML systems.' },
  ];

  // ── Interviews (3 entries) ─────────────────────────────────
  const sampleInterviews = [
    { company: 'Shopify', role: 'Backend Developer', date: futureDate(3), time: '14:00', type: 'Video', notes: 'System design round. Review distributed systems patterns.', status: 'Scheduled' },
    { company: 'Notion', role: 'Full Stack Developer', date: futureDate(7), time: '10:30', type: 'Onsite', notes: 'Final round. Prepare portfolio and coding samples.', status: 'Scheduled' },
    { company: 'Airbnb', role: 'Data Analyst', date: pastDate(5), time: '15:00', type: 'Phone', notes: 'Went well. They asked about SQL optimization and A/B testing.', status: 'Completed' },
  ];

  // ── Contacts (2 entries) ───────────────────────────────────
  const sampleContacts = [
    { name: 'Sarah Chen', company: 'Stripe', role: 'Technical Recruiter', email: 'sarah@stripe.com', notes: 'Reached out via LinkedIn. Very responsive.' },
    { name: 'James Park', company: 'Shopify', role: 'Engineering Manager', email: '', notes: 'Met at a tech meetup. Referred me for the Backend Developer role.' },
  ];

  // ── Networking (1 entry) ───────────────────────────────────
  const sampleNetworking = [
    { type: 'Informational Interview', contact: 'Dr. Lisa Wang', company: 'Anthropic', date: pastDate(7), notes: 'Discussed ML safety research. Suggested applying to the platform team.', outcome: 'Referral received' },
  ];

  // ── Offers (1 entry) ──────────────────────────────────────
  const sampleOffers = [
    { company: 'Cloudflare', role: 'DevOps Engineer', baseSalary: '175000', bonus: '15000', equity: '50000', startDate: futureDate(30), deadline: futureDate(10), notes: 'Strong offer. Negotiate equity.', status: 'Pending' },
  ];

  // ── Batch write (split into 2 batches for safety) ─────────
  const batch1 = db.batch();

  for (const job of sampleJobs) {
    const ref = userRef.collection('jobs').doc();
    batch1.set(ref, { ...job, id: ref.id, createdAt: now });
  }

  for (const company of sampleCompanies) {
    const ref = userRef.collection('companies').doc();
    batch1.set(ref, { ...company, id: ref.id, createdAt: now });
  }

  for (const resume of sampleResumes) {
    const ref = userRef.collection('resumes').doc();
    batch1.set(ref, { ...resume, id: ref.id, createdAt: now });
  }

  await batch1.commit();

  const batch2 = db.batch();

  for (const interview of sampleInterviews) {
    const ref = userRef.collection('interviews').doc();
    batch2.set(ref, { ...interview, id: ref.id, createdAt: now });
  }

  for (const contact of sampleContacts) {
    const ref = userRef.collection('contacts').doc();
    batch2.set(ref, { ...contact, id: ref.id, createdAt: now });
  }

  for (const event of sampleNetworking) {
    const ref = userRef.collection('networking').doc();
    batch2.set(ref, { ...event, id: ref.id, createdAt: now });
  }

  for (const offer of sampleOffers) {
    const ref = userRef.collection('offers').doc();
    batch2.set(ref, { ...offer, id: ref.id, createdAt: now });
  }

  await batch2.commit();
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
