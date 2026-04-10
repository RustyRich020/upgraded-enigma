/* ============================================================
   firebase/realtime.js — Real-time Firestore listeners
   Cross-device sync: changes on one device appear instantly on others.
   Replaces polling/manual sync with live onSnapshot listeners.
   ============================================================ */

import { db } from './init.js';
import { getCurrentUser } from './auth.js';

const unsubscribers = [];

/**
 * Start real-time listeners for all user collections.
 * Updates state reactively when Firestore data changes.
 * @param {object} state — state store (set, get, emit)
 * @param {Function} onUpdate — called after any collection update
 */
export function startRealtimeSync(state, onUpdate) {
  stopRealtimeSync(); // Clean up any existing listeners

  const user = getCurrentUser();
  if (!user || !db) {
    console.warn('Cannot start realtime sync: no user or no Firestore');
    return;
  }

  const uid = user.uid;
  const userRef = db.collection('users').doc(uid);

  // Collections to sync
  const collections = [
    { name: 'jobs', stateKey: 'jobs' },
    { name: 'resumes', stateKey: 'resumes' },
    { name: 'companies', stateKey: 'companies' },
    { name: 'contacts', stateKey: 'contacts' },
    { name: 'interviews', stateKey: 'interviews' },
    { name: 'networking', stateKey: 'networking' },
    { name: 'offers', stateKey: 'offers' },
  ];

  for (const col of collections) {
    const unsub = userRef.collection(col.name).onSnapshot(
      snapshot => {
        const docs = [];
        snapshot.forEach(doc => {
          if (doc.id === '_meta') return; // Skip metadata docs
          docs.push({ id: doc.id, ...doc.data() });
        });

        // Only update if data actually changed (prevents infinite loops)
        const current = JSON.stringify(state.get(col.stateKey) || []);
        const incoming = JSON.stringify(docs);
        if (current !== incoming) {
          state.set(col.stateKey, docs);
          if (onUpdate) onUpdate(col.stateKey, docs);
        }
      },
      error => {
        console.warn(`Realtime sync error for ${col.name}:`, error);
      }
    );
    unsubscribers.push(unsub);
  }

  // Listen to user profile changes
  const profileUnsub = userRef.onSnapshot(
    snapshot => {
      if (snapshot.exists) {
        const profile = snapshot.data();
        if (profile.role && profile.role !== state.get('role')) {
          state.set('role', profile.role);
        }
        if (profile.theme) {
          const currentTheme = document.body.getAttribute('data-theme');
          if (profile.theme !== currentTheme) {
            document.body.setAttribute('data-theme', profile.theme);
          }
        }
      }
    },
    error => console.warn('Profile sync error:', error)
  );
  unsubscribers.push(profileUnsub);

  // Listen to agent config changes (for server-side agent results)
  const agentUnsub = userRef.collection('config').doc('agentConfig').onSnapshot(
    snapshot => {
      if (snapshot.exists) {
        const agentConfig = snapshot.data();
        const current = state.get('agentConfig');
        // Check if pending jobs changed (server agent added new ones)
        if (agentConfig.pendingJobs?.length !== (current?.pendingJobs?.length || 0)) {
          state.set('agentConfig', agentConfig);
          if (onUpdate) onUpdate('agentConfig', agentConfig);
        }
      }
    },
    error => console.warn('Agent config sync error:', error)
  );
  unsubscribers.push(agentUnsub);

  console.log(`Realtime sync started for user ${uid} (${collections.length + 2} listeners)`);
}

/**
 * Stop all real-time listeners.
 */
export function stopRealtimeSync() {
  unsubscribers.forEach(unsub => {
    try { unsub(); } catch (e) { /* silent */ }
  });
  unsubscribers.length = 0;
}

/**
 * Write a document to a user's collection (with real-time propagation).
 * @param {string} collection — collection name (e.g., 'jobs')
 * @param {string} docId — document ID
 * @param {object} data — document data
 */
export async function writeDoc(collection, docId, data) {
  const user = getCurrentUser();
  if (!user || !db) return false;
  try {
    await db.collection('users').doc(user.uid).collection(collection).doc(docId).set(data, { merge: true });
    return true;
  } catch (e) {
    console.warn(`Write failed for ${collection}/${docId}:`, e);
    return false;
  }
}

/**
 * Delete a document from a user's collection.
 */
export async function deleteDoc(collection, docId) {
  const user = getCurrentUser();
  if (!user || !db) return false;
  try {
    await db.collection('users').doc(user.uid).collection(collection).doc(docId).delete();
    return true;
  } catch (e) {
    console.warn(`Delete failed for ${collection}/${docId}:`, e);
    return false;
  }
}

/**
 * Batch write multiple documents.
 */
export async function batchWrite(operations) {
  const user = getCurrentUser();
  if (!user || !db) return false;
  try {
    const batch = db.batch();
    const userRef = db.collection('users').doc(user.uid);
    for (const op of operations) {
      const ref = userRef.collection(op.collection).doc(op.id);
      if (op.delete) {
        batch.delete(ref);
      } else {
        batch.set(ref, op.data, { merge: true });
      }
    }
    await batch.commit();
    return true;
  } catch (e) {
    console.warn('Batch write failed:', e);
    return false;
  }
}

export default { startRealtimeSync, stopRealtimeSync, writeDoc, deleteDoc, batchWrite };
