/* ============================================================
   firebase/init.js — Initialize Firebase app + Firestore
   ============================================================ */

import { FIREBASE_CONFIG, FEATURES } from '../config.js';

export let app = null;
export let db = null;

/**
 * Initialize Firebase and Firestore with offline persistence.
 * Wraps in try/catch so the app works without Firebase configured.
 */
export async function initFirebase() {
  if (!FEATURES.firebase) return false;

  try {
    const firebase = window.firebase;
    if (!firebase) {
      console.warn('Firebase SDK not loaded from CDN');
      return false;
    }

    if (!FIREBASE_CONFIG.apiKey || !FIREBASE_CONFIG.projectId) {
      console.warn('Firebase config not set — running in local-only mode');
      return false;
    }

    // Initialize app if not already done
    if (!firebase.apps.length) {
      app = firebase.initializeApp(FIREBASE_CONFIG);
    } else {
      app = firebase.apps[0];
    }

    // Initialize Firestore with offline persistence
    db = firebase.firestore();

    if (FEATURES.offlinePersistence) {
      try {
        await db.enablePersistence({ synchronizeTabs: true });
      } catch (err) {
        if (err.code === 'failed-precondition') {
          console.warn('Firestore persistence failed: multiple tabs open');
        } else if (err.code === 'unimplemented') {
          console.warn('Firestore persistence not available in this browser');
        }
      }
    }

    console.log('Firebase initialized successfully');
    return true;
  } catch (e) {
    console.warn('Firebase initialization failed:', e);
    app = null;
    db = null;
    return false;
  }
}

export default { app, db, initFirebase };
