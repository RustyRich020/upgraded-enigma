/* ============================================================
   firebase/auth.js — Anonymous authentication
   ============================================================ */

/**
 * Sign in anonymously using Firebase Auth compat SDK.
 * Returns the user object or null on failure.
 */
export async function signInAnonymously() {
  try {
    const firebase = window.firebase;
    if (!firebase || !firebase.auth) {
      console.warn('Firebase Auth not available');
      return null;
    }
    const result = await firebase.auth().signInAnonymously();
    return result.user;
  } catch (e) {
    console.warn('Anonymous sign-in failed:', e);
    return null;
  }
}

/**
 * Get the current authenticated user, or null.
 */
export function getCurrentUser() {
  try {
    const firebase = window.firebase;
    if (!firebase || !firebase.auth) return null;
    return firebase.auth().currentUser;
  } catch {
    return null;
  }
}

/**
 * Listen for auth state changes.
 * @param {Function} cb — called with (user) on each change
 * @returns {Function} unsubscribe function
 */
export function onAuthChange(cb) {
  try {
    const firebase = window.firebase;
    if (!firebase || !firebase.auth) return () => {};
    return firebase.auth().onAuthStateChanged(cb);
  } catch {
    return () => {};
  }
}

export default { signInAnonymously, getCurrentUser, onAuthChange };
